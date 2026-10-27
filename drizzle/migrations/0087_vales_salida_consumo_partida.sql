ALTER TABLE public.movimientos_almacen
  ADD COLUMN IF NOT EXISTS partida_id uuid REFERENCES public.partidas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vale_id uuid;
CREATE INDEX IF NOT EXISTS movimientos_almacen_partida_idx ON public.movimientos_almacen(partida_id);

CREATE TABLE public.vales_salida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id),
  partida_id uuid REFERENCES public.partidas(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  observacion text NOT NULL DEFAULT '',
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vales_salida_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vale_id uuid NOT NULL REFERENCES public.vales_salida(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id),
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_unitario numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.movimientos_almacen ADD CONSTRAINT movimientos_almacen_vale_fk FOREIGN KEY (vale_id) REFERENCES public.vales_salida(id) ON DELETE CASCADE;

GRANT SELECT ON public.vales_salida, public.vales_salida_items TO authenticated;
GRANT ALL ON public.vales_salida, public.vales_salida_items TO service_role;
ALTER TABLE public.vales_salida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vales_salida_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ven vales gestion o encargados" ON public.vales_salida FOR SELECT TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()) OR public.es_encargado_almacen(auth.uid(), proyecto_id));
CREATE POLICY "Ven items de vales visibles" ON public.vales_salida_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vales_salida v WHERE v.id = vale_id AND (public.is_admin_o_gerente(auth.uid()) OR public.es_encargado_almacen(auth.uid(), v.proyecto_id))));

-- Encargados registran consumo con partida (policy se mantiene; partida debe ser de la obra)
CREATE OR REPLACE FUNCTION public.validar_partida_movimiento() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.partida_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.partidas p WHERE p.id = NEW.partida_id AND p.proyecto_id = NEW.proyecto_id) THEN
    RAISE EXCEPTION 'La partida no pertenece a esta obra.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validar_partida_movimiento BEFORE INSERT OR UPDATE ON public.movimientos_almacen
  FOR EACH ROW EXECUTE FUNCTION public.validar_partida_movimiento();

CREATE OR REPLACE FUNCTION public.registrar_vale_salida(_proyecto uuid, _trabajador uuid, _partida uuid, _fecha date, _obs text, _items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _vale uuid; _codigo text; _pcod text; _n int; _it jsonb; _ins record; _stock numeric; _cant numeric; _costo numeric; _epp uuid;
BEGIN
  IF _uid IS NULL OR NOT (public.es_encargado_almacen(_uid, _proyecto) OR public.is_admin_o_gerente(_uid)) THEN
    RAISE EXCEPTION 'No tienes permiso para emitir vales en este almacén.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.trabajadores WHERE id = _trabajador AND activo) THEN
    RAISE EXCEPTION 'Elige un trabajador activo.';
  END IF;
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Agrega al menos un ítem.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vale_salida:' || _proyecto::text));
  SELECT coalesce(nullif(codigo,''), left(id::text,8)) INTO _pcod FROM public.proyectos WHERE id = _proyecto;
  SELECT count(*) + 1 INTO _n FROM public.vales_salida WHERE proyecto_id = _proyecto;
  _codigo := 'VS-' || _pcod || '-' || lpad(_n::text, 4, '0');
  INSERT INTO public.vales_salida(codigo, proyecto_id, trabajador_id, partida_id, fecha, observacion, creado_por)
    VALUES (_codigo, _proyecto, _trabajador, _partida, coalesce(_fecha, CURRENT_DATE), coalesce(_obs,''), _uid) RETURNING id INTO _vale;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _cant := (_it->>'cantidad')::numeric;
    IF _cant IS NULL OR _cant <= 0 THEN RAISE EXCEPTION 'Cantidad inválida.'; END IF;
    SELECT id, nombre, unidad INTO _ins FROM public.insumos WHERE id = (_it->>'insumo_id')::uuid;
    IF _ins.id IS NULL THEN RAISE EXCEPTION 'Insumo no encontrado.'; END IF;
    _stock := public.stock_insumo_almacen(_proyecto, _ins.id);
    IF _cant > _stock + 0.0001 THEN RAISE EXCEPTION 'Stock insuficiente de %: disponible %.', _ins.nombre, round(_stock, 4); END IF;
    _costo := round(coalesce(public.costo_promedio_almacen(_proyecto, _ins.id), 0), 4);
    INSERT INTO public.vales_salida_items(vale_id, insumo_id, descripcion, unidad, cantidad, costo_unitario)
      VALUES (_vale, _ins.id, _ins.nombre, _ins.unidad, _cant, _costo);
    INSERT INTO public.movimientos_almacen(tipo, motivo, fecha, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, documento, observacion, partida_id, trabajador_id, vale_id, creado_por)
      VALUES ('Salida', 'Vale de salida', coalesce(_fecha, CURRENT_DATE), _proyecto, _ins.id, _ins.nombre, _ins.unidad, _cant, _costo, _codigo, coalesce(_obs,''), _partida, _trabajador, _vale, _uid);
    SELECT id INTO _epp FROM public.epp_catalogo WHERE lower(trim(nombre)) = lower(trim(_ins.nombre)) AND activo LIMIT 1;
    IF _epp IS NOT NULL THEN
      INSERT INTO public.epp_entregas(epp_id, trabajador_id, cantidad, fecha_entrega, motivo, observaciones)
        VALUES (_epp, _trabajador, _cant, coalesce(_fecha, CURRENT_DATE), 'Entrega', 'Vale ' || _codigo);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('id', _vale, 'codigo', _codigo);
END $$;
REVOKE ALL ON FUNCTION public.registrar_vale_salida(uuid, uuid, uuid, date, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_vale_salida(uuid, uuid, uuid, date, text, jsonb) TO authenticated;
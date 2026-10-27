CREATE TABLE public.almacenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'obra',
  proyecto_id uuid UNIQUE REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  responsable text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX almacenes_un_central ON public.almacenes ((tipo)) WHERE tipo = 'central';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almacenes TO authenticated;
GRANT ALL ON public.almacenes TO service_role;
ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Gerente gestionan almacenes" ON public.almacenes FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

INSERT INTO public.almacenes (tipo, proyecto_id, nombre) VALUES ('central', NULL, 'Almacén Central');
INSERT INTO public.almacenes (tipo, proyecto_id, nombre)
  SELECT 'obra', p.id, 'Almacén ' || coalesce(nullif(p.codigo,''), p.nombre) FROM public.proyectos p;

CREATE OR REPLACE FUNCTION public.crear_almacen_obra() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.almacenes (tipo, proyecto_id, nombre)
  VALUES ('obra', NEW.id, 'Almacén ' || coalesce(nullif(NEW.codigo,''), NEW.nombre))
  ON CONFLICT (proyecto_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_crear_almacen_obra AFTER INSERT ON public.proyectos FOR EACH ROW EXECUTE FUNCTION public.crear_almacen_obra();

ALTER TABLE public.movimientos_almacen
  ADD COLUMN motivo text NOT NULL DEFAULT '',
  ADD COLUMN estado text NOT NULL DEFAULT 'Recibido',
  ADD COLUMN transferencia_id uuid;
CREATE INDEX idx_mov_transferencia ON public.movimientos_almacen(transferencia_id);

-- Stock disponible de un insumo en un almacén (proyecto null = Central)
CREATE OR REPLACE FUNCTION public.stock_insumo_almacen(_proyecto uuid, _insumo uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(CASE WHEN tipo='Ingreso' AND estado <> 'En tránsito' THEN cantidad
                           WHEN tipo='Salida' THEN -cantidad ELSE 0 END),0)
  FROM public.movimientos_almacen
  WHERE proyecto_id IS NOT DISTINCT FROM _proyecto AND insumo_id = _insumo
$$;

CREATE OR REPLACE FUNCTION public.costo_promedio_almacen(_proyecto uuid, _insumo uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN sum(cantidad) > 0 THEN sum(cantidad*costo_unitario)/sum(cantidad) ELSE 0 END
  FROM public.movimientos_almacen
  WHERE proyecto_id IS NOT DISTINCT FROM _proyecto AND insumo_id = _insumo AND tipo='Ingreso' AND estado <> 'En tránsito'
$$;

CREATE OR REPLACE FUNCTION public.transferir_almacen(_origen uuid, _destino uuid, _items jsonb, _fecha date, _documento text, _obs text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t uuid := gen_random_uuid(); _it jsonb; _ins record; _cant numeric; _disp numeric; _cu numeric;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso para transferir.'; END IF;
  IF _origen IS NOT DISTINCT FROM _destino THEN RAISE EXCEPTION 'El almacén de origen y destino deben ser distintos.'; END IF;
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Agrega al menos un insumo.'; END IF;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _cant := (_it->>'cantidad')::numeric;
    IF _cant IS NULL OR _cant <= 0 THEN RAISE EXCEPTION 'Cantidad inválida.'; END IF;
    SELECT id, nombre, unidad INTO _ins FROM public.insumos WHERE id = (_it->>'insumo_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado.'; END IF;
    _disp := public.stock_insumo_almacen(_origen, _ins.id);
    IF _cant > _disp + 0.0001 THEN
      RAISE EXCEPTION 'Stock insuficiente de % en el almacén de origen: disponible %.', _ins.nombre, round(_disp,2);
    END IF;
    _cu := public.costo_promedio_almacen(_origen, _ins.id);
    INSERT INTO public.movimientos_almacen (fecha,tipo,proyecto_id,insumo_id,descripcion,unidad,cantidad,costo_unitario,documento,observacion,motivo,estado,transferencia_id)
    VALUES (_fecha,'Salida',_origen,_ins.id,_ins.nombre,_ins.unidad,_cant,_cu,coalesce(_documento,''),coalesce(_obs,''),'Transferencia','Recibido',_t),
           (_fecha,'Ingreso',_destino,_ins.id,_ins.nombre,_ins.unidad,_cant,_cu,coalesce(_documento,''),coalesce(_obs,''),'Transferencia','En tránsito',_t);
  END LOOP;
  RETURN _t;
END $$;

CREATE OR REPLACE FUNCTION public.recibir_transferencia(_transferencia uuid, _fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso.'; END IF;
  UPDATE public.movimientos_almacen SET estado='Recibido', fecha=coalesce(_fecha, fecha)
  WHERE transferencia_id=_transferencia AND tipo='Ingreso' AND estado='En tránsito';
  IF NOT FOUND THEN RAISE EXCEPTION 'La transferencia no está en tránsito.'; END IF;
END $$;

-- No permitir salidas sin stock ni borrar movimientos de transferencias sueltos
CREATE OR REPLACE FUNCTION public.validar_salida_almacen() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo='Salida' AND NEW.insumo_id IS NOT NULL
     AND NEW.cantidad > public.stock_insumo_almacen(NEW.proyecto_id, NEW.insumo_id) + 0.0001 THEN
    RAISE EXCEPTION 'Stock insuficiente en el almacén: disponible %.', round(public.stock_insumo_almacen(NEW.proyecto_id, NEW.insumo_id),2);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_salida_almacen BEFORE INSERT ON public.movimientos_almacen FOR EACH ROW EXECUTE FUNCTION public.validar_salida_almacen();

CREATE OR REPLACE FUNCTION public.validar_cierre_almacen() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.activo AND NOT NEW.activo AND EXISTS (
    SELECT 1 FROM public.movimientos_almacen m WHERE m.proyecto_id IS NOT DISTINCT FROM NEW.proyecto_id AND m.insumo_id IS NOT NULL
    GROUP BY m.insumo_id HAVING sum(CASE WHEN m.tipo='Ingreso' THEN m.cantidad ELSE -m.cantidad END) > 0.0001) THEN
    RAISE EXCEPTION 'El almacén aún tiene stock o transferencias en tránsito; devuelve o da de baja antes de cerrarlo.';
  END IF;
  IF NEW.tipo='central' AND NOT NEW.activo THEN RAISE EXCEPTION 'El Almacén Central no se puede cerrar.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_cierre_almacen BEFORE UPDATE ON public.almacenes FOR EACH ROW EXECUTE FUNCTION public.validar_cierre_almacen();

REVOKE EXECUTE ON FUNCTION public.transferir_almacen(uuid,uuid,jsonb,date,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recibir_transferencia(uuid,date) FROM anon;
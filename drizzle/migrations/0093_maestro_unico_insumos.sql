-- 1. Ficha base ampliada
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS especialidad_id uuid REFERENCES public.especialidades_partida(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subfamilia_id uuid REFERENCES public.subfamilias_insumo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unidad_id uuid REFERENCES public.unidades_medida(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categoria_inventario text;

-- Extensión 1:1 de EPP
CREATE TABLE public.insumos_atributos_epp (
  insumo_id uuid PRIMARY KEY REFERENCES public.insumos(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT '',
  norma text NOT NULL DEFAULT '',
  tallas text NOT NULL DEFAULT '',
  criticidad text NOT NULL DEFAULT 'Media',
  vida_util_dias integer NOT NULL DEFAULT 180,
  stock numeric NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos_atributos_epp TO authenticated;
GRANT ALL ON public.insumos_atributos_epp TO service_role;
ALTER TABLE public.insumos_atributos_epp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee EPP" ON public.insumos_atributos_epp FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Personal gestiona EPP" ON public.insumos_atributos_epp FOR ALL TO authenticated USING (public.es_personal(auth.uid())) WITH CHECK (public.es_personal(auth.uid()));

-- El maestro lo edita el personal (antes lo hacía en los bancos APU)
DROP POLICY IF EXISTS insumos_manage ON public.insumos;
CREATE POLICY insumos_manage ON public.insumos FOR ALL TO authenticated USING (public.es_personal(auth.uid())) WITH CHECK (public.es_personal(auth.uid()));

-- Unidad siempre enlazada a Unidades de medida
CREATE OR REPLACE FUNCTION public.enlazar_unidad_insumo() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT id INTO NEW.unidad_id FROM public.unidades_medida WHERE lower(simbolo) = lower(trim(NEW.unidad)) ORDER BY activo DESC LIMIT 1;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_enlazar_unidad BEFORE INSERT OR UPDATE OF unidad ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.enlazar_unidad_insumo();

CREATE OR REPLACE FUNCTION public.marca_id_de(_nombre text) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE m uuid;
BEGIN
  IF coalesce(trim(_nombre), '') = '' THEN RETURN NULL; END IF;
  SELECT id INTO m FROM public.marcas WHERE lower(nombre) = lower(trim(_nombre)) LIMIT 1;
  IF m IS NULL THEN INSERT INTO public.marcas(nombre) VALUES (trim(_nombre)) RETURNING id INTO m; END IF;
  RETURN m;
END $$;

-- 2. Carga: fichas de los bancos antiguos en el maestro (se fusiona por tipo + nombre)
UPDATE public.insumos i SET codigo = CASE WHEN m.codigo ~ '^[0-9]{8}$' THEN m.codigo ELSE i.codigo END, especialidad_id = m.especialidad_id, subfamilia_id = m.subfamilia_id, margen_pct = m.margen, marca_id = public.marca_id_de(m.marca)
  FROM public.materiales m WHERE i.tipo = 'MAT' AND lower(trim(i.nombre)) = lower(trim(m.descripcion));
INSERT INTO public.insumos (id, tipo, codigo, nombre, unidad, precio, margen_pct, activo, especialidad_id, subfamilia_id, marca_id)
  SELECT m.id, 'MAT', m.codigo, m.descripcion, m.unidad, m.precio_base, m.margen, m.estado <> 'inactivo', m.especialidad_id, m.subfamilia_id, public.marca_id_de(m.marca)
  FROM public.materiales m WHERE NOT EXISTS (SELECT 1 FROM public.insumos i WHERE i.tipo = 'MAT' AND lower(trim(i.nombre)) = lower(trim(m.descripcion)));
INSERT INTO public.insumos (id, tipo, codigo, nombre, unidad, precio, activo, especialidad_id, subfamilia_id)
  SELECT m.id, 'MO', m.codigo, m.descripcion, m.unidad, m.costo_hora, m.estado <> 'inactivo', m.especialidad_id, m.subfamilia_id
  FROM public.mano_obra m WHERE NOT EXISTS (SELECT 1 FROM public.insumos i WHERE i.tipo = 'MO' AND lower(trim(i.nombre)) = lower(trim(m.descripcion)));
INSERT INTO public.insumos (id, tipo, codigo, nombre, unidad, precio, margen_pct, activo, especialidad_id, subfamilia_id, propiedad, categoria_inventario)
  SELECT m.id, 'EQ', m.codigo, m.descripcion, m.unidad, m.costo_hora, m.margen, m.estado <> 'inactivo', m.especialidad_id, m.subfamilia_id, CASE WHEN m.tipo = 'alquilado' THEN 'Alquilado' ELSE 'Propio' END, m.categoria_inventario
  FROM public.equipos_herramientas m WHERE NOT EXISTS (SELECT 1 FROM public.insumos i WHERE i.tipo = 'EQ' AND lower(trim(i.nombre)) = lower(trim(m.descripcion)));
UPDATE public.insumos i SET especialidad_id = m.especialidad_id, margen_pct = m.margen
  FROM public.subcontratos m WHERE i.tipo = 'SC' AND lower(trim(i.nombre)) = lower(trim(m.descripcion));
INSERT INTO public.insumos (id, tipo, codigo, nombre, unidad, precio, margen_pct, activo, especialidad_id, subfamilia_id)
  SELECT m.id, 'SC', m.codigo, m.descripcion, m.unidad, m.costo, m.margen, m.estado <> 'inactivo', m.especialidad_id, m.subfamilia_id
  FROM public.subcontratos m WHERE NOT EXISTS (SELECT 1 FROM public.insumos i WHERE i.tipo = 'SC' AND lower(trim(i.nombre)) = lower(trim(m.descripcion)));
INSERT INTO public.insumos (id, tipo, codigo, nombre, unidad, precio, activo, marca_id)
  SELECT e.id, 'EPP', e.codigo, e.nombre, 'und', e.costo_unitario, e.activo, public.marca_id_de(e.marca)
  FROM public.epp_catalogo e WHERE NOT EXISTS (SELECT 1 FROM public.insumos i WHERE i.tipo = 'EPP' AND lower(trim(i.nombre)) = lower(trim(e.nombre)));
INSERT INTO public.insumos_atributos_epp (insumo_id, categoria, norma, tallas, criticidad, vida_util_dias, stock)
  SELECT i.id, e.categoria, e.norma, e.tallas, e.criticidad, e.vida_util_dias, e.stock
  FROM public.epp_catalogo e JOIN public.insumos i ON i.tipo = 'EPP' AND lower(trim(i.nombre)) = lower(trim(e.nombre));
INSERT INTO public.insumos_atributos_epp (insumo_id) SELECT id FROM public.insumos WHERE tipo = 'EPP' ON CONFLICT DO NOTHING;
UPDATE public.insumos SET unidad = unidad;

-- 3. Recetas y entregas apuntan al maestro (vacías: sin pérdida)
ALTER TABLE public.partida_detalle DROP CONSTRAINT partida_detalle_material_id_fkey, DROP CONSTRAINT partida_detalle_mano_obra_id_fkey, DROP CONSTRAINT partida_detalle_equipo_id_fkey, DROP CONSTRAINT partida_detalle_subcontrato_id_fkey;
ALTER TABLE public.cotizacion_apu_detalle DROP CONSTRAINT cotizacion_apu_detalle_material_id_fkey, DROP CONSTRAINT cotizacion_apu_detalle_mano_obra_id_fkey, DROP CONSTRAINT cotizacion_apu_detalle_equipo_id_fkey, DROP CONSTRAINT cotizacion_apu_detalle_subcontrato_id_fkey;
ALTER TABLE public.epp_entregas DROP CONSTRAINT epp_entregas_epp_id_fkey;
ALTER TABLE public.partida_detalle ADD COLUMN insumo_id uuid GENERATED ALWAYS AS (coalesce(material_id, mano_obra_id, equipo_id, subcontrato_id)) STORED REFERENCES public.insumos(id) ON DELETE RESTRICT;
ALTER TABLE public.cotizacion_apu_detalle ADD COLUMN insumo_id uuid GENERATED ALWAYS AS (coalesce(material_id, mano_obra_id, equipo_id, subcontrato_id)) STORED REFERENCES public.insumos(id) ON DELETE RESTRICT;
ALTER TABLE public.epp_entregas ADD CONSTRAINT epp_entregas_epp_id_fkey FOREIGN KEY (epp_id) REFERENCES public.insumos(id) ON DELETE RESTRICT;

-- 4. Eliminar los bancos antiguos
DROP TABLE public.materiales, public.mano_obra, public.equipos_herramientas, public.subcontratos, public.epp_catalogo;

-- 5. Vistas por rubro sobre el maestro (Banco APU, Inventario y EPP leen la misma ficha)
CREATE VIEW public.materiales WITH (security_invoker = true) AS
  SELECT i.id, i.codigo, i.nombre AS descripcion, coalesce(m.nombre, '') AS marca, i.unidad, i.precio AS precio_base, i.margen_pct AS margen,
    round(i.precio * (1 + i.margen_pct / 100), 4) AS costo_unitario, CASE WHEN i.activo THEN 'activo' ELSE 'inactivo' END AS estado,
    i.created_at, i.updated_at, i.especialidad_id, i.subfamilia_id, i.marca_id, i.unidad_id
  FROM public.insumos i LEFT JOIN public.marcas m ON m.id = i.marca_id WHERE i.tipo = 'MAT';
CREATE VIEW public.mano_obra WITH (security_invoker = true) AS
  SELECT i.id, i.codigo, i.nombre AS descripcion, i.unidad, i.precio AS costo_hora, CASE WHEN i.activo THEN 'activo' ELSE 'inactivo' END AS estado,
    i.created_at, i.updated_at, i.especialidad_id, i.subfamilia_id, i.unidad_id
  FROM public.insumos i WHERE i.tipo = 'MO';
CREATE VIEW public.equipos_herramientas WITH (security_invoker = true) AS
  SELECT i.id, i.codigo, i.nombre AS descripcion, CASE WHEN i.propiedad = 'Alquilado' THEN 'alquilado' ELSE 'propio' END AS tipo, i.unidad, i.precio AS costo_hora, i.margen_pct AS margen,
    CASE WHEN i.propiedad = 'Alquilado' THEN round(i.precio * (1 + i.margen_pct / 100), 4) ELSE i.precio END AS costo_unitario,
    CASE WHEN i.activo THEN 'activo' ELSE 'inactivo' END AS estado, i.created_at, i.updated_at, i.especialidad_id, i.subfamilia_id, i.categoria_inventario, i.unidad_id
  FROM public.insumos i WHERE i.tipo = 'EQ';
CREATE VIEW public.subcontratos WITH (security_invoker = true) AS
  SELECT i.id, i.codigo, i.nombre AS descripcion, i.unidad, i.precio AS costo, i.margen_pct AS margen, round(i.precio * (1 + i.margen_pct / 100), 4) AS costo_unitario,
    CASE WHEN i.activo THEN 'activo' ELSE 'inactivo' END AS estado, i.created_at, i.updated_at, i.especialidad_id, i.subfamilia_id, i.unidad_id
  FROM public.insumos i WHERE i.tipo = 'SC';
CREATE VIEW public.epp_catalogo WITH (security_invoker = true) AS
  SELECT i.id, i.codigo, i.nombre, coalesce(a.categoria, '') AS categoria, coalesce(m.nombre, '') AS marca, coalesce(a.norma, '') AS norma, coalesce(a.tallas, '') AS tallas,
    coalesce(a.criticidad, 'Media') AS criticidad, coalesce(a.vida_util_dias, 180) AS vida_util_dias, i.precio AS costo_unitario, coalesce(a.stock, 0) AS stock, i.activo, i.created_at
  FROM public.insumos i LEFT JOIN public.insumos_atributos_epp a ON a.insumo_id = i.id LEFT JOIN public.marcas m ON m.id = i.marca_id WHERE i.tipo = 'EPP';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiales, public.mano_obra, public.equipos_herramientas, public.subcontratos, public.epp_catalogo TO authenticated;
GRANT ALL ON public.materiales, public.mano_obra, public.equipos_herramientas, public.subcontratos, public.epp_catalogo TO service_role;

-- Escritura a través de las vistas: todo cae en la ficha única
CREATE OR REPLACE FUNCTION public.escribir_vista_insumo() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE j jsonb; o jsonb; t text; nid uuid; precio_col text; r record;
BEGIN
  t := CASE TG_TABLE_NAME WHEN 'materiales' THEN 'MAT' WHEN 'mano_obra' THEN 'MO' WHEN 'equipos_herramientas' THEN 'EQ' WHEN 'subcontratos' THEN 'SC' ELSE 'EPP' END;
  precio_col := CASE TG_TABLE_NAME WHEN 'materiales' THEN 'precio_base' WHEN 'subcontratos' THEN 'costo' WHEN 'epp_catalogo' THEN 'costo_unitario' ELSE 'costo_hora' END;
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.insumos WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  j := to_jsonb(NEW);
  o := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.insumos (id, tipo, codigo, nombre, unidad, precio, margen_pct, activo, especialidad_id, subfamilia_id, marca_id, propiedad, categoria_inventario)
    VALUES (
      coalesce((j->>'id')::uuid, gen_random_uuid()), t, coalesce(j->>'codigo', ''), coalesce(j->>'descripcion', j->>'nombre', ''),
      coalesce(j->>'unidad', CASE t WHEN 'MO' THEN 'H-H' WHEN 'EQ' THEN 'H-M' WHEN 'SC' THEN 'GLB' ELSE 'und' END),
      coalesce((j->>precio_col)::numeric, 0), coalesce((j->>'margen')::numeric, 0),
      CASE WHEN j ? 'activo' AND j->>'activo' IS NOT NULL THEN (j->>'activo')::boolean ELSE coalesce(j->>'estado', 'activo') <> 'inactivo' END,
      (j->>'especialidad_id')::uuid, (j->>'subfamilia_id')::uuid, public.marca_id_de(j->>'marca'),
      CASE WHEN j->>'tipo' = 'alquilado' THEN 'Alquilado' ELSE 'Propio' END, j->>'categoria_inventario')
    RETURNING id INTO nid;
    IF t = 'EPP' THEN
      INSERT INTO public.insumos_atributos_epp (insumo_id, categoria, norma, tallas, criticidad, vida_util_dias, stock)
      VALUES (nid, coalesce(j->>'categoria', ''), coalesce(j->>'norma', ''), coalesce(j->>'tallas', ''), coalesce(j->>'criticidad', 'Media'), coalesce((j->>'vida_util_dias')::int, 180), coalesce((j->>'stock')::numeric, 0));
    END IF;
  ELSE
    nid := OLD.id;
    UPDATE public.insumos SET
      codigo = coalesce(j->>'codigo', codigo),
      nombre = coalesce(j->>'descripcion', j->>'nombre', nombre),
      unidad = coalesce(j->>'unidad', unidad),
      precio = coalesce((j->>precio_col)::numeric, precio),
      margen_pct = CASE WHEN j ? 'margen' THEN coalesce((j->>'margen')::numeric, 0) ELSE margen_pct END,
      activo = CASE WHEN j ? 'activo' THEN coalesce((j->>'activo')::boolean, activo) WHEN j ? 'estado' THEN coalesce(j->>'estado', 'activo') <> 'inactivo' ELSE activo END,
      especialidad_id = CASE WHEN j ? 'especialidad_id' THEN (j->>'especialidad_id')::uuid ELSE especialidad_id END,
      subfamilia_id = CASE WHEN j ? 'subfamilia_id' THEN (j->>'subfamilia_id')::uuid ELSE subfamilia_id END,
      marca_id = CASE WHEN j ? 'marca' AND (j->>'marca') IS DISTINCT FROM (o->>'marca') THEN public.marca_id_de(j->>'marca') ELSE marca_id END,
      propiedad = CASE WHEN j ? 'tipo' AND t = 'EQ' THEN CASE WHEN j->>'tipo' = 'alquilado' THEN 'Alquilado' ELSE 'Propio' END ELSE propiedad END,
      categoria_inventario = CASE WHEN j ? 'categoria_inventario' THEN j->>'categoria_inventario' ELSE categoria_inventario END
    WHERE id = nid;
    IF t = 'EPP' THEN
      INSERT INTO public.insumos_atributos_epp (insumo_id) VALUES (nid) ON CONFLICT DO NOTHING;
      UPDATE public.insumos_atributos_epp SET
        categoria = coalesce(j->>'categoria', categoria), norma = coalesce(j->>'norma', norma), tallas = coalesce(j->>'tallas', tallas),
        criticidad = coalesce(j->>'criticidad', criticidad), vida_util_dias = coalesce((j->>'vida_util_dias')::int, vida_util_dias), stock = coalesce((j->>'stock')::numeric, stock)
      WHERE insumo_id = nid;
    END IF;
  END IF;
  EXECUTE format('SELECT * FROM public.%I WHERE id = $1', TG_TABLE_NAME) INTO r USING nid;
  RETURN r;
END $$;
CREATE TRIGGER trg_escribir INSTEAD OF INSERT OR UPDATE OR DELETE ON public.materiales FOR EACH ROW EXECUTE FUNCTION public.escribir_vista_insumo();
CREATE TRIGGER trg_escribir INSTEAD OF INSERT OR UPDATE OR DELETE ON public.mano_obra FOR EACH ROW EXECUTE FUNCTION public.escribir_vista_insumo();
CREATE TRIGGER trg_escribir INSTEAD OF INSERT OR UPDATE OR DELETE ON public.equipos_herramientas FOR EACH ROW EXECUTE FUNCTION public.escribir_vista_insumo();
CREATE TRIGGER trg_escribir INSTEAD OF INSERT OR UPDATE OR DELETE ON public.subcontratos FOR EACH ROW EXECUTE FUNCTION public.escribir_vista_insumo();
CREATE TRIGGER trg_escribir INSTEAD OF INSERT OR UPDATE OR DELETE ON public.epp_catalogo FOR EACH ROW EXECUTE FUNCTION public.escribir_vista_insumo();

-- 6. Códigos: un solo correlativo sobre el maestro, sin huecos
CREATE OR REPLACE FUNCTION public.siguiente_codigo_insumo_modular(_especialidad uuid, _tipo text, _subfamilia uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ee text; t text; ss text; pref text; n int;
BEGIN
  IF NOT public.es_personal(auth.uid()) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT codigo_modular INTO ee FROM especialidades_partida WHERE id = _especialidad;
  IF ee IS NULL THEN RAISE EXCEPTION 'La especialidad no tiene código de 2 dígitos.'; END IF;
  t := CASE _tipo WHEN 'materiales' THEN '1' WHEN 'MAT' THEN '1' WHEN 'mano_obra' THEN '2' WHEN 'MO' THEN '2' WHEN 'equipos_herramientas' THEN '3' WHEN 'EQ' THEN '3' WHEN 'subcontratos' THEN '4' WHEN 'SC' THEN '4' END;
  IF t IS NULL THEN RAISE EXCEPTION 'Tipo de insumo no válido.'; END IF;
  IF t = '1' THEN
    SELECT codigo INTO ss FROM subfamilias_insumo WHERE id = _subfamilia AND especialidad_id = _especialidad;
    IF ss IS NULL THEN RAISE EXCEPTION 'La subfamilia no pertenece a la especialidad.'; END IF;
  ELSE ss := '00'; END IF;
  pref := t || ee || ss;
  PERFORM pg_advisory_xact_lock(hashtext('insumo:' || pref));
  SELECT coalesce(max(right(codigo, 3)::int), 0) + 1 INTO n FROM public.insumos WHERE codigo ~ ('^' || pref || '[0-9]{3}$');
  IF n > 999 THEN RAISE EXCEPTION 'Se agotó el correlativo (999) para %.', pref; END IF;
  RETURN pref || lpad(n::text, 3, '0');
END $$;
CREATE TRIGGER trg_renumerar_codigo AFTER DELETE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.renumerar_codigos_insumo();

-- 7. Vales de salida: la entrega de EPP usa la misma ficha
CREATE OR REPLACE FUNCTION public.registrar_vale_salida(_proyecto uuid, _trabajador uuid, _partida uuid, _fecha date, _obs text, _items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _vale uuid; _codigo text; _pcod text; _n int; _it jsonb; _ins record; _stock numeric; _cant numeric; _costo numeric;
BEGIN
  IF _uid IS NULL OR NOT (public.es_encargado_almacen(_uid, _proyecto) OR public.is_admin_o_gerente(_uid)) THEN
    RAISE EXCEPTION 'No tienes permiso para emitir vales en este almacén.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.trabajadores WHERE id = _trabajador AND activo) THEN RAISE EXCEPTION 'Elige un trabajador activo.'; END IF;
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
    SELECT id, nombre, unidad, tipo INTO _ins FROM public.insumos WHERE id = (_it->>'insumo_id')::uuid;
    IF _ins.id IS NULL THEN RAISE EXCEPTION 'Insumo no encontrado.'; END IF;
    _stock := public.stock_insumo_almacen(_proyecto, _ins.id);
    IF _cant > _stock + 0.0001 THEN RAISE EXCEPTION 'Stock insuficiente de %: disponible %.', _ins.nombre, round(_stock, 4); END IF;
    _costo := round(coalesce(public.costo_promedio_almacen(_proyecto, _ins.id), 0), 4);
    INSERT INTO public.vales_salida_items(vale_id, insumo_id, descripcion, unidad, cantidad, costo_unitario)
      VALUES (_vale, _ins.id, _ins.nombre, _ins.unidad, _cant, _costo);
    INSERT INTO public.movimientos_almacen(tipo, motivo, fecha, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, documento, observacion, partida_id, trabajador_id, vale_id, creado_por)
      VALUES ('Salida', 'Vale de salida', coalesce(_fecha, CURRENT_DATE), _proyecto, _ins.id, _ins.nombre, _ins.unidad, _cant, _costo, _codigo, coalesce(_obs,''), _partida, _trabajador, _vale, _uid);
    IF _ins.tipo = 'EPP' THEN
      INSERT INTO public.epp_entregas(epp_id, trabajador_id, cantidad, fecha_entrega, motivo, observaciones)
        VALUES (_ins.id, _trabajador, _cant, coalesce(_fecha, CURRENT_DATE), 'Entrega', 'Vale ' || _codigo);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('id', _vale, 'codigo', _codigo);
END $$;

COMMENT ON TABLE public.insumos IS 'Maestro único de insumos: una ficha por artículo para APU, Logística, Almacén e EPP.';
COMMENT ON VIEW public.materiales IS 'Vista por rubro del maestro único (insumos).';
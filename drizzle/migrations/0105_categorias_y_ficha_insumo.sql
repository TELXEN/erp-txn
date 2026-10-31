CREATE TABLE public.categorias_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  especialidad_id uuid NOT NULL REFERENCES public.especialidades_partida(id) ON DELETE CASCADE,
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  descripcion text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_insumo TO authenticated;
GRANT ALL ON public.categorias_insumo TO service_role;
ALTER TABLE public.categorias_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee categorias" ON public.categorias_insumo FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Gerencia gestiona categorias" ON public.categorias_insumo FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE UNIQUE INDEX categorias_insumo_nombre_uk ON public.categorias_insumo (especialidad_id, lower(nombre));

ALTER TABLE public.subfamilias_insumo ADD COLUMN categoria_id uuid REFERENCES public.categorias_insumo(id) ON DELETE SET NULL;

INSERT INTO public.categorias_insumo (especialidad_id, codigo, nombre, orden)
SELECT especialidad_id, lpad((row_number() over (partition by especialidad_id order by min(codigo)))::text, 2, '0'), bloque, (row_number() over (partition by especialidad_id order by min(codigo)))::int
FROM public.subfamilias_insumo WHERE coalesce(trim(bloque),'') <> '' GROUP BY especialidad_id, bloque;

UPDATE public.subfamilias_insumo s SET categoria_id = c.id FROM public.categorias_insumo c
WHERE c.especialidad_id = s.especialidad_id AND c.nombre = s.bloque;
COMMENT ON COLUMN public.subfamilias_insumo.bloque IS 'DEPRECATED: replaced by categoria_id';
ALTER TABLE public.subfamilias_insumo ALTER COLUMN bloque SET DEFAULT '';

ALTER TABLE public.insumos
  ADD COLUMN categoria_id uuid REFERENCES public.categorias_insumo(id) ON DELETE SET NULL,
  ADD COLUMN numero_parte text,
  ADD COLUMN descripcion_breve text,
  ADD COLUMN especificaciones text,
  ADD COLUMN compra_activa boolean NOT NULL DEFAULT true,
  ADD COLUMN estado_aprobacion text NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN creado_por uuid,
  ADD COLUMN creado_en timestamptz DEFAULT now();
UPDATE public.insumos SET estado_aprobacion = 'Aprobado', creado_en = NULL;
UPDATE public.insumos i SET categoria_id = s.categoria_id FROM public.subfamilias_insumo s WHERE s.id = i.subfamilia_id;
ALTER TABLE public.insumos ADD CONSTRAINT insumos_estado_aprobacion_chk CHECK (estado_aprobacion IN ('Pendiente','Aprobado','Rechazado'));

CREATE TABLE public.insumos_modificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  usuario_id uuid,
  fecha timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insumos_modificaciones TO authenticated;
GRANT ALL ON public.insumos_modificaciones TO service_role;
ALTER TABLE public.insumos_modificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee modificaciones" ON public.insumos_modificaciones FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE INDEX insumos_modificaciones_ins_idx ON public.insumos_modificaciones (insumo_id, fecha DESC);

CREATE TABLE public.insumos_aprobaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  accion text NOT NULL CHECK (accion IN ('Solicitado','Aprobado','Rechazado')),
  usuario_id uuid,
  motivo text,
  fecha timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insumos_aprobaciones TO authenticated;
GRANT ALL ON public.insumos_aprobaciones TO service_role;
ALTER TABLE public.insumos_aprobaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee aprobaciones" ON public.insumos_aprobaciones FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE INDEX insumos_aprobaciones_ins_idx ON public.insumos_aprobaciones (insumo_id, fecha DESC);

-- Autor, coherencia de la cascada y protección del estado de aprobación
CREATE OR REPLACE FUNCTION public.ficha_insumo_antes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c_esp uuid; s_cat uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := coalesce(NEW.creado_por, auth.uid());
    NEW.creado_en := now();
    NEW.estado_aprobacion := CASE WHEN auth.uid() IS NULL OR public.is_admin_o_gerente(auth.uid()) THEN 'Aprobado' ELSE 'Pendiente' END;
  ELSE
    NEW.creado_por := OLD.creado_por; NEW.creado_en := OLD.creado_en;
    IF NEW.estado_aprobacion IS DISTINCT FROM OLD.estado_aprobacion AND coalesce(current_setting('erp.aprobando_insumo', true),'') <> '1' THEN
      NEW.estado_aprobacion := OLD.estado_aprobacion;
    END IF;
  END IF;
  IF NEW.subfamilia_id IS NOT NULL THEN
    SELECT categoria_id INTO s_cat FROM public.subfamilias_insumo WHERE id = NEW.subfamilia_id;
    IF s_cat IS NOT NULL THEN NEW.categoria_id := s_cat; END IF;
  END IF;
  IF NEW.categoria_id IS NOT NULL THEN
    SELECT especialidad_id INTO c_esp FROM public.categorias_insumo WHERE id = NEW.categoria_id;
    IF NEW.especialidad_id IS NOT NULL AND c_esp IS DISTINCT FROM NEW.especialidad_id THEN
      RAISE EXCEPTION 'La categoría no pertenece a la especialidad elegida.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ficha_insumo_antes BEFORE INSERT OR UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.ficha_insumo_antes();

CREATE OR REPLACE FUNCTION public.ficha_insumo_despues() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.insumos_aprobaciones (insumo_id, accion, usuario_id, motivo)
    VALUES (NEW.id, CASE WHEN NEW.estado_aprobacion = 'Aprobado' THEN 'Aprobado' ELSE 'Solicitado' END, auth.uid(),
            CASE WHEN NEW.estado_aprobacion = 'Aprobado' THEN 'Aprobado al registrar (Gerencia/Administración)' END);
  ELSIF (to_jsonb(NEW) - 'updated_at' - 'codigo') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at' - 'codigo') THEN
    INSERT INTO public.insumos_modificaciones (insumo_id, usuario_id) VALUES (NEW.id, auth.uid());
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_ficha_insumo_despues AFTER INSERT OR UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.ficha_insumo_despues();

CREATE OR REPLACE FUNCTION public.validar_subcategoria() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.categoria_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.categorias_insumo WHERE id = NEW.categoria_id AND especialidad_id = NEW.especialidad_id) THEN
    RAISE EXCEPTION 'La categoría no pertenece a la especialidad de la subcategoría.';
  END IF;
  NEW.bloque := coalesce((SELECT nombre FROM public.categorias_insumo WHERE id = NEW.categoria_id), '');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_subcategoria BEFORE INSERT OR UPDATE ON public.subfamilias_insumo FOR EACH ROW EXECUTE FUNCTION public.validar_subcategoria();

CREATE OR REPLACE FUNCTION public.aprobar_insumo(_id uuid, _aprobar boolean, _motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Solo Gerencia o Administración aprueba insumos.'; END IF;
  IF NOT _aprobar AND coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'Indica el motivo del rechazo.'; END IF;
  PERFORM set_config('erp.aprobando_insumo', '1', true);
  UPDATE public.insumos SET estado_aprobacion = CASE WHEN _aprobar THEN 'Aprobado' ELSE 'Rechazado' END WHERE id = _id;
  PERFORM set_config('erp.aprobando_insumo', '', true);
  INSERT INTO public.insumos_aprobaciones (insumo_id, accion, usuario_id, motivo)
  VALUES (_id, CASE WHEN _aprobar THEN 'Aprobado' ELSE 'Rechazado' END, auth.uid(), nullif(trim(_motivo),''));
END $$;
REVOKE ALL ON FUNCTION public.aprobar_insumo(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_insumo(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_insumo_comprable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;
  SELECT nombre, compra_activa, estado_aprobacion INTO r FROM public.insumos WHERE id = NEW.insumo_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF r.estado_aprobacion <> 'Aprobado' THEN RAISE EXCEPTION 'El insumo «%» aún no está aprobado para compras.', r.nombre; END IF;
  IF NOT r.compra_activa THEN RAISE EXCEPTION 'El insumo «%» tiene la compra desactivada.', r.nombre; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_insumo_comprable_oc BEFORE INSERT ON public.orden_compra_items FOR EACH ROW EXECUTE FUNCTION public.validar_insumo_comprable();
CREATE TRIGGER trg_insumo_comprable_req BEFORE INSERT ON public.requerimiento_items FOR EACH ROW EXECUTE FUNCTION public.validar_insumo_comprable();

-- Ficha: compras y consumo del insumo
CREATE OR REPLACE FUNCTION public.ficha_insumo(_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.es_personal(auth.uid()) THEN RAISE EXCEPTION 'Sin acceso'; END IF;
  SELECT jsonb_build_object(
    'compras', coalesce((SELECT jsonb_agg(x ORDER BY x->>'fecha' DESC) FROM (
        SELECT jsonb_build_object('fecha', o.fecha, 'codigo', o.codigo, 'proveedor', t.razon_social, 'cantidad', i.cantidad, 'precio', i.precio_unitario, 'estado', o.estado) x
        FROM orden_compra_items i JOIN ordenes_compra o ON o.id = i.orden_id LEFT JOIN terceros t ON t.id = o.proveedor_id
        WHERE i.insumo_id = _id ORDER BY o.fecha DESC, o.created_at DESC LIMIT 5) q), '[]'::jsonb),
    'promedio', (SELECT round(sum(i.cantidad*i.precio_unitario)/nullif(sum(i.cantidad),0), 4) FROM orden_compra_items i WHERE i.insumo_id = _id),
    'cantidad_total', (SELECT coalesce(sum(i.cantidad),0) FROM orden_compra_items i WHERE i.insumo_id = _id),
    'num_ordenes', (SELECT count(DISTINCT i.orden_id) FROM orden_compra_items i WHERE i.insumo_id = _id),
    'consumo', coalesce((SELECT jsonb_agg(jsonb_build_object('mes', to_char(m.mes,'YYYY-MM'), 'cantidad', coalesce(c.cant,0), 'monto', coalesce(c.monto,0)) ORDER BY m.mes)
        FROM generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') m(mes)
        LEFT JOIN (SELECT date_trunc('month', fecha) mes, sum(cantidad) cant, sum(cantidad*coalesce(costo_unitario,0)) monto
                   FROM movimientos_almacen WHERE insumo_id = _id AND tipo IN ('Salida','Consumo')
                   AND fecha >= date_trunc('month', current_date) - interval '5 months' GROUP BY 1) c ON c.mes = m.mes), '[]'::jsonb),
    'modificaciones', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha', f.fecha, 'usuario', coalesce(p.nombre, p.email)) ORDER BY f.fecha DESC)
        FROM (SELECT * FROM insumos_modificaciones WHERE insumo_id = _id ORDER BY fecha DESC LIMIT 2) f LEFT JOIN profiles p ON p.id = f.usuario_id), '[]'::jsonb),
    'aprobaciones', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha', a.fecha, 'accion', a.accion, 'motivo', a.motivo, 'usuario', coalesce(p.nombre, p.email)) ORDER BY a.fecha DESC)
        FROM insumos_aprobaciones a LEFT JOIN profiles p ON p.id = a.usuario_id WHERE a.insumo_id = _id), '[]'::jsonb),
    'creador', (SELECT jsonb_build_object('fecha', i.creado_en, 'usuario', coalesce(p.nombre, p.email)) FROM insumos i LEFT JOIN profiles p ON p.id = i.creado_por WHERE i.id = _id AND i.creado_por IS NOT NULL)
  ) INTO res;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.ficha_insumo(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ficha_insumo(uuid) TO authenticated;
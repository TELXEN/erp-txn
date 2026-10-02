CREATE TABLE public.tipos_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE,
  nombre text NOT NULL,
  digito integer NOT NULL UNIQUE,
  correlativo bigint NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  es_sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tipos_insumo_digito_rango CHECK (digito BETWEEN 0 AND 9)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_insumo TO authenticated;
GRANT ALL ON public.tipos_insumo TO service_role;
ALTER TABLE public.tipos_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados ven tipos de insumo" ON public.tipos_insumo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin o gerente crea tipos de insumo" ON public.tipos_insumo FOR INSERT TO authenticated WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin o gerente edita tipos de insumo" ON public.tipos_insumo FOR UPDATE TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin o gerente borra tipos de insumo" ON public.tipos_insumo FOR DELETE TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_tipos_insumo_updated_at BEFORE UPDATE ON public.tipos_insumo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tipos_insumo (clave, nombre, digito, correlativo, orden, es_sistema)
SELECT v.clave, v.nombre,
  coalesce(CASE v.clave WHEN 'MO' THEN c.digito_mo WHEN 'MAT' THEN c.digito_mat WHEN 'EQ' THEN c.digito_eq WHEN 'HT' THEN c.digito_ht ELSE c.digito_sc END, v.d),
  coalesce(CASE v.clave WHEN 'MO' THEN c.correlativo_mo WHEN 'MAT' THEN c.correlativo_mat WHEN 'EQ' THEN c.correlativo_eq WHEN 'HT' THEN c.correlativo_ht ELSE c.correlativo_sc END, 0),
  v.o, true
FROM (VALUES ('MO','MANO DE OBRA',1,2),('MAT','MATERIALES',2,1),('EQ','EQUIPOS Y MAQUINARIA',3,3),('HT','HERRAMIENTAS MANUALES',4,4),('SC','SUBCONTRATOS',5,5)) v(clave,nombre,d,o)
LEFT JOIN (SELECT * FROM public.codificacion_insumo ORDER BY created_at LIMIT 1) c ON true;

ALTER TABLE public.insumos DROP CONSTRAINT insumos_tipo_check;
ALTER TABLE public.insumos ADD CONSTRAINT insumos_tipo_fkey FOREIGN KEY (tipo) REFERENCES public.tipos_insumo(clave) ON UPDATE CASCADE;
ALTER TABLE public.margenes_insumo DROP CONSTRAINT margenes_insumo_tipo_check;
ALTER TABLE public.margenes_insumo ADD CONSTRAINT margenes_insumo_tipo_fkey FOREIGN KEY (tipo) REFERENCES public.tipos_insumo(clave) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.proteger_tipo_insumo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.es_sistema := false;
    NEW.nombre := upper(trim(NEW.nombre));
    NEW.clave := upper(trim(NEW.clave));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.es_sistema AND (NEW.clave IS DISTINCT FROM OLD.clave OR NEW.es_sistema IS DISTINCT FROM OLD.es_sistema) THEN
      RAISE EXCEPTION 'Este tipo lo usa el sistema; su clave no se puede cambiar';
    END IF;
    NEW.nombre := upper(trim(NEW.nombre));
    RETURN NEW;
  END IF;
  IF OLD.es_sistema THEN RAISE EXCEPTION 'Este tipo lo usa el sistema y no se puede eliminar'; END IF;
  IF EXISTS (SELECT 1 FROM public.insumos WHERE tipo = OLD.clave) THEN
    RAISE EXCEPTION 'No se puede eliminar: el tipo tiene insumos registrados';
  END IF;
  RETURN OLD;
END; $$;
CREATE TRIGGER trg_proteger_tipo_insumo BEFORE INSERT OR UPDATE OR DELETE ON public.tipos_insumo FOR EACH ROW EXECUTE FUNCTION public.proteger_tipo_insumo();

CREATE OR REPLACE FUNCTION public.crear_margen_tipo_insumo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.margenes_insumo (tipo, margen_pct) VALUES (NEW.clave, 0) ON CONFLICT (tipo) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_crear_margen_tipo_insumo AFTER INSERT ON public.tipos_insumo FOR EACH ROW EXECUTE FUNCTION public.crear_margen_tipo_insumo();
REVOKE EXECUTE ON FUNCTION public.proteger_tipo_insumo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crear_margen_tipo_insumo() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_insumo(_tipo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.tipos_insumo%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.tipos_insumo WHERE clave = _tipo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tipo de insumo no válido'; END IF;
  UPDATE public.tipos_insumo SET correlativo = t.correlativo + 1 WHERE id = t.id;
  RETURN t.digito::text || lpad((t.correlativo + 1)::text, 7, '0');
END; $$;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_insumo(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_insumo(text) TO service_role;

CREATE OR REPLACE FUNCTION public.recodificar_wbs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'Sin permiso para reordenar el catálogo';
  END IF;
  SET CONSTRAINTS ALL DEFERRED;
  UPDATE public.especialidades_partida e SET orden = s.n, codigo = lpad(s.n::text, 2, '0')
  FROM (SELECT id, row_number() OVER (ORDER BY orden, nombre) n FROM public.especialidades_partida) s
  WHERE e.id = s.id AND (e.orden <> s.n OR e.codigo <> lpad(s.n::text, 2, '0'));
  UPDATE public.categorias_partida c SET orden = s.n,
    codigo = coalesce(e.codigo, '00') || '.' || lpad(s.n::text, 2, '0')
  FROM (SELECT id, row_number() OVER (PARTITION BY especialidad ORDER BY orden, nombre) n FROM public.categorias_partida) s
  LEFT JOIN public.categorias_partida c2 ON c2.id = s.id
  LEFT JOIN public.especialidades_partida e ON e.nombre = c2.especialidad
  WHERE c.id = s.id;
  UPDATE public.partidas_maestras p SET orden = s.n,
    codigo = coalesce(ti.digito, tm.digito, 2)::text
    || coalesce(e.codigo, '00') || coalesce(right(c.codigo, 2), '00') || lpad(s.n::text, 3, '0')
  FROM (SELECT id, row_number() OVER (PARTITION BY especialidad, coalesce(categoria, '') ORDER BY orden, created_at) n FROM public.partidas_maestras) s
  JOIN public.partidas_maestras p2 ON p2.id = s.id
  LEFT JOIN public.tipos_insumo ti ON ti.clave = coalesce(p2.tipo_partida, 'MAT')
  LEFT JOIN public.tipos_insumo tm ON tm.clave = 'MAT'
  LEFT JOIN public.especialidades_partida e ON e.nombre = p2.especialidad
  LEFT JOIN public.categorias_partida c ON c.especialidad = p2.especialidad AND c.nombre = p2.categoria
  WHERE p.id = s.id;
END; $$;
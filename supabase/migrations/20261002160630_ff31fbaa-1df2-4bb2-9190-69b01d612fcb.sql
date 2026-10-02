CREATE TABLE public.codificacion_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden int NOT NULL DEFAULT 0,
  codigo text NOT NULL DEFAULT '',
  digitos int NOT NULL DEFAULT 3,
  correlativo_actual bigint NOT NULL DEFAULT 0,
  nombre text NOT NULL UNIQUE,
  es_sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.codificacion_documentos TO authenticated;
GRANT ALL ON public.codificacion_documentos TO service_role;
ALTER TABLE public.codificacion_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura codificacion documentos" ON public.codificacion_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura codificacion documentos" ON public.codificacion_documentos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_codificacion_documentos_updated_at BEFORE UPDATE ON public.codificacion_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.proteger_codificacion_documento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.es_sistema THEN RAISE EXCEPTION 'Este nombre lo usa el sistema y no se puede eliminar'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.es_sistema AND (NEW.nombre IS DISTINCT FROM OLD.nombre OR NEW.es_sistema IS DISTINCT FROM OLD.es_sistema) THEN
    RAISE EXCEPTION 'Este nombre lo usa el sistema y no se puede renombrar';
  END IF;
  IF TG_OP = 'INSERT' THEN NEW.es_sistema := false; END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_proteger_codificacion_documento BEFORE INSERT OR UPDATE OR DELETE ON public.codificacion_documentos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_codificacion_documento();

ALTER TABLE public.codificacion_documentos DISABLE TRIGGER trg_proteger_codificacion_documento;
INSERT INTO public.codificacion_documentos (orden, codigo, digitos, correlativo_actual, nombre, es_sistema)
SELECT 1, coalesce((SELECT prefijo || CASE WHEN incluir_anio THEN to_char(now(), CASE WHEN anio_dos_digitos THEN 'YY' ELSE 'YYYY' END) ELSE '' END || separador || upper(coalesce(tipo_letra,'')) FROM public.codificacion_config ORDER BY created_at LIMIT 1), 'TXN26-P'),
  coalesce((SELECT digitos FROM public.codificacion_config ORDER BY created_at LIMIT 1), 3),
  coalesce((SELECT correlativo_actual FROM public.codificacion_config ORDER BY created_at LIMIT 1), 0), 'PROYECTOS', true
UNION ALL
SELECT 2, coalesce((SELECT prefijo || CASE WHEN incluir_anio THEN to_char(now(), CASE WHEN anio_dos_digitos THEN 'YY' ELSE 'YYYY' END) ELSE '' END || separador || upper(coalesce(tipo_letra,'')) FROM public.codificacion_cotizacion ORDER BY created_at LIMIT 1), 'TXN26-C'),
  coalesce((SELECT digitos FROM public.codificacion_cotizacion ORDER BY created_at LIMIT 1), 3),
  coalesce((SELECT correlativo_actual FROM public.codificacion_cotizacion ORDER BY created_at LIMIT 1), 0), 'COTIZACIONES', true
UNION ALL
SELECT 3, coalesce((SELECT prefijo || CASE WHEN incluir_anio THEN to_char(now(), CASE WHEN anio_dos_digitos THEN 'YY' ELSE 'YYYY' END) ELSE '' END || separador || upper(coalesce(tipo_letra,'')) FROM public.codificacion_preliquidacion ORDER BY created_at LIMIT 1), 'TXN26-PL'),
  coalesce((SELECT digitos FROM public.codificacion_preliquidacion ORDER BY created_at LIMIT 1), 3),
  coalesce((SELECT correlativo_actual FROM public.codificacion_preliquidacion ORDER BY created_at LIMIT 1), 0), 'PRELIQUIDACIONES', true;
ALTER TABLE public.codificacion_documentos ENABLE TRIGGER trg_proteger_codificacion_documento;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_documento(_nombre text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg public.codificacion_documentos%ROWTYPE; candidato text; usado boolean;
BEGIN
  SELECT * INTO cfg FROM public.codificacion_documentos WHERE nombre = _nombre FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe la codificación %', _nombre; END IF;
  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.codigo || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    IF _nombre = 'PROYECTOS' THEN SELECT EXISTS(SELECT 1 FROM public.proyectos WHERE codigo = candidato) INTO usado;
    ELSIF _nombre = 'COTIZACIONES' THEN SELECT EXISTS(SELECT 1 FROM public.cotizaciones WHERE codigo = candidato) INTO usado;
    ELSIF _nombre = 'PRELIQUIDACIONES' THEN SELECT EXISTS(SELECT 1 FROM public.preliquidaciones WHERE codigo = candidato) INTO usado;
    ELSE usado := false; END IF;
    EXIT WHEN NOT usado;
  END LOOP;
  UPDATE public.codificacion_documentos SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END; $$;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_documento(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_documento(text) TO service_role;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_proyecto() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.siguiente_codigo_documento('PROYECTOS') $$;
CREATE OR REPLACE FUNCTION public.siguiente_codigo_cotizacion() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.siguiente_codigo_documento('COTIZACIONES') $$;
CREATE OR REPLACE FUNCTION public.siguiente_codigo_preliquidacion() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.siguiente_codigo_documento('PRELIQUIDACIONES') $$;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_preliquidacion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() TO service_role;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() TO service_role;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_preliquidacion() TO service_role;
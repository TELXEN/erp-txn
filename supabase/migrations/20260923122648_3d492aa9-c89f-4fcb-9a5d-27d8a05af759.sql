REVOKE ALL ON FUNCTION public.siguiente_codigo_proyecto() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_proyecto()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cfg public.codificacion_config%ROWTYPE;
        candidato text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para generar codigos de proyecto';
  END IF;

  SELECT * INTO cfg FROM public.codificacion_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.codificacion_config DEFAULT VALUES RETURNING * INTO cfg;
  END IF;

  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio THEN cfg.separador || to_char(now(), 'YYYY') ELSE '' END
      || cfg.separador
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.proyectos WHERE codigo = candidato);
  END LOOP;

  UPDATE public.codificacion_config SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END;
$$;

REVOKE ALL ON FUNCTION public.siguiente_codigo_proyecto() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() TO authenticated;
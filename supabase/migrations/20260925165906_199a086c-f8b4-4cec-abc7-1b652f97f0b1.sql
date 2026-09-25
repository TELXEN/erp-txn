CREATE OR REPLACE FUNCTION public.siguiente_codigo_proyecto()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cfg public.codificacion_config%ROWTYPE; candidato text;
BEGIN
  SELECT * INTO cfg FROM public.codificacion_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.codificacion_config DEFAULT VALUES RETURNING * INTO cfg; END IF;
  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio THEN to_char(now(), CASE WHEN cfg.anio_dos_digitos THEN 'YY' ELSE 'YYYY' END) ELSE '' END
      || cfg.separador || upper(coalesce(cfg.tipo_letra, ''))
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.proyectos WHERE codigo = candidato);
  END LOOP;
  UPDATE public.codificacion_config SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END; $function$;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_cotizacion()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cfg public.codificacion_cotizacion%ROWTYPE; candidato text;
BEGIN
  SELECT * INTO cfg FROM public.codificacion_cotizacion ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.codificacion_cotizacion DEFAULT VALUES RETURNING * INTO cfg; END IF;
  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio THEN to_char(now(), CASE WHEN cfg.anio_dos_digitos THEN 'YY' ELSE 'YYYY' END) ELSE '' END
      || cfg.separador || upper(coalesce(cfg.tipo_letra, ''))
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cotizaciones WHERE codigo = candidato);
  END LOOP;
  UPDATE public.codificacion_cotizacion SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() TO service_role;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() TO service_role;
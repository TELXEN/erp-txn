CREATE OR REPLACE FUNCTION public.siguiente_codigo_preliquidacion()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cfg public.codificacion_preliquidacion%ROWTYPE; candidato text;
BEGIN
  SELECT * INTO cfg FROM public.codificacion_preliquidacion ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.codificacion_preliquidacion DEFAULT VALUES RETURNING * INTO cfg; END IF;
  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio THEN to_char(now(), CASE WHEN cfg.anio_dos_digitos THEN 'YY' ELSE 'YYYY' END) ELSE '' END
      || cfg.separador || upper(coalesce(cfg.tipo_letra, ''))
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.preliquidaciones WHERE codigo = candidato);
  END LOOP;
  UPDATE public.codificacion_preliquidacion SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END; $function$;
REVOKE ALL ON FUNCTION public.siguiente_codigo_preliquidacion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_preliquidacion() TO service_role;
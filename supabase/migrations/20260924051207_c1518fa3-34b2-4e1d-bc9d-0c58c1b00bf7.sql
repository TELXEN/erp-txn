ALTER TABLE public.codificacion_config
  ADD COLUMN IF NOT EXISTS tipo_letra text NOT NULL DEFAULT 'P',
  ADD COLUMN IF NOT EXISTS anio_dos_digitos boolean NOT NULL DEFAULT true;

ALTER TABLE public.codificacion_cotizacion
  ADD COLUMN IF NOT EXISTS tipo_letra text NOT NULL DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS anio_dos_digitos boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_proyecto()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      || CASE WHEN cfg.incluir_anio
              THEN to_char(now(), CASE WHEN cfg.anio_dos_digitos THEN 'YY' ELSE 'YYYY' END)
              ELSE '' END
      || cfg.separador
      || upper(coalesce(cfg.tipo_letra, ''))
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.proyectos WHERE codigo = candidato);
  END LOOP;

  UPDATE public.codificacion_config SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END;
$function$;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_cotizacion()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE cfg public.codificacion_cotizacion%ROWTYPE;
        candidato text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para generar codigos de cotizacion';
  END IF;

  SELECT * INTO cfg FROM public.codificacion_cotizacion ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.codificacion_cotizacion DEFAULT VALUES RETURNING * INTO cfg;
  END IF;

  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio
              THEN to_char(now(), CASE WHEN cfg.anio_dos_digitos THEN 'YY' ELSE 'YYYY' END)
              ELSE '' END
      || cfg.separador
      || upper(coalesce(cfg.tipo_letra, ''))
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cotizaciones WHERE codigo = candidato);
  END LOOP;

  UPDATE public.codificacion_cotizacion SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END;
$function$;
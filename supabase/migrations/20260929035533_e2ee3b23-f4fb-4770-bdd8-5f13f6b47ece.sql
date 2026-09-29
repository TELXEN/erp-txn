-- Ampliar facturación electrónica a los 8 tipos de documento SUNAT
ALTER TABLE public.comprobantes_electronicos DROP CONSTRAINT IF EXISTS comprobantes_electronicos_tipo_comprobante_check;
ALTER TABLE public.comprobantes_electronicos ADD CONSTRAINT comprobantes_electronicos_tipo_comprobante_check
  CHECK (tipo_comprobante = ANY (ARRAY['01','03','07','08','09','20','40','RA']));

ALTER TABLE public.series_comprobante DROP CONSTRAINT IF EXISTS series_comprobante_tipo_comprobante_check;
ALTER TABLE public.series_comprobante DROP CONSTRAINT IF EXISTS series_comprobante_check;
ALTER TABLE public.series_comprobante ADD CONSTRAINT series_comprobante_tipo_comprobante_check
  CHECK (tipo_comprobante = ANY (ARRAY['01','03','07','08','09','20','40','RA']));
ALTER TABLE public.series_comprobante ADD CONSTRAINT series_comprobante_serie_check
  CHECK (serie ~ '^[A-Z0-9]{4}$');

ALTER TABLE public.comprobantes_electronicos
  ADD COLUMN IF NOT EXISTS datos_guia jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS datos_regimen jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS documentos_relacionados jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS motivo_baja text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ticket_baja text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_numero_documento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_razon_social text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_direccion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_estado_sunat text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_condicion_sunat text NOT NULL DEFAULT '';

INSERT INTO public.series_comprobante (tipo_comprobante, serie)
VALUES ('09','T001'), ('20','R001'), ('40','P001'), ('RA','RA01')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.siguiente_numero_comprobante(_tipo text, _serie text)
 RETURNS TABLE(correlativo bigint, numero text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  siguiente bigint;
BEGIN
  IF _tipo NOT IN ('01','03','07','08','09','20','40','RA') THEN
    RAISE EXCEPTION 'Tipo de comprobante no válido';
  END IF;

  UPDATE public.series_comprobante
     SET correlativo_actual = correlativo_actual + 1,
         updated_at = now()
   WHERE tipo_comprobante = _tipo
     AND serie = upper(trim(_serie))
     AND activo = true
   RETURNING correlativo_actual INTO siguiente;

  IF siguiente IS NULL THEN
    RAISE EXCEPTION 'La serie no existe o está inactiva';
  END IF;

  RETURN QUERY SELECT siguiente, upper(trim(_serie)) || '-' || lpad(siguiente::text, 8, '0');
END;
$function$;

-- Caché de tipo de cambio oficial (Decolecta / SUNAT)
CREATE TABLE IF NOT EXISTS public.tipo_cambio_diario (
  fecha date PRIMARY KEY,
  compra numeric NOT NULL CHECK (compra > 0),
  venta numeric NOT NULL CHECK (venta > 0),
  fuente text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tipo_cambio_diario TO authenticated;
GRANT ALL ON public.tipo_cambio_diario TO service_role;
ALTER TABLE public.tipo_cambio_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipo_cambio_lectura" ON public.tipo_cambio_diario;
CREATE POLICY "tipo_cambio_lectura" ON public.tipo_cambio_diario FOR SELECT TO authenticated USING (true);
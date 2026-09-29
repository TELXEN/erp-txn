ALTER TABLE public.comprobantes_electronicos
  ADD COLUMN IF NOT EXISTS cliente_ciudad text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guia_remision_numero text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anticipo_tipo text NOT NULL DEFAULT 'ninguno',
  ADD COLUMN IF NOT EXISTS anticipo_documento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anticipo_monto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igv_tasa numeric NOT NULL DEFAULT 18;
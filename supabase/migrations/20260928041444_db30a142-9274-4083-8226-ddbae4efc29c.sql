ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS pct_gastos_generales numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pct_utilidad numeric(5,2) NOT NULL DEFAULT 0;
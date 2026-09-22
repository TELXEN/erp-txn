ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS pct_gastos_generales numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pct_utilidad numeric NOT NULL DEFAULT 0;
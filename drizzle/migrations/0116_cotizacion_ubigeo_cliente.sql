ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS cliente_departamento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_provincia text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_distrito text NOT NULL DEFAULT '';
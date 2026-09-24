ALTER TABLE public.bancos DROP CONSTRAINT IF EXISTS bancos_nombre_key;
DROP INDEX IF EXISTS public.bancos_nombre_key;
ALTER TABLE public.bancos
  ADD COLUMN IF NOT EXISTS tipo_cuenta text NOT NULL DEFAULT 'Corriente',
  ADD COLUMN IF NOT EXISTS numero_cuenta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cci text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS saldo_inicial numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_saldo_inicial date NOT NULL DEFAULT CURRENT_DATE;
CREATE UNIQUE INDEX IF NOT EXISTS bancos_cuenta_unica ON public.bancos (nombre, numero_cuenta);
ALTER TABLE public.gastos_directos
  ADD COLUMN IF NOT EXISTS cantidad numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS precio_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comprobante text NOT NULL DEFAULT '';
UPDATE public.gastos_directos SET precio_unitario = monto WHERE precio_unitario = 0;
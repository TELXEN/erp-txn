ALTER TABLE public.gastos_directos ADD COLUMN IF NOT EXISTS detraccion_estado text NOT NULL DEFAULT 'No aplica';
ALTER TABLE public.gastos_generales ADD COLUMN IF NOT EXISTS detraccion_estado text NOT NULL DEFAULT 'No aplica';
UPDATE public.gastos_directos SET detraccion_estado='No pagada' WHERE monto_soles > 700;
UPDATE public.gastos_generales SET detraccion_estado='No pagada' WHERE monto_soles > 700;
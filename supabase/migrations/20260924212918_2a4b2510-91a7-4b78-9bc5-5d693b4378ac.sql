ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS numero_operacion text NOT NULL DEFAULT '';
ALTER TABLE public.gastos_directos ADD COLUMN IF NOT EXISTS numero_operacion text NOT NULL DEFAULT '';
ALTER TABLE public.gastos_generales ADD COLUMN IF NOT EXISTS numero_operacion text NOT NULL DEFAULT '';
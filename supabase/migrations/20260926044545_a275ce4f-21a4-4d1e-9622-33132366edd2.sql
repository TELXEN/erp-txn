ALTER TABLE public.preliquidaciones
  ADD COLUMN IF NOT EXISTS tipo_tributario text NOT NULL DEFAULT 'detraccion';

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS tipo_tributario text NOT NULL DEFAULT 'detraccion',
  ADD COLUMN IF NOT EXISTS monto_retencion numeric NOT NULL DEFAULT 0;
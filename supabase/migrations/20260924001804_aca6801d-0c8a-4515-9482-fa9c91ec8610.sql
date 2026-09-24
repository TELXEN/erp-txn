ALTER TABLE public.gastos_directos
  ADD COLUMN IF NOT EXISTS condicion_pago text NOT NULL DEFAULT 'Contado',
  ADD COLUMN IF NOT EXISTS dias_credito integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS estado_pago text NOT NULL DEFAULT 'Pagada';
ALTER TABLE public.gastos_generales
  ADD COLUMN IF NOT EXISTS condicion_pago text NOT NULL DEFAULT 'Contado',
  ADD COLUMN IF NOT EXISTS dias_credito integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS estado_pago text NOT NULL DEFAULT 'Pagada';
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS condicion_pago text NOT NULL DEFAULT 'Crédito',
  ADD COLUMN IF NOT EXISTS dias_credito integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date;
UPDATE public.ventas SET fecha_emision = created_at::date, fecha_vencimiento = created_at::date + 30 WHERE fecha_vencimiento IS NULL;
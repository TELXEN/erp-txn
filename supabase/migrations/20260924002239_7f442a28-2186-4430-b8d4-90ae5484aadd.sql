ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL;
ALTER TABLE public.gastos_directos
  ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_pago date;
ALTER TABLE public.gastos_generales
  ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_pago date;
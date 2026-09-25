ALTER TABLE public.cajas_chicas
  ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id),
  ADD COLUMN IF NOT EXISTS numero_operacion text NOT NULL DEFAULT '';
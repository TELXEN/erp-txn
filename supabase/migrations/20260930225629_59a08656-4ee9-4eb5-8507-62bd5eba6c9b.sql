ALTER TABLE public.mantenimientos_vehiculo
  ADD COLUMN origen_pago text NOT NULL DEFAULT 'Banco',
  ADD COLUMN banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  ADD COLUMN caja_chica_id uuid REFERENCES public.cajas_chicas(id) ON DELETE SET NULL,
  ADD COLUMN numero_operacion text NOT NULL DEFAULT '';
ALTER TABLE public.traslados_vehiculo
  ADD COLUMN origen_pago text NOT NULL DEFAULT 'Banco',
  ADD COLUMN banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  ADD COLUMN caja_chica_id uuid REFERENCES public.cajas_chicas(id) ON DELETE SET NULL,
  ADD COLUMN numero_operacion text NOT NULL DEFAULT '';
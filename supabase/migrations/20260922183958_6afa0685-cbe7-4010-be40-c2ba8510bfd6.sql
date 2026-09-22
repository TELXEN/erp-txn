ALTER TABLE public.gastos_directos
  ADD COLUMN IF NOT EXISTS rubro text NOT NULL DEFAULT 'Materiales';

ALTER TABLE public.gastos_directos
  ADD CONSTRAINT gastos_directos_rubro_check
  CHECK (rubro IN ('Materiales','Subcontratos','Equipos','Servicios'));
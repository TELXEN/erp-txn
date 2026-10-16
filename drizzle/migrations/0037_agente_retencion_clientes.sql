ALTER TABLE public.terceros ADD COLUMN es_agente_retencion boolean NOT NULL DEFAULT false;
ALTER TABLE public.ventas ADD COLUMN retencion_estado text NOT NULL DEFAULT '';
ALTER TABLE public.ventas ADD COLUMN retencion_fecha date;
ALTER TABLE public.ventas ADD COLUMN retencion_constancia text NOT NULL DEFAULT '';
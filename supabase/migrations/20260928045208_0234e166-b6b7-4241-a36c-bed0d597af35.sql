ALTER TABLE public.partidas_maestras ADD COLUMN IF NOT EXISTS marca text NOT NULL DEFAULT '';
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS marca text NOT NULL DEFAULT '';
ALTER TABLE public.cotizacion_items ADD COLUMN IF NOT EXISTS marca text NOT NULL DEFAULT '';
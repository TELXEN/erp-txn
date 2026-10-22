ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS duracion_meses numeric NOT NULL DEFAULT 1;
ALTER TABLE public.cotizacion_gastos_generales ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'variable';
ALTER TABLE public.cotizacion_gastos_generales ADD COLUMN IF NOT EXISTS tiempo_manual boolean NOT NULL DEFAULT false;
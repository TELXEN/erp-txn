ALTER TABLE public.tareos DROP CONSTRAINT IF EXISTS tareos_tipo_check;
ALTER TABLE public.tareos ADD CONSTRAINT tareos_tipo_check CHECK (tipo IN ('dia','viaje','induccion','feriado','extras'));
ALTER TABLE public.tareos ADD COLUMN IF NOT EXISTS horas numeric NOT NULL DEFAULT 0;
UPDATE public.tareos SET horas = round(asistencia * 10.5, 2) WHERE tipo = 'extras' AND horas = 0;
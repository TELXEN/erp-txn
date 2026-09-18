ALTER TABLE public.tareos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'dia';
UPDATE public.tareos SET tipo = CASE WHEN asistencia = 0.5 THEN 'viaje' WHEN asistencia = 1 THEN 'dia' ELSE 'extras' END;
ALTER TABLE public.tareos DROP CONSTRAINT IF EXISTS tareos_fecha_trabajador_id_key;
ALTER TABLE public.tareos ADD CONSTRAINT tareos_fecha_trabajador_tipo_key UNIQUE (fecha, trabajador_id, tipo);
ALTER TABLE public.tareos ADD CONSTRAINT tareos_tipo_check CHECK (tipo IN ('dia','viaje','extras'));
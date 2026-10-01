ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS propiedad text NOT NULL DEFAULT 'Propio';
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS clase_equipo text NOT NULL DEFAULT 'Equipo';
ALTER TABLE public.insumos ADD CONSTRAINT insumos_propiedad_check CHECK (propiedad IN ('Propio','Alquilado'));
ALTER TABLE public.insumos ADD CONSTRAINT insumos_clase_equipo_check CHECK (clase_equipo IN ('Máquina','Equipo'));
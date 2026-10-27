UPDATE public.insumos SET clase_equipo = 'Equipo' WHERE clase_equipo = 'Máquina';
ALTER TABLE public.insumos DROP CONSTRAINT insumos_clase_equipo_check;
ALTER TABLE public.insumos ADD CONSTRAINT insumos_clase_equipo_check CHECK (clase_equipo = ANY (ARRAY['Equipo'::text, 'Herramienta'::text]));
UPDATE public.insumos SET categoria_inventario = 'Equipo' WHERE tipo = 'EQ' AND coalesce(categoria_inventario, '') = '';
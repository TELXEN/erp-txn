ALTER TABLE public.proyectos
  ADD COLUMN responsable_id uuid NULL REFERENCES public.trabajadores(id) ON DELETE SET NULL;

CREATE INDEX proyectos_responsable_id_idx ON public.proyectos(responsable_id);

ALTER TABLE public.proyectos DROP COLUMN prioridad;
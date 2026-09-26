ALTER TABLE public.proyectos
  ADD COLUMN avance_programado_pct numeric(5,2),
  ADD COLUMN fecha_corte_programado date;

ALTER TABLE public.proyectos
  ADD CONSTRAINT proyectos_avance_programado_pct_check
  CHECK (avance_programado_pct IS NULL OR (avance_programado_pct >= 0 AND avance_programado_pct <= 100));

COMMENT ON COLUMN public.proyectos.avance_programado_pct IS 'Avance programado acumulado oficial según el cronograma contractual a la fecha de corte.';
COMMENT ON COLUMN public.proyectos.fecha_corte_programado IS 'Fecha de corte del avance programado acumulado oficial.';
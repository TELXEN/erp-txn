ALTER TABLE public.cotizaciones ALTER COLUMN revision SET DEFAULT '00';
CREATE INDEX IF NOT EXISTS cotizaciones_codigo_revision_idx ON public.cotizaciones (codigo, revision);
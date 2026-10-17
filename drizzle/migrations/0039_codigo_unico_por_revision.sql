DROP INDEX public.cotizaciones_codigo_unico;
CREATE UNIQUE INDEX cotizaciones_codigo_revision_unico ON public.cotizaciones (codigo, revision);
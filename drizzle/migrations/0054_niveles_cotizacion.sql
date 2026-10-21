ALTER TABLE public.cotizacion_items ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'partida' CHECK (nivel IN ('especialidad','titulo','subtitulo','partida'));
ALTER TABLE public.plantilla_cotizacion_items ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'partida' CHECK (nivel IN ('especialidad','titulo','subtitulo','partida'));
COMMENT ON COLUMN public.cotizacion_items.grupo IS 'DEPRECATED: jerarquía por nivel + orden';
COMMENT ON COLUMN public.plantilla_cotizacion_items.grupo IS 'DEPRECATED: jerarquía por nivel + orden';
COMMENT ON COLUMN public.cotizaciones.multidisciplinaria IS 'DEPRECATED: jerarquía por nivel + orden';
COMMENT ON COLUMN public.plantillas_cotizacion.multidisciplinaria IS 'DEPRECATED: jerarquía por nivel + orden';
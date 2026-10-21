-- Herramientas manuales: el porcentaje por defecto pasa a 5% en todas las pantallas.
ALTER TABLE public.cotizacion_items ALTER COLUMN pct_herramientas SET DEFAULT 5;
ALTER TABLE public.partidas ALTER COLUMN pct_herramientas SET DEFAULT 5;
ALTER TABLE public.partidas_maestras ALTER COLUMN pct_herramientas SET DEFAULT 5;
ALTER TABLE public.partidas_apu ALTER COLUMN pct_herramientas SET DEFAULT 5;

-- El margen de herramientas manuales (Márgenes APU) queda en 5%.
UPDATE public.margenes_insumo SET margen_pct = 5 WHERE tipo = 'HT' AND margen_pct IS DISTINCT FROM 5;

-- Filas que aún cargaban el anterior valor por defecto (3) se alinean con el nuevo.
UPDATE public.cotizacion_items SET pct_herramientas = 5 WHERE pct_herramientas = 3;
UPDATE public.partidas SET pct_herramientas = 5 WHERE pct_herramientas = 3;
UPDATE public.partidas_maestras SET pct_herramientas = 5 WHERE pct_herramientas = 3;
UPDATE public.partidas_apu SET pct_herramientas = 5 WHERE pct_herramientas = 3;
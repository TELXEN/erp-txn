ALTER TABLE public.proyectos ADD COLUMN periodicidad_cronograma text NOT NULL DEFAULT 'mes' CHECK (periodicidad_cronograma IN ('dia','semana','quincena','mes'));
ALTER TABLE public.cronograma_partidas ADD COLUMN periodicidad text NOT NULL DEFAULT 'mes' CHECK (periodicidad IN ('dia','semana','quincena','mes'));
ALTER TABLE public.cronograma_partidas ADD COLUMN fecha_inicio date;
UPDATE public.cronograma_partidas SET fecha_inicio = make_date(anio, mes, 1) WHERE fecha_inicio IS NULL;
ALTER TABLE public.cronograma_partidas ALTER COLUMN fecha_inicio SET NOT NULL;
ALTER TABLE public.cronograma_partidas DROP CONSTRAINT cronograma_partidas_partida_id_anio_mes_key;
ALTER TABLE public.cronograma_partidas ADD CONSTRAINT cronograma_partidas_partida_periodo_key UNIQUE (partida_id, periodicidad, fecha_inicio);
ALTER TABLE public.especialidades_partida DROP CONSTRAINT IF EXISTS especialidades_partida_codigo_key;
ALTER TABLE public.especialidades_partida ALTER COLUMN codigo SET DEFAULT '';
ALTER TABLE public.categorias_partida ALTER COLUMN codigo SET DEFAULT '';
DO $$ DECLARE r record; BEGIN
FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='categorias_partida' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%(codigo)%' LOOP
  EXECUTE format('ALTER TABLE public.categorias_partida DROP CONSTRAINT IF EXISTS %I', r.indexname);
  EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
END LOOP; END $$;
ALTER TABLE public.tareos DROP CONSTRAINT IF EXISTS tareos_partida_id_fkey;
ALTER TABLE public.tareos DROP COLUMN IF EXISTS partida_id;
-- Corrige el plegado de tildes: la ñ debe plegarse a N, no a espacio.
DROP INDEX IF EXISTS public.especialidades_partida_nombre_norm_key;
CREATE UNIQUE INDEX especialidades_partida_nombre_norm_key
ON public.especialidades_partida (
  upper(translate(regexp_replace(btrim(nombre), '\s+', ' ', 'g'), 'áéíóúñüÁÉÍÓÚÑÜ', 'aeiounuAEIOUNU'))
);
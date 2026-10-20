-- Evita especialidades repetidas aunque cambien mayúsculas, tildes o espacios.
CREATE UNIQUE INDEX IF NOT EXISTS especialidades_partida_nombre_norm_key
ON public.especialidades_partida (
  upper(translate(regexp_replace(btrim(nombre), '\s+', ' ', 'g'), 'áéíóúñüÁÉÍÓÚÑÜ', 'aeiou nuAEIOUNU'))
);
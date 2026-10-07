ALTER TABLE public.gastos_generales
  ADD CONSTRAINT gastos_generales_descripcion_util_chk
  CHECK (
    char_length(btrim(descripcion)) >= 2
    AND regexp_replace(btrim(descripcion), '[[:space:]]+', '', 'g') !~ '^(.)(\1)*$'
  ) NOT VALID;
ALTER TABLE public.trabajadores DROP CONSTRAINT IF EXISTS trabajadores_cargo_valido;
ALTER TABLE public.trabajadores ADD CONSTRAINT trabajadores_cargo_no_vacio CHECK (length(btrim(cargo)) > 0);
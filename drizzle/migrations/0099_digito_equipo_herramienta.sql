CREATE OR REPLACE FUNCTION public.ajustar_digito_equipo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d text; pref text; n int;
BEGIN
  IF NEW.tipo <> 'EQ' OR NEW.codigo IS NULL OR NEW.codigo !~ '^[34][0-9]{7}$' THEN RETURN NEW; END IF;
  d := CASE WHEN lower(coalesce(NEW.categoria_inventario, NEW.clase_equipo, '')) LIKE 'herramienta%' THEN '4' ELSE '3' END;
  IF left(NEW.codigo, 1) = d THEN RETURN NEW; END IF;
  pref := d || substr(NEW.codigo, 2, 4);
  PERFORM pg_advisory_xact_lock(hashtext('insumo:' || pref));
  SELECT coalesce(max(right(codigo, 3)::int), 0) + 1 INTO n FROM public.insumos WHERE codigo ~ ('^' || pref || '[0-9]{3}$') AND id <> NEW.id;
  NEW.codigo := pref || lpad(n::text, 3, '0');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ajustar_digito_equipo ON public.insumos;
CREATE TRIGGER trg_ajustar_digito_equipo BEFORE INSERT OR UPDATE OF codigo, categoria_inventario, clase_equipo ON public.insumos
FOR EACH ROW EXECUTE FUNCTION public.ajustar_digito_equipo();
UPDATE public.insumos SET categoria_inventario = categoria_inventario WHERE tipo = 'EQ';
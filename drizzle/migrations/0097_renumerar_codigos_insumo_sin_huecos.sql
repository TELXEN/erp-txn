CREATE OR REPLACE FUNCTION public.renumerar_prefijo_insumo(_pref text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; n int := 0;
BEGIN
  IF _pref IS NULL OR _pref !~ '^[0-9]{5}$' THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('insumo:' || _pref));
  -- primero a temporales para evitar choques
  FOR r IN SELECT id, codigo FROM public.insumos WHERE codigo ~ ('^' || _pref || '[0-9]{3}$') ORDER BY codigo, created_at LOOP
    n := n + 1;
    IF r.codigo <> _pref || lpad(n::text, 3, '0') THEN
      UPDATE public.insumos SET codigo = _pref || lpad(n::text, 3, '0') WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.renumerar_prefijo_insumo(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.renumerar_codigos_insumo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM public.renumerar_prefijo_insumo(left(OLD.codigo, 5));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.codigo IS DISTINCT FROM NEW.codigo THEN
      PERFORM public.renumerar_prefijo_insumo(left(OLD.codigo, 5));
      PERFORM public.renumerar_prefijo_insumo(left(NEW.codigo, 5));
    END IF;
  ELSE
    PERFORM public.renumerar_prefijo_insumo(left(NEW.codigo, 5));
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.renumerar_codigos_insumo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_renumerar_codigo ON public.insumos;
CREATE TRIGGER trg_renumerar_codigo AFTER INSERT OR DELETE OR UPDATE OF codigo ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.renumerar_codigos_insumo();

DO $$ DECLARE p text; BEGIN
  FOR p IN SELECT DISTINCT left(codigo,5) FROM public.insumos WHERE codigo ~ '^[0-9]{8}$' LOOP
    PERFORM public.renumerar_prefijo_insumo(p);
  END LOOP;
END $$;
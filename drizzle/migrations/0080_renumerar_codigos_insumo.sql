CREATE OR REPLACE FUNCTION public.renumerar_codigos_insumo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pref text; r record; n int := 0;
BEGIN
  IF OLD.codigo IS NULL OR OLD.codigo !~ '^[0-9]{8}$' THEN RETURN OLD; END IF;
  pref := left(OLD.codigo, 5);
  PERFORM pg_advisory_xact_lock(hashtext('insumo:' || pref));
  FOR r IN EXECUTE format('SELECT id, codigo FROM public.%I WHERE codigo ~ $1 ORDER BY codigo', TG_TABLE_NAME)
    USING '^' || pref || '[0-9]{3}$' LOOP
    n := n + 1;
    IF r.codigo <> pref || lpad(n::text, 3, '0') THEN
      EXECUTE format('UPDATE public.%I SET codigo = $1 WHERE id = $2', TG_TABLE_NAME)
        USING pref || lpad(n::text, 3, '0'), r.id;
    END IF;
  END LOOP;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.renumerar_codigos_insumo() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_renumerar_codigo AFTER DELETE ON public.materiales FOR EACH ROW EXECUTE FUNCTION public.renumerar_codigos_insumo();
CREATE TRIGGER trg_renumerar_codigo AFTER DELETE ON public.mano_obra FOR EACH ROW EXECUTE FUNCTION public.renumerar_codigos_insumo();
CREATE TRIGGER trg_renumerar_codigo AFTER DELETE ON public.equipos_herramientas FOR EACH ROW EXECUTE FUNCTION public.renumerar_codigos_insumo();
CREATE TRIGGER trg_renumerar_codigo AFTER DELETE ON public.subcontratos FOR EACH ROW EXECUTE FUNCTION public.renumerar_codigos_insumo();
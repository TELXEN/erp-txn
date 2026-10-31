CREATE COLLATION IF NOT EXISTS public.categorias_alfabeto_es (provider = icu, locale = 'es-u-kn-true-ks-level1', deterministic = false);

CREATE OR REPLACE FUNCTION public.categorias_numeracion_antes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('categorias_numeracion_alfabetica'));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'INSERT' THEN NEW.codigo := '00'; NEW.orden := 0; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.categorias_numeracion_antes() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.categorias_numeracion_despues()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE especialidad uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  FOR especialidad IN
    SELECT DISTINCT x.id FROM (VALUES
      (CASE WHEN TG_OP <> 'DELETE' THEN NEW.especialidad_id END),
      (CASE WHEN TG_OP <> 'INSERT' THEN OLD.especialidad_id END)
    ) AS x(id) WHERE x.id IS NOT NULL
  LOOP
    IF (SELECT count(*) FROM public.categorias_insumo WHERE especialidad_id = especialidad) > 99 THEN
      RAISE EXCEPTION 'Una especialidad admite hasta 99 categorías.';
    END IF;
    WITH numeradas AS (
      SELECT id, row_number() OVER (ORDER BY btrim(nombre) COLLATE public.categorias_alfabeto_es, id)::integer AS numero
      FROM public.categorias_insumo WHERE especialidad_id = especialidad
    )
    UPDATE public.categorias_insumo c SET codigo = lpad(n.numero::text, 2, '0'), orden = n.numero
    FROM numeradas n WHERE c.id = n.id AND (c.codigo IS DISTINCT FROM lpad(n.numero::text, 2, '0') OR c.orden IS DISTINCT FROM n.numero);
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.categorias_numeracion_despues() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER categorias_numeracion_antes
BEFORE INSERT OR UPDATE OR DELETE ON public.categorias_insumo
FOR EACH ROW EXECUTE FUNCTION public.categorias_numeracion_antes();
CREATE TRIGGER categorias_numeracion_despues
AFTER INSERT OR UPDATE OR DELETE ON public.categorias_insumo
FOR EACH ROW EXECUTE FUNCTION public.categorias_numeracion_despues();
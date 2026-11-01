ALTER TABLE public.subfamilias_insumo ADD COLUMN orden integer NOT NULL DEFAULT 0;
UPDATE public.subfamilias_insumo SET orden = codigo::integer WHERE codigo ~ '^[0-9]{2}$';
ALTER TABLE public.subfamilias_insumo DROP CONSTRAINT subfamilias_insumo_especialidad_id_codigo_key;
ALTER TABLE public.subfamilias_insumo ADD CONSTRAINT subfamilias_insumo_especialidad_id_codigo_key UNIQUE (especialidad_id,codigo) DEFERRABLE INITIALLY IMMEDIATE;

CREATE OR REPLACE FUNCTION public.renumerar_subcategorias(_especialidad uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previo text := coalesce(current_setting('erp.numerando_subcategorias',true),'');
BEGIN
  IF _especialidad IS NULL THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('subcategorias_correlativo'));
  IF (SELECT count(*) FROM public.subfamilias_insumo WHERE especialidad_id=_especialidad)>99 THEN
    RAISE EXCEPTION 'Una especialidad admite hasta 99 subcategorías.';
  END IF;
  SET CONSTRAINTS subfamilias_insumo_especialidad_id_codigo_key DEFERRED;
  PERFORM set_config('erp.numerando_subcategorias','1',true);
  WITH numeradas AS (
    SELECT s.id,row_number() OVER (ORDER BY coalesce(c.codigo,'99'),s.orden,s.codigo,s.id)::integer numero
    FROM public.subfamilias_insumo s LEFT JOIN public.categorias_insumo c ON c.id=s.categoria_id
    WHERE s.especialidad_id=_especialidad
  )
  UPDATE public.subfamilias_insumo s SET codigo=lpad(n.numero::text,2,'0'),orden=n.numero
  FROM numeradas n WHERE s.id=n.id AND (s.codigo IS DISTINCT FROM lpad(n.numero::text,2,'0') OR s.orden IS DISTINCT FROM n.numero);
  UPDATE public.insumos i SET codigo=substr(i.codigo,1,3)||s.codigo||substr(i.codigo,6)
  FROM public.subfamilias_insumo s
  WHERE i.subfamilia_id=s.id AND s.especialidad_id=_especialidad AND length(i.codigo)=8
    AND substr(i.codigo,4,2) IS DISTINCT FROM s.codigo;
  PERFORM set_config('erp.numerando_subcategorias',previo,true);
END $$;
REVOKE ALL ON FUNCTION public.renumerar_subcategorias(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renumerar_subcategorias(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validar_subcategoria()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.categoria_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.categorias_insumo WHERE id=NEW.categoria_id AND especialidad_id=NEW.especialidad_id) THEN
    RAISE EXCEPTION 'La categoría no pertenece a la especialidad de la subcategoría.';
  END IF;
  NEW.bloque:=coalesce((SELECT nombre FROM public.categorias_insumo WHERE id=NEW.categoria_id),'');
  IF coalesce(current_setting('erp.numerando_subcategorias',true),'')='1' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('subcategorias_correlativo'));
  IF TG_OP='INSERT' THEN
    NEW.codigo:='00'; NEW.orden:=1000;
  ELSE
    NEW.codigo:=OLD.codigo; NEW.orden:=OLD.orden;
    IF NEW.categoria_id IS DISTINCT FROM OLD.categoria_id OR NEW.especialidad_id IS DISTINCT FROM OLD.especialidad_id THEN NEW.orden:=1000; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.compactar_subcategorias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF coalesce(current_setting('erp.numerando_subcategorias',true),'')='1' THEN RETURN NULL; END IF;
  IF TG_OP<>'INSERT' THEN PERFORM public.renumerar_subcategorias(OLD.especialidad_id); END IF;
  IF TG_OP<>'DELETE' THEN PERFORM public.renumerar_subcategorias(NEW.especialidad_id); END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER numerar_subcategorias_guardado AFTER INSERT OR UPDATE ON public.subfamilias_insumo FOR EACH ROW EXECUTE FUNCTION public.compactar_subcategorias();

CREATE OR REPLACE FUNCTION public.mover_subcategoria(_id uuid,_direccion integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a record; b record;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Solo Gerencia o Administración puede mover subcategorías.'; END IF;
  IF _direccion NOT IN (-1,1) THEN RAISE EXCEPTION 'Dirección no válida.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('subcategorias_correlativo'));
  SELECT * INTO a FROM public.subfamilias_insumo WHERE id=_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Subcategoría no encontrada.'; END IF;
  IF _direccion=-1 THEN
    SELECT * INTO b FROM public.subfamilias_insumo WHERE especialidad_id=a.especialidad_id AND categoria_id IS NOT DISTINCT FROM a.categoria_id AND orden<a.orden ORDER BY orden DESC LIMIT 1;
  ELSE
    SELECT * INTO b FROM public.subfamilias_insumo WHERE especialidad_id=a.especialidad_id AND categoria_id IS NOT DISTINCT FROM a.categoria_id AND orden>a.orden ORDER BY orden LIMIT 1;
  END IF;
  IF b.id IS NULL THEN RETURN; END IF;
  PERFORM set_config('erp.numerando_subcategorias','1',true);
  UPDATE public.subfamilias_insumo SET orden=CASE WHEN id=a.id THEN b.orden ELSE a.orden END WHERE id IN (a.id,b.id);
  PERFORM set_config('erp.numerando_subcategorias','',true);
  PERFORM public.renumerar_subcategorias(a.especialidad_id);
END $$;

CREATE FUNCTION public.subcategorias_tras_categorias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e uuid;
BEGIN
  IF pg_trigger_depth()>1 THEN RETURN NULL; END IF;
  FOR e IN SELECT DISTINCT especialidad_id FROM public.subfamilias_insumo LOOP
    PERFORM public.renumerar_subcategorias(e);
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.subcategorias_tras_categorias() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER subcategorias_tras_categorias AFTER INSERT OR UPDATE OR DELETE ON public.categorias_insumo FOR EACH STATEMENT EXECUTE FUNCTION public.subcategorias_tras_categorias();
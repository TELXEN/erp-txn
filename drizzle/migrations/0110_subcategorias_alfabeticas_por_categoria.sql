ALTER TABLE public.subfamilias_insumo DROP CONSTRAINT subfamilias_insumo_especialidad_id_codigo_key;
ALTER TABLE public.subfamilias_insumo ADD CONSTRAINT subfamilias_insumo_categoria_codigo_key UNIQUE NULLS NOT DISTINCT (especialidad_id,categoria_id,codigo) DEFERRABLE INITIALLY IMMEDIATE;
CREATE OR REPLACE FUNCTION public.renumerar_subcategorias(_especialidad uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previo text := coalesce(current_setting('erp.numerando_subcategorias',true),'');
BEGIN
  IF _especialidad IS NULL THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('subcategorias_correlativo'));
  IF EXISTS (SELECT 1 FROM public.subfamilias_insumo WHERE especialidad_id=_especialidad GROUP BY categoria_id HAVING count(*)>99) THEN
    RAISE EXCEPTION 'Una categoría admite hasta 99 subcategorías.';
  END IF;
  SET CONSTRAINTS subfamilias_insumo_categoria_codigo_key DEFERRED;
  PERFORM set_config('erp.numerando_subcategorias','1',true);
  WITH numeradas AS (
    SELECT id,row_number() OVER (PARTITION BY categoria_id ORDER BY nombre COLLATE public.categorias_alfabeto_es,id)::integer numero
    FROM public.subfamilias_insumo WHERE especialidad_id=_especialidad
  )
  UPDATE public.subfamilias_insumo s SET codigo=lpad(n.numero::text,2,'0'),orden=n.numero
  FROM numeradas n WHERE s.id=n.id AND (s.codigo IS DISTINCT FROM lpad(n.numero::text,2,'0') OR s.orden IS DISTINCT FROM n.numero);
  -- Categories may share SS. Allocate NNN across the resulting prefix, not per category,
  -- so the existing eight-digit item code never duplicates another item's code.
  IF EXISTS (
    SELECT 1 FROM public.insumos i LEFT JOIN public.subfamilias_insumo s ON s.id=i.subfamilia_id
    WHERE i.especialidad_id=_especialidad AND i.codigo ~ '^[0-9]{8}$'
    GROUP BY substr(i.codigo,1,3)||coalesce(s.codigo,substr(i.codigo,4,2)) HAVING count(*)>999
  ) THEN RAISE EXCEPTION 'Se agotó el correlativo (999) de insumos para un prefijo.'; END IF;
  WITH prefijos AS (
    SELECT i.id,i.codigo,i.created_at,substr(i.codigo,1,3)||coalesce(s.codigo,substr(i.codigo,4,2)) pref
    FROM public.insumos i LEFT JOIN public.subfamilias_insumo s ON s.id=i.subfamilia_id
    WHERE i.especialidad_id=_especialidad AND i.codigo ~ '^[0-9]{8}$'
  ), numeradas AS (
    SELECT id,pref||lpad((row_number() OVER (PARTITION BY pref ORDER BY codigo,created_at,id))::text,3,'0') codigo FROM prefijos
  )
  UPDATE public.insumos i SET codigo=n.codigo FROM numeradas n WHERE i.id=n.id AND i.codigo IS DISTINCT FROM n.codigo;
  PERFORM set_config('erp.numerando_subcategorias',previo,true);
END $$;
REVOKE ALL ON FUNCTION public.renumerar_subcategorias(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renumerar_subcategorias(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.mover_subcategoria(_id uuid,_direccion integer)
RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Las subcategorías se ordenan automáticamente de A a Z dentro de su categoría.'; END $$;
REVOKE ALL ON FUNCTION public.mover_subcategoria(uuid,integer) FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION public.mover_subcategoria(uuid,integer) IS 'DEPRECATED: automatic alphabetical ordering replaces manual moves.';
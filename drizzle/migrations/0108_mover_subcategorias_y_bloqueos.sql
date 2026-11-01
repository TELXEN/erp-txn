CREATE OR REPLACE FUNCTION public.recodificar_insumos_subcategoria(_sub uuid, _nuevo text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.insumos SET codigo = substr(codigo,1,3) || _nuevo || substr(codigo,6)
  WHERE subfamilia_id = _sub AND length(codigo) = 8 AND substr(codigo,4,2) IS DISTINCT FROM _nuevo;
$$;
REVOKE ALL ON FUNCTION public.recodificar_insumos_subcategoria(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mover_subcategoria(_id uuid, _direccion integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; b record;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Solo Gerencia o Administración puede mover subcategorías.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mover_subcategoria'));
  SELECT * INTO a FROM public.subfamilias_insumo WHERE id = _id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Subcategoría no encontrada.'; END IF;
  IF _direccion < 0 THEN
    SELECT * INTO b FROM public.subfamilias_insumo WHERE especialidad_id = a.especialidad_id AND categoria_id IS NOT DISTINCT FROM a.categoria_id AND codigo < a.codigo ORDER BY codigo DESC LIMIT 1;
  ELSE
    SELECT * INTO b FROM public.subfamilias_insumo WHERE especialidad_id = a.especialidad_id AND categoria_id IS NOT DISTINCT FROM a.categoria_id AND codigo > a.codigo ORDER BY codigo LIMIT 1;
  END IF;
  IF b.id IS NULL THEN RETURN; END IF;
  UPDATE public.subfamilias_insumo SET codigo = '__' WHERE id = a.id;
  UPDATE public.subfamilias_insumo SET codigo = a.codigo WHERE id = b.id;
  UPDATE public.subfamilias_insumo SET codigo = b.codigo WHERE id = a.id;
  PERFORM public.recodificar_insumos_subcategoria(a.id, b.codigo);
  PERFORM public.recodificar_insumos_subcategoria(b.id, a.codigo);
END $$;
REVOKE ALL ON FUNCTION public.mover_subcategoria(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mover_subcategoria(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.bloquear_borrado_categoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.subfamilias_insumo WHERE categoria_id = OLD.id;
  IF n > 0 THEN RAISE EXCEPTION 'Esta categoría tiene % subcategorías; muévelas o elimínalas primero.', n; END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.bloquear_borrado_categoria() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bloquear_borrado_categoria BEFORE DELETE ON public.categorias_insumo
FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_categoria();

CREATE OR REPLACE FUNCTION public.bloquear_borrado_subcategoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.insumos WHERE subfamilia_id = OLD.id;
  IF n > 0 THEN RAISE EXCEPTION 'Esta subcategoría tiene % insumos.', n; END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.bloquear_borrado_subcategoria() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bloquear_borrado_subcategoria BEFORE DELETE ON public.subfamilias_insumo
FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_subcategoria();

-- Tras borrar, las restantes de la categoría ocupan los códigos más bajos del rango (sin huecos).
CREATE OR REPLACE FUNCTION public.compactar_subcategorias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF OLD.categoria_id IS NULL THEN RETURN NULL; END IF;
  FOR r IN
    WITH cods AS (
      SELECT codigo FROM public.subfamilias_insumo WHERE categoria_id = OLD.categoria_id
      UNION SELECT OLD.codigo
    ), libres AS (SELECT codigo, row_number() OVER (ORDER BY codigo) rn FROM cods),
    restantes AS (SELECT id, codigo, row_number() OVER (ORDER BY codigo) rn FROM public.subfamilias_insumo WHERE categoria_id = OLD.categoria_id)
    SELECT s.id, l.codigo nuevo FROM restantes s JOIN libres l ON l.rn = s.rn WHERE s.codigo <> l.codigo ORDER BY s.rn
  LOOP
    UPDATE public.subfamilias_insumo SET codigo = r.nuevo WHERE id = r.id;
    PERFORM public.recodificar_insumos_subcategoria(r.id, r.nuevo);
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.compactar_subcategorias() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER compactar_subcategorias AFTER DELETE ON public.subfamilias_insumo
FOR EACH ROW EXECUTE FUNCTION public.compactar_subcategorias();
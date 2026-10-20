CREATE OR REPLACE FUNCTION public.mover_item_wbs(_tabla text, _id uuid, _direccion integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o int; vecino uuid; grp text; grp2 text;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso para reordenar el catálogo'; END IF;
  SET CONSTRAINTS ALL DEFERRED;
  IF _tabla = 'especialidades' THEN
    SELECT orden, bloque INTO o, grp FROM especialidades_partida WHERE id = _id;
    SELECT id INTO vecino FROM especialidades_partida WHERE bloque = grp AND orden = o + sign(_direccion);
    IF vecino IS NULL THEN RETURN; END IF;
    UPDATE especialidades_partida SET orden = o WHERE id = vecino;
    UPDATE especialidades_partida SET orden = o + sign(_direccion) WHERE id = _id;
  ELSIF _tabla = 'categorias' THEN
    SELECT orden, especialidad INTO o, grp FROM categorias_partida WHERE id = _id;
    SELECT id INTO vecino FROM categorias_partida WHERE especialidad = grp AND orden = o + sign(_direccion);
    IF vecino IS NULL THEN RETURN; END IF;
    UPDATE categorias_partida SET orden = o WHERE id = vecino;
    UPDATE categorias_partida SET orden = o + sign(_direccion) WHERE id = _id;
  ELSIF _tabla = 'partidas' THEN
    SELECT orden, especialidad, coalesce(categoria, '') INTO o, grp, grp2 FROM partidas_maestras WHERE id = _id;
    SELECT id INTO vecino FROM partidas_maestras WHERE especialidad = grp AND coalesce(categoria, '') = grp2 AND orden = o + sign(_direccion);
    IF vecino IS NULL THEN RETURN; END IF;
    UPDATE partidas_maestras SET orden = o WHERE id = vecino;
    UPDATE partidas_maestras SET orden = o + sign(_direccion) WHERE id = _id;
  ELSE RAISE EXCEPTION 'Tabla no válida'; END IF;
  PERFORM public.recodificar_wbs();
END; $function$;
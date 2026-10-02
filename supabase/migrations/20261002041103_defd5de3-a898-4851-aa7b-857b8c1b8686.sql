ALTER TABLE public.codificacion_insumo ADD COLUMN IF NOT EXISTS digito_partida integer NOT NULL DEFAULT 6;
ALTER TABLE public.partidas_maestras ADD COLUMN IF NOT EXISTS orden integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recodificar_wbs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'Sin permiso para reordenar el catálogo';
  END IF;
  SELECT coalesce((SELECT digito_partida FROM public.codificacion_insumo ORDER BY created_at LIMIT 1), 6)::text INTO d;
  SET CONSTRAINTS ALL DEFERRED;
  UPDATE public.especialidades_partida e SET orden = s.n, codigo = lpad(s.n::text, 2, '0')
  FROM (SELECT id, row_number() OVER (ORDER BY orden, nombre) n FROM public.especialidades_partida) s
  WHERE e.id = s.id AND (e.orden <> s.n OR e.codigo <> lpad(s.n::text, 2, '0'));
  UPDATE public.categorias_partida c SET orden = s.n,
    codigo = coalesce(e.codigo, '00') || '.' || lpad(s.n::text, 2, '0')
  FROM (SELECT id, row_number() OVER (PARTITION BY especialidad ORDER BY orden, nombre) n FROM public.categorias_partida) s
  LEFT JOIN public.categorias_partida c2 ON c2.id = s.id
  LEFT JOIN public.especialidades_partida e ON e.nombre = c2.especialidad
  WHERE c.id = s.id;
  UPDATE public.partidas_maestras p SET orden = s.n,
    codigo = d || coalesce(e.codigo, '00') || coalesce(right(c.codigo, 2), '00') || lpad(s.n::text, 3, '0')
  FROM (SELECT id, row_number() OVER (PARTITION BY especialidad, coalesce(categoria, '') ORDER BY orden, created_at) n FROM public.partidas_maestras) s
  JOIN public.partidas_maestras p2 ON p2.id = s.id
  LEFT JOIN public.especialidades_partida e ON e.nombre = p2.especialidad
  LEFT JOIN public.categorias_partida c ON c.especialidad = p2.especialidad AND c.nombre = p2.categoria
  WHERE p.id = s.id;
END; $$;

UPDATE public.partidas_maestras SET orden = 0;
SELECT public.recodificar_wbs();

ALTER TABLE public.especialidades_partida ADD CONSTRAINT especialidades_partida_orden_uniq UNIQUE (orden) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.categorias_partida ADD CONSTRAINT categorias_partida_orden_uniq UNIQUE (especialidad, orden) DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.mover_item_wbs(_tabla text, _id uuid, _direccion integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o int; vecino uuid; grp text; grp2 text;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso para reordenar el catálogo'; END IF;
  SET CONSTRAINTS ALL DEFERRED;
  IF _tabla = 'especialidades' THEN
    SELECT orden INTO o FROM especialidades_partida WHERE id = _id;
    SELECT id INTO vecino FROM especialidades_partida WHERE orden = o + sign(_direccion);
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
END; $$;

REVOKE ALL ON FUNCTION public.recodificar_wbs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mover_item_wbs(text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recodificar_wbs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mover_item_wbs(text, uuid, integer) TO authenticated, service_role;
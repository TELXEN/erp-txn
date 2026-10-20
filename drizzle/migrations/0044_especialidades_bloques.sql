ALTER TABLE public.especialidades_partida ADD COLUMN IF NOT EXISTS bloque text NOT NULL DEFAULT 'construccion';
ALTER TABLE public.especialidades_partida ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE public.especialidades_partida ADD CONSTRAINT especialidades_partida_bloque_chk CHECK (bloque IN ('ingenieria','construccion'));

CREATE OR REPLACE FUNCTION public.recodificar_wbs()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'Sin permiso para reordenar el catálogo';
  END IF;
  SET CONSTRAINTS ALL DEFERRED;
  UPDATE public.grupos_cotizacion g SET orden = s.n
  FROM (SELECT id, row_number() OVER (ORDER BY orden, nombre) n FROM public.grupos_cotizacion) s
  WHERE g.id = s.id AND g.orden <> s.n;
  UPDATE public.especialidades_partida e SET orden = s.n,
    codigo = CASE WHEN e.bloque = 'ingenieria' THEN '00.' || lpad(s.n::text, 2, '0') ELSE lpad(s.n::text, 2, '0') END
  FROM (SELECT id, row_number() OVER (PARTITION BY bloque ORDER BY orden, nombre) n FROM public.especialidades_partida) s
  WHERE e.id = s.id;
  UPDATE public.categorias_partida c SET orden = s.n,
    codigo = coalesce(left(e.codigo, 2), '00') || '.' || coalesce(g.orden, 0)::text || '.' || lpad(s.m::text, 2, '0')
  FROM (SELECT id,
          row_number() OVER (PARTITION BY especialidad ORDER BY orden, nombre) n,
          row_number() OVER (PARTITION BY especialidad, coalesce(grupo, '') ORDER BY orden, nombre) m
        FROM public.categorias_partida) s
  LEFT JOIN public.categorias_partida c2 ON c2.id = s.id
  LEFT JOIN public.especialidades_partida e ON e.nombre = c2.especialidad
  LEFT JOIN public.grupos_cotizacion g ON g.nombre = c2.grupo
  WHERE c.id = s.id;
  UPDATE public.partidas_maestras p SET orden = s.n,
    codigo = coalesce(ti.digito, tm.digito, 2)::text
    || coalesce(left(e.codigo, 2), '00') || coalesce(g.orden, 0)::text || coalesce(right(c.codigo, 2), '00') || lpad(s.n::text, 3, '0')
  FROM (SELECT id, row_number() OVER (PARTITION BY especialidad, coalesce(categoria, '') ORDER BY orden, created_at) n FROM public.partidas_maestras) s
  JOIN public.partidas_maestras p2 ON p2.id = s.id
  LEFT JOIN public.tipos_insumo ti ON ti.clave = coalesce(p2.tipo_partida, 'MAT')
  LEFT JOIN public.tipos_insumo tm ON tm.clave = 'MAT'
  LEFT JOIN public.especialidades_partida e ON e.nombre = p2.especialidad
  LEFT JOIN public.categorias_partida c ON c.especialidad = p2.especialidad AND c.nombre = p2.categoria
  LEFT JOIN public.grupos_cotizacion g ON g.nombre = c.grupo
  WHERE p.id = s.id;
END; $function$;
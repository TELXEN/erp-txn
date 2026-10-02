ALTER TABLE public.partidas_maestras ADD COLUMN IF NOT EXISTS tipo_partida text NOT NULL DEFAULT 'MAT';

CREATE OR REPLACE FUNCTION public.recodificar_wbs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cfg public.codificacion_insumo%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'Sin permiso para reordenar el catálogo';
  END IF;
  SELECT * INTO cfg FROM public.codificacion_insumo ORDER BY created_at LIMIT 1;
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
    codigo = (CASE coalesce(p2.tipo_partida, 'MAT')
      WHEN 'MO' THEN coalesce(cfg.digito_mo, 1)
      WHEN 'MAT' THEN coalesce(cfg.digito_mat, 2)
      WHEN 'EQ' THEN coalesce(cfg.digito_eq, 3)
      WHEN 'HT' THEN coalesce(cfg.digito_ht, 4)
      WHEN 'SC' THEN coalesce(cfg.digito_sc, 5)
      ELSE coalesce(cfg.digito_mat, 2) END)::text
    || coalesce(e.codigo, '00') || coalesce(right(c.codigo, 2), '00') || lpad(s.n::text, 3, '0')
  FROM (SELECT id, row_number() OVER (PARTITION BY especialidad, coalesce(categoria, '') ORDER BY orden, created_at) n FROM public.partidas_maestras) s
  JOIN public.partidas_maestras p2 ON p2.id = s.id
  LEFT JOIN public.especialidades_partida e ON e.nombre = p2.especialidad
  LEFT JOIN public.categorias_partida c ON c.especialidad = p2.especialidad AND c.nombre = p2.categoria
  WHERE p.id = s.id;
END; $$;

REVOKE ALL ON FUNCTION public.recodificar_wbs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recodificar_wbs() TO authenticated, service_role;

SELECT public.recodificar_wbs();

ALTER TABLE public.codificacion_insumo DROP COLUMN digito_partida;
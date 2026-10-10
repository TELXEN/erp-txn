CREATE OR REPLACE FUNCTION public.mo_presupuestada(_proyecto uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(COALESCE(p.metrado,0) * (
    CASE WHEN c.cuadrilla > 0 AND COALESCE(p.rendimiento,0) > 0
      THEN c.cuadrilla * COALESCE(p.jornada,8) / p.rendimiento ELSE COALESCE(c.cantidad,0) END
  ) * COALESCE(i.precio,0) * (1 + COALESCE((SELECT margen_pct FROM public.margenes_insumo WHERE tipo = 'MO'),0)/100)), 0)
  FROM public.partidas p
  JOIN public.apu_componentes c ON c.partida_id = p.id
  JOIN public.insumos i ON i.id = c.insumo_id AND i.tipo = 'MO'
  WHERE p.proyecto_id = _proyecto
$$;
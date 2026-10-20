CREATE OR REPLACE FUNCTION public.siguiente_codigo_insumo_modular(_especialidad uuid, _tipo text, _subfamilia uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ee text; t text; ss text; pref text; n int;
BEGIN
  IF NOT public.es_personal(auth.uid()) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT codigo_modular INTO ee FROM especialidades_partida WHERE id = _especialidad;
  IF ee IS NULL THEN RAISE EXCEPTION 'La especialidad no tiene código de 2 dígitos.'; END IF;
  t := CASE _tipo WHEN 'materiales' THEN '1' WHEN 'mano_obra' THEN '2' WHEN 'equipos_herramientas' THEN '3' WHEN 'subcontratos' THEN '4' END;
  IF t IS NULL THEN RAISE EXCEPTION 'Tipo de insumo no válido.'; END IF;
  IF t = '1' THEN
    SELECT codigo INTO ss FROM subfamilias_insumo WHERE id = _subfamilia AND especialidad_id = _especialidad;
    IF ss IS NULL THEN RAISE EXCEPTION 'La subfamilia no pertenece a la especialidad.'; END IF;
  ELSE
    ss := '00';
  END IF;
  pref := t || ee || ss;
  PERFORM pg_advisory_xact_lock(hashtext('insumo:' || pref));
  SELECT coalesce(max(right(codigo, 3)::int), 0) + 1 INTO n FROM (
    SELECT codigo FROM materiales UNION ALL SELECT codigo FROM mano_obra
    UNION ALL SELECT codigo FROM equipos_herramientas UNION ALL SELECT codigo FROM subcontratos) x
  WHERE codigo ~ ('^' || pref || '[0-9]{3}$');
  IF n > 999 THEN RAISE EXCEPTION 'Se agotó el correlativo (999) para %.', pref; END IF;
  RETURN pref || lpad(n::text, 3, '0');
END $$;
REVOKE ALL ON FUNCTION public.siguiente_codigo_insumo_modular(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_insumo_modular(uuid, text, uuid) TO authenticated;

UPDATE public.mano_obra SET subfamilia_id = NULL WHERE subfamilia_id IS NOT NULL;
UPDATE public.equipos_herramientas SET subfamilia_id = NULL WHERE subfamilia_id IS NOT NULL;
UPDATE public.subcontratos SET subfamilia_id = NULL WHERE subfamilia_id IS NOT NULL;

WITH r AS (
  SELECT m.id, '1' || e.codigo_modular || s.codigo AS pref, row_number() OVER (PARTITION BY e.codigo_modular, s.codigo ORDER BY m.codigo, m.created_at) AS n
  FROM public.materiales m JOIN public.especialidades_partida e ON e.id = m.especialidad_id
  JOIN public.subfamilias_insumo s ON s.id = m.subfamilia_id WHERE e.codigo_modular IS NOT NULL)
UPDATE public.materiales x SET codigo = r.pref || lpad(r.n::text, 3, '0') FROM r WHERE x.id = r.id;
WITH r AS (
  SELECT m.id, '2' || e.codigo_modular || '00' AS pref, row_number() OVER (PARTITION BY e.codigo_modular ORDER BY m.codigo, m.created_at) AS n
  FROM public.mano_obra m JOIN public.especialidades_partida e ON e.id = m.especialidad_id WHERE e.codigo_modular IS NOT NULL)
UPDATE public.mano_obra x SET codigo = r.pref || lpad(r.n::text, 3, '0') FROM r WHERE x.id = r.id;
WITH r AS (
  SELECT m.id, '3' || e.codigo_modular || '00' AS pref, row_number() OVER (PARTITION BY e.codigo_modular ORDER BY m.codigo, m.created_at) AS n
  FROM public.equipos_herramientas m JOIN public.especialidades_partida e ON e.id = m.especialidad_id WHERE e.codigo_modular IS NOT NULL)
UPDATE public.equipos_herramientas x SET codigo = r.pref || lpad(r.n::text, 3, '0') FROM r WHERE x.id = r.id;
WITH r AS (
  SELECT m.id, '4' || e.codigo_modular || '00' AS pref, row_number() OVER (PARTITION BY e.codigo_modular ORDER BY m.codigo, m.created_at) AS n
  FROM public.subcontratos m JOIN public.especialidades_partida e ON e.id = m.especialidad_id WHERE e.codigo_modular IS NOT NULL)
UPDATE public.subcontratos x SET codigo = r.pref || lpad(r.n::text, 3, '0') FROM r WHERE x.id = r.id;
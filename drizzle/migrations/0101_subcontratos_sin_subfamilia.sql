-- Los subcontratos tampoco usan subfamilia: sus dos dígitos del código van siempre en 00 (igual que mano de obra).
CREATE OR REPLACE FUNCTION public.siguiente_codigo_insumo_modular(_especialidad uuid, _tipo text, _subfamilia uuid, _categoria text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE ee text; t text; ss text; pref text; n int;
BEGIN
  IF NOT public.es_personal(auth.uid()) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT codigo_modular INTO ee FROM especialidades_partida WHERE id = _especialidad;
  IF ee IS NULL THEN RAISE EXCEPTION 'La especialidad no tiene código de 2 dígitos.'; END IF;
  t := CASE
    WHEN _tipo IN ('mano_obra','MO') THEN '1'
    WHEN _tipo IN ('materiales','MAT') THEN '2'
    WHEN _tipo IN ('equipos_herramientas','EQ') THEN CASE WHEN lower(coalesce(_categoria,'')) LIKE 'herramienta%' THEN '4' ELSE '3' END
    WHEN _tipo IN ('subcontratos','SC') THEN '5'
    WHEN _tipo IN ('epp_catalogo','EPP') THEN '6' END;
  IF t IS NULL THEN RAISE EXCEPTION 'Tipo de insumo no válido.'; END IF;
  IF t IN ('1','5') THEN
    -- Mano de obra y subcontratos: la subfamilia no aplica, se ignora la que llegue.
    ss := '00';
  ELSIF _subfamilia IS NOT NULL THEN
    SELECT codigo INTO ss FROM subfamilias_insumo WHERE id = _subfamilia AND especialidad_id = _especialidad;
    IF ss IS NULL THEN RAISE EXCEPTION 'La subfamilia no pertenece a la especialidad.'; END IF;
  ELSIF t = '2' THEN RAISE EXCEPTION 'Los materiales requieren subfamilia.';
  ELSE ss := '00';
  END IF;
  pref := t || ee || ss;
  PERFORM pg_advisory_xact_lock(hashtext('insumo:' || pref));
  SELECT coalesce(max(right(codigo, 3)::int), 0) + 1 INTO n FROM public.insumos WHERE codigo ~ ('^' || pref || '[0-9]{3}$');
  IF n > 999 THEN RAISE EXCEPTION 'Se agotó el correlativo (999) para %.', pref; END IF;
  RETURN pref || lpad(n::text, 3, '0');
END
$function$;

-- Ninguna ficha de mano de obra ni de subcontrato guarda subfamilia, aunque alguna pantalla la envíe.
DROP TRIGGER IF EXISTS trg_sin_subfamilia_mano_obra ON public.insumos;
DROP FUNCTION IF EXISTS public.sin_subfamilia_mano_obra();

CREATE OR REPLACE FUNCTION public.sin_subfamilia_insumo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tipo IN ('MO','mano_obra','SC','subcontratos') THEN NEW.subfamilia_id := NULL; END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_sin_subfamilia_insumo ON public.insumos;
CREATE TRIGGER trg_sin_subfamilia_insumo BEFORE INSERT OR UPDATE OF subfamilia_id ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.sin_subfamilia_insumo();

COMMENT ON COLUMN public.insumos.subfamilia_id IS 'Subfamilia (SS del código T+EE+SS+NNN). Obligatoria en materiales, opcional en equipos, herramientas y EPP; siempre 00 en mano de obra y subcontratos.';
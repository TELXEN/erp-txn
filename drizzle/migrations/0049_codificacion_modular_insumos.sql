ALTER TABLE public.especialidades_partida ADD COLUMN IF NOT EXISTS codigo_modular text;
ALTER TABLE public.especialidades_partida ADD CONSTRAINT especialidades_codigo_modular_fmt CHECK (codigo_modular IS NULL OR codigo_modular ~ '^[0-9]{2}$');
CREATE UNIQUE INDEX IF NOT EXISTS especialidades_codigo_modular_key ON public.especialidades_partida (codigo_modular) WHERE codigo_modular IS NOT NULL;

CREATE TABLE public.subfamilias_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  especialidad_id uuid NOT NULL REFERENCES public.especialidades_partida(id) ON DELETE CASCADE,
  bloque text NOT NULL DEFAULT '',
  codigo text NOT NULL CHECK (codigo ~ '^[0-9]{2}$'),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (especialidad_id, codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subfamilias_insumo TO authenticated;
GRANT ALL ON public.subfamilias_insumo TO service_role;
ALTER TABLE public.subfamilias_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee subfamilias" ON public.subfamilias_insumo FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Gerencia gestiona subfamilias" ON public.subfamilias_insumo FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

ALTER TABLE public.materiales ADD COLUMN IF NOT EXISTS especialidad_id uuid REFERENCES public.especialidades_partida(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS subfamilia_id uuid REFERENCES public.subfamilias_insumo(id) ON DELETE SET NULL;
ALTER TABLE public.mano_obra ADD COLUMN IF NOT EXISTS especialidad_id uuid REFERENCES public.especialidades_partida(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS subfamilia_id uuid REFERENCES public.subfamilias_insumo(id) ON DELETE SET NULL;
ALTER TABLE public.equipos_herramientas ADD COLUMN IF NOT EXISTS especialidad_id uuid REFERENCES public.especialidades_partida(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS subfamilia_id uuid REFERENCES public.subfamilias_insumo(id) ON DELETE SET NULL;
ALTER TABLE public.subcontratos ADD COLUMN IF NOT EXISTS especialidad_id uuid REFERENCES public.especialidades_partida(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS subfamilia_id uuid REFERENCES public.subfamilias_insumo(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_insumo_modular(_especialidad uuid, _tipo text, _subfamilia uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ee text; t text; ss text; pref text; n int;
BEGIN
  IF NOT public.es_personal(auth.uid()) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT codigo_modular INTO ee FROM especialidades_partida WHERE id = _especialidad;
  IF ee IS NULL THEN RAISE EXCEPTION 'La especialidad no tiene código de 2 dígitos.'; END IF;
  SELECT codigo INTO ss FROM subfamilias_insumo WHERE id = _subfamilia AND especialidad_id = _especialidad;
  IF ss IS NULL THEN RAISE EXCEPTION 'La subfamilia no pertenece a la especialidad.'; END IF;
  t := CASE _tipo WHEN 'materiales' THEN '1' WHEN 'mano_obra' THEN '2' WHEN 'equipos_herramientas' THEN '3' WHEN 'subcontratos' THEN '4' END;
  IF t IS NULL THEN RAISE EXCEPTION 'Tipo de insumo no válido.'; END IF;
  pref := ee || t || ss;
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
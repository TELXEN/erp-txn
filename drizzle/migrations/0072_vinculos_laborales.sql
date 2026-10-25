CREATE TABLE public.vinculos_laborales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE CASCADE,
  fecha_ingreso date NOT NULL,
  fecha_cese date,
  motivo text,
  liquidacion_id uuid REFERENCES public.beneficios_sociales(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vinculos_laborales TO authenticated;
GRANT ALL ON public.vinculos_laborales TO service_role;
ALTER TABLE public.vinculos_laborales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vinculos gestion" ON public.vinculos_laborales FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
INSERT INTO public.vinculos_laborales (trabajador_id, fecha_ingreso, fecha_cese)
  SELECT id, fecha_ingreso, fecha_cese FROM public.trabajadores WHERE fecha_ingreso IS NOT NULL;

CREATE OR REPLACE FUNCTION public.registrar_liquidacion(_trabajador uuid, _fecha_cese date, _datos jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  INSERT INTO beneficios_sociales SELECT * FROM jsonb_populate_record(NULL::beneficios_sociales,
    _datos || jsonb_build_object('id', gen_random_uuid(), 'tipo','Liquidación','anio',extract(year from _fecha_cese)::int,'periodo',_fecha_cese::text,'trabajador_id',_trabajador))
  RETURNING id INTO _id;
  UPDATE trabajadores SET activo=false, fecha_cese=_fecha_cese WHERE id=_trabajador;
  UPDATE vinculos_laborales SET fecha_cese=_fecha_cese, liquidacion_id=_id, motivo=coalesce(motivo,'Liquidación')
   WHERE id = (SELECT id FROM vinculos_laborales WHERE trabajador_id=_trabajador AND fecha_cese IS NULL ORDER BY fecha_ingreso DESC LIMIT 1);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.reingresar_trabajador(_trabajador uuid, _fecha date, _cargo text, _sueldo numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cese date;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  SELECT fecha_cese INTO _cese FROM trabajadores WHERE id=_trabajador;
  IF _cese IS NOT NULL AND _fecha <= _cese THEN RAISE EXCEPTION 'La nueva fecha de ingreso debe ser posterior al cese (%)', _cese; END IF;
  UPDATE trabajadores SET activo=true, fecha_cese=NULL, fecha_ingreso=_fecha,
    cargo=coalesce(nullif(_cargo,''),cargo), sueldo_base=coalesce(_sueldo,sueldo_base) WHERE id=_trabajador;
  INSERT INTO vinculos_laborales (trabajador_id, fecha_ingreso, motivo) VALUES (_trabajador, _fecha, 'Reingreso');
END $$;

CREATE OR REPLACE FUNCTION public.anular_cese(_trabajador uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _v uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'gerente') THEN RAISE EXCEPTION 'Solo Gerencia puede anular un cese'; END IF;
  IF EXISTS (SELECT 1 FROM beneficios_sociales WHERE trabajador_id=_trabajador AND tipo='Liquidación' AND estado_pago='Pagado') THEN
    RAISE EXCEPTION 'La liquidación ya está pagada; use Reingresar'; END IF;
  SELECT id INTO _v FROM vinculos_laborales WHERE trabajador_id=_trabajador ORDER BY fecha_ingreso DESC LIMIT 1;
  DELETE FROM beneficios_sociales WHERE trabajador_id=_trabajador AND tipo='Liquidación' AND estado_pago<>'Pagado'
    AND id IN (SELECT liquidacion_id FROM vinculos_laborales WHERE id=_v);
  UPDATE vinculos_laborales SET fecha_cese=NULL, liquidacion_id=NULL WHERE id=_v;
  UPDATE trabajadores SET activo=true, fecha_cese=NULL WHERE id=_trabajador;
END $$;
REVOKE EXECUTE ON FUNCTION public.registrar_liquidacion(uuid,date,jsonb), public.reingresar_trabajador(uuid,date,text,numeric), public.anular_cese(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.registrar_liquidacion(uuid,date,jsonb), public.reingresar_trabajador(uuid,date,text,numeric), public.anular_cese(uuid) TO authenticated;
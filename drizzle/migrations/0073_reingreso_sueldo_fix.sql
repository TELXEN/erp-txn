CREATE OR REPLACE FUNCTION public.reingresar_trabajador(_trabajador uuid, _fecha date, _cargo text, _sueldo numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cese date;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  SELECT fecha_cese INTO _cese FROM trabajadores WHERE id=_trabajador;
  IF _cese IS NOT NULL AND _fecha <= _cese THEN RAISE EXCEPTION 'La nueva fecha de ingreso debe ser posterior al cese (%)', _cese; END IF;
  UPDATE trabajadores SET activo=true, fecha_cese=NULL, fecha_ingreso=_fecha,
    cargo=coalesce(nullif(_cargo,''),cargo), sueldo_mensual=coalesce(_sueldo,sueldo_mensual) WHERE id=_trabajador;
  INSERT INTO vinculos_laborales (trabajador_id, fecha_ingreso, motivo) VALUES (_trabajador, _fecha, 'Reingreso');
END $$;
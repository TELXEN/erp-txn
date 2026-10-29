CREATE OR REPLACE FUNCTION public.mover_especialidad(_id uuid, _direccion integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $f$
DECLARE a record; b record; n_ins int; n_apu int;
BEGIN
  IF NOT coalesce(public.is_admin_o_gerente(auth.uid()),false) THEN RAISE EXCEPTION 'Solo Gerencia o Administración puede mover especialidades.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mover_especialidad'));
  SELECT * INTO a FROM especialidades_partida WHERE id=_id AND activo AND codigo_modular IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La especialidad ya no está disponible.'; END IF;
  IF _direccion < 0 THEN
    SELECT * INTO b FROM especialidades_partida WHERE activo AND codigo_modular IS NOT NULL AND codigo_modular < a.codigo_modular ORDER BY codigo_modular DESC LIMIT 1 FOR UPDATE;
  ELSE
    SELECT * INTO b FROM especialidades_partida WHERE activo AND codigo_modular IS NOT NULL AND codigo_modular > a.codigo_modular ORDER BY codigo_modular ASC LIMIT 1 FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'La especialidad ya está en el extremo.'; END IF;
  -- especialidades (temporales para evitar choques)
  UPDATE especialidades_partida SET codigo_modular=NULL, orden=-1 WHERE id=a.id;
  UPDATE especialidades_partida SET codigo=a.codigo, codigo_modular=a.codigo_modular, orden=a.orden WHERE id=b.id;
  UPDATE especialidades_partida SET codigo=b.codigo, codigo_modular=b.codigo_modular, orden=b.orden WHERE id=a.id;
  -- insumos (dígitos 2-3), activos e inactivos
  UPDATE insumos SET codigo = left(codigo,1) || CASE WHEN substr(codigo,2,2)=a.codigo_modular THEN b.codigo_modular ELSE a.codigo_modular END || substr(codigo,4)
   WHERE codigo ~ '^[0-9]{8}$' AND substr(codigo,2,2) IN (a.codigo_modular,b.codigo_modular);
  GET DIAGNOSTICS n_ins = ROW_COUNT;
  -- partidas del Banco APU (EE.xx.xx)
  UPDATE partidas_apu SET codigo_jerarquico = CASE WHEN left(codigo_jerarquico,2)=a.codigo_modular THEN b.codigo_modular ELSE a.codigo_modular END || substr(codigo_jerarquico,3)
   WHERE left(codigo_jerarquico,2) IN (a.codigo_modular,b.codigo_modular) AND substr(codigo_jerarquico,3,1) IN ('.','');
  GET DIAGNOSTICS n_apu = ROW_COUNT;
  RETURN jsonb_build_object('insumos',n_ins,'partidas',n_apu,'codigo',b.codigo_modular);
END $f$;
REVOKE ALL ON FUNCTION public.mover_especialidad(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mover_especialidad(uuid,integer) TO authenticated, service_role;
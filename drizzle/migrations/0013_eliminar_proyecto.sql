-- Baja de obras: solo Gerencia/Administración y solo cuando la obra no tiene
-- movimientos imputados (compras, facturas, tareos, etc.), porque borrarla
-- arrastraría ese historial con ella.
CREATE OR REPLACE FUNCTION public.eliminar_proyecto(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
DECLARE
  v_proyecto public.proyectos%ROWTYPE;
  v_n bigint;
  v_partidas bigint := 0;
  v_bloqueos text[] := '{}';
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'Solo la Gerencia o la Administración puede eliminar obras.';
  END IF;

  SELECT * INTO v_proyecto FROM public.proyectos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La obra ya no existe en la lista.';
  END IF;

  SELECT count(*) INTO v_partidas FROM public.partidas WHERE proyecto_id = _id;

  SELECT count(*) INTO v_n FROM public.gastos_directos WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' gasto(s) directo(s)'); END IF;
  SELECT count(*) INTO v_n FROM public.gastos_generales WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' gasto(s) general(es)'); END IF;
  SELECT count(*) INTO v_n FROM public.ventas WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' venta(s)'); END IF;
  SELECT count(*) INTO v_n FROM public.comprobantes_electronicos WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' comprobante(s) emitido(s)'); END IF;
  SELECT count(*) INTO v_n FROM public.ordenes_compra WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' orden(es) de compra'); END IF;
  SELECT count(*) INTO v_n FROM public.requerimientos WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' requerimiento(s)'); END IF;
  SELECT count(*) INTO v_n FROM public.tareos WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' tareo(s)'); END IF;
  SELECT count(*) INTO v_n FROM public.tareo_vehiculos WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' tareo(s) de vehículo'); END IF;
  SELECT count(*) INTO v_n FROM public.traslados_vehiculo WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' traslado(s) de vehículo'); END IF;
  SELECT count(*) INTO v_n FROM public.preliquidaciones WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' preliquidación(es)'); END IF;
  SELECT count(*) INTO v_n FROM public.importaciones WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' importación(es)'); END IF;
  SELECT count(*) INTO v_n FROM public.recibos_honorarios WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' recibo(s) por honorarios'); END IF;
  SELECT count(*) INTO v_n FROM public.movimientos_almacen WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' movimiento(s) de almacén'); END IF;
  SELECT count(*) INTO v_n FROM public.cajas_chicas WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' caja(s) chica(s)'); END IF;
  SELECT count(*) INTO v_n FROM public.solicitudes_desbloqueo WHERE proyecto_id = _id;
  IF v_n > 0 THEN v_bloqueos := v_bloqueos || (v_n::text || ' solicitud(es) de desbloqueo'); END IF;

  IF array_length(v_bloqueos, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede eliminar «%»: tiene %. Para quitarla de la lista sin perder historial, archívela.',
      coalesce(v_proyecto.codigo, v_proyecto.nombre), array_to_string(v_bloqueos, ', ');
  END IF;

  DELETE FROM public.proyectos WHERE id = _id;
  RETURN jsonb_build_object('codigo', v_proyecto.codigo, 'nombre', v_proyecto.nombre, 'partidas', v_partidas);
END;
$fn$;

REVOKE ALL ON FUNCTION public.eliminar_proyecto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_proyecto(uuid) TO authenticated, service_role;
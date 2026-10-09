CREATE OR REPLACE FUNCTION public.integrar_importacion(_id uuid, _movimientos jsonb, _gastos_directos jsonb, _gasto_general jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE _integrado boolean;
BEGIN
  SELECT integrado INTO _integrado FROM public.importaciones WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Importación no encontrada'; END IF;
  IF _integrado THEN RAISE EXCEPTION 'Esta importación ya fue integrada.'; END IF;

  INSERT INTO public.movimientos_almacen (fecha, tipo, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, documento, observacion)
  SELECT fecha, tipo, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, documento, observacion
  FROM jsonb_populate_recordset(NULL::public.movimientos_almacen, _movimientos);

  INSERT INTO public.gastos_directos (proyecto_id, partida_id, rubro, descripcion, proveedor, proveedor_id, cantidad, precio_unitario, monto, moneda, tipo_cambio, monto_soles, comprobante, fecha, condicion_pago, dias_credito, fecha_vencimiento, estado_pago, numero_operacion)
  SELECT proyecto_id, partida_id, rubro, descripcion, proveedor, proveedor_id, cantidad, precio_unitario, monto, moneda, tipo_cambio, monto_soles, comprobante, fecha, condicion_pago, dias_credito, fecha_vencimiento, estado_pago, numero_operacion
  FROM jsonb_populate_recordset(NULL::public.gastos_directos, _gastos_directos);

  IF _gasto_general IS NOT NULL AND _gasto_general <> 'null'::jsonb THEN
    INSERT INTO public.gastos_generales (proyecto_id, categoria, descripcion, proveedor, proveedor_id, monto, moneda, tipo_cambio, monto_soles, fecha, comprobante, condicion_pago, dias_credito, fecha_vencimiento, estado_pago, numero_operacion)
    SELECT proyecto_id, categoria, descripcion, proveedor, proveedor_id, monto, moneda, tipo_cambio, monto_soles, fecha, comprobante, condicion_pago, dias_credito, fecha_vencimiento, estado_pago, numero_operacion
    FROM jsonb_populate_record(NULL::public.gastos_generales, _gasto_general);
  END IF;

  UPDATE public.importaciones SET integrado = true, fecha_integracion = (now() AT TIME ZONE 'America/Lima')::date, estado = 'Liquidado' WHERE id = _id;
END;
$$;
REVOKE ALL ON FUNCTION public.integrar_importacion(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.integrar_importacion(uuid, jsonb, jsonb, jsonb) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.recepcionar_orden_obra(_orden uuid, _items jsonb, _fecha date, _obs text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  oc record; it jsonb; li record; ya numeric; q numeric; pendiente boolean; falta boolean;
BEGIN
  IF NOT public.es_personal(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  SELECT * INTO oc FROM public.ordenes_compra WHERE id = _orden FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
  IF oc.estado NOT IN ('Enviado a obra','Recibida parcial') THEN
    RAISE EXCEPTION 'La orden % aún no fue enviada a obra', oc.codigo;
  END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(_items,'[]'::jsonb)) LOOP
    q := coalesce((it->>'cantidad')::numeric, 0);
    CONTINUE WHEN q <= 0;
    SELECT * INTO li FROM public.orden_compra_items WHERE id = (it->>'orden_item_id')::uuid AND orden_id = _orden;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ítem no pertenece a la orden'; END IF;
    SELECT coalesce(sum(cantidad),0) INTO ya FROM public.movimientos_almacen WHERE orden_item_id = li.id AND tipo = 'Ingreso';
    IF ya + q > li.cantidad + 0.0001 THEN
      RAISE EXCEPTION 'La recepción de «%» excede lo ordenado (saldo %)', li.descripcion, round(li.cantidad - ya, 4);
    END IF;
    INSERT INTO public.movimientos_almacen (fecha, tipo, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, orden_item_id, documento, observacion)
    VALUES (coalesce(_fecha, CURRENT_DATE), 'Ingreso', oc.proyecto_id, li.insumo_id, li.descripcion, li.unidad, q, li.precio_unitario, li.id, oc.codigo, coalesce(nullif(_obs,''),'Recepción en obra'));
  END LOOP;
  SELECT EXISTS (
    SELECT 1 FROM public.orden_compra_items i
    WHERE i.orden_id = _orden AND i.cantidad - coalesce((SELECT sum(m.cantidad) FROM public.movimientos_almacen m WHERE m.orden_item_id = i.id AND m.tipo='Ingreso'),0) > 0.0001
  ) INTO pendiente;
  UPDATE public.ordenes_compra SET estado = CASE WHEN pendiente THEN 'Recibida parcial' ELSE 'Recibida' END WHERE id = _orden;
  IF oc.requerimiento_id IS NOT NULL THEN
    -- Recibido solo cuando cada ítem del requerimiento llegó completo a obra.
    SELECT EXISTS (
      SELECT 1 FROM public.requerimiento_items ri
      WHERE ri.requerimiento_id = oc.requerimiento_id
        AND ri.cantidad - coalesce((
          SELECT sum(m.cantidad) FROM public.movimientos_almacen m
          JOIN public.orden_compra_items oi ON oi.id = m.orden_item_id
          JOIN public.ordenes_compra o2 ON o2.id = oi.orden_id AND o2.estado <> 'Anulada'
          WHERE oi.requerimiento_item_id = ri.id AND m.tipo = 'Ingreso'), 0) > 0.0001
    ) INTO falta;
    UPDATE public.requerimientos SET estado = CASE WHEN falta THEN 'Recibido parcial' ELSE 'Recibido' END
    WHERE id = oc.requerimiento_id;
  END IF;
END $$;
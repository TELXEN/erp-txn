ALTER TABLE public.ordenes_compra ADD COLUMN IF NOT EXISTS almacen_destino_id uuid NULL REFERENCES public.almacenes(id);

CREATE OR REPLACE FUNCTION public.cambiar_destino_orden(_orden uuid, _almacen uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE oc record; al record; quien text;
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Solo Gerencia o Administración puede cambiar el destino.'; END IF;
  IF coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'Indica el motivo del cambio.'; END IF;
  SELECT * INTO oc FROM public.ordenes_compra WHERE id = _orden FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
  IF oc.estado = 'Anulada' THEN RAISE EXCEPTION 'La orden está anulada.'; END IF;
  IF EXISTS (SELECT 1 FROM public.movimientos_almacen m JOIN public.orden_compra_items i ON i.id = m.orden_item_id WHERE i.orden_id = _orden AND m.tipo = 'Ingreso') THEN
    RAISE EXCEPTION 'La orden ya tiene recepciones; mueve el material con «Transferir entre almacenes».';
  END IF;
  SELECT * INTO al FROM public.almacenes WHERE id = _almacen;
  IF NOT FOUND OR NOT al.activo THEN RAISE EXCEPTION 'Elige un almacén activo.'; END IF;
  SELECT coalesce(nullif(nombre,''), email) INTO quien FROM public.profiles WHERE id = auth.uid();
  UPDATE public.ordenes_compra SET almacen_destino_id = _almacen,
    observacion = trim(both E'\n' from coalesce(observacion,'') || E'\n' || to_char(now() AT TIME ZONE 'America/Lima','DD/MM/YYYY') || ' · ' || coalesce(quien,'Usuario') || ': destino cambiado a ' || al.nombre || ' — ' || trim(_motivo))
  WHERE id = _orden;
END $$;
REVOKE ALL ON FUNCTION public.cambiar_destino_orden(uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_destino_orden(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.recepcionar_orden_obra(_orden uuid, _items jsonb, _fecha date, _obs text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  oc record; it jsonb; li record; ya numeric; q numeric; pendiente boolean; falta boolean; destino uuid;
BEGIN
  SELECT * INTO oc FROM public.ordenes_compra WHERE id = _orden FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
  destino := oc.proyecto_id;
  IF oc.almacen_destino_id IS NOT NULL THEN
    SELECT proyecto_id INTO destino FROM public.almacenes WHERE id = oc.almacen_destino_id;
  END IF;
  IF NOT public.puede_recibir_almacen(auth.uid(), destino) THEN
    RAISE EXCEPTION 'Solo el encargado del almacén de destino puede recepcionar esta orden.';
  END IF;
  IF oc.estado NOT IN ('Emitida','Enviado a obra','Recibida parcial') THEN
    RAISE EXCEPTION 'La orden % no está pendiente de recepción', oc.codigo;
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
    INSERT INTO public.movimientos_almacen (fecha, tipo, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, orden_item_id, documento, observacion, motivo, recibido_por, recibido_en)
    VALUES (coalesce(_fecha, CURRENT_DATE), 'Ingreso', destino, li.insumo_id, li.descripcion, li.unidad, q, li.precio_unitario, li.id, oc.codigo, coalesce(nullif(_obs,''),'Recepción de compra'), 'Compra', auth.uid(), now());
  END LOOP;
  SELECT EXISTS (
    SELECT 1 FROM public.orden_compra_items i
    WHERE i.orden_id = _orden AND i.cantidad - coalesce((SELECT sum(m.cantidad) FROM public.movimientos_almacen m WHERE m.orden_item_id = i.id AND m.tipo='Ingreso'),0) > 0.0001
  ) INTO pendiente;
  UPDATE public.ordenes_compra SET estado = CASE WHEN pendiente THEN 'Recibida parcial' ELSE 'Recibida' END WHERE id = _orden;
  IF oc.requerimiento_id IS NOT NULL THEN
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
END $function$;
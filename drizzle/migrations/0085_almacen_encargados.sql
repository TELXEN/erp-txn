CREATE TABLE public.almacen_encargados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  almacen_id uuid NOT NULL REFERENCES public.almacenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (almacen_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.almacen_encargados TO authenticated;
GRANT ALL ON public.almacen_encargados TO service_role;
ALTER TABLE public.almacen_encargados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee encargados" ON public.almacen_encargados FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Gerente gestiona encargados" ON public.almacen_encargados FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));

ALTER TABLE public.movimientos_almacen ADD COLUMN recibido_por uuid, ADD COLUMN recibido_en timestamptz;

CREATE OR REPLACE FUNCTION public.es_encargado_almacen(_user uuid, _proyecto uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.almacen_encargados e JOIN public.almacenes a ON a.id = e.almacen_id
                 WHERE e.user_id = _user AND a.proyecto_id IS NOT DISTINCT FROM _proyecto)
$$;

-- Central: gerente o encargado. Obra: encargado; si la obra no tiene encargados, el gerente.
CREATE OR REPLACE FUNCTION public.puede_recibir_almacen(_user uuid, _proyecto uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.es_encargado_almacen(_user, _proyecto)
    OR (public.has_role(_user,'gerente') AND (_proyecto IS NULL OR NOT EXISTS (
         SELECT 1 FROM public.almacen_encargados e JOIN public.almacenes a ON a.id = e.almacen_id WHERE a.proyecto_id = _proyecto)))
$$;

CREATE POLICY "Encargados leen sus almacenes" ON public.almacenes FOR SELECT TO authenticated
  USING (public.es_encargado_almacen(auth.uid(), proyecto_id));
CREATE POLICY "Encargados leen sus movimientos" ON public.movimientos_almacen FOR SELECT TO authenticated
  USING (public.es_encargado_almacen(auth.uid(), proyecto_id));
CREATE POLICY "Encargados registran consumo" ON public.movimientos_almacen FOR INSERT TO authenticated
  WITH CHECK (tipo = 'Salida' AND motivo = 'Consumo' AND proyecto_id IS NOT NULL AND public.es_encargado_almacen(auth.uid(), proyecto_id));

CREATE OR REPLACE FUNCTION public.recibir_transferencia(_transferencia uuid, _fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dest uuid; _hay boolean;
BEGIN
  SELECT true, proyecto_id INTO _hay, _dest FROM public.movimientos_almacen
   WHERE transferencia_id=_transferencia AND tipo='Ingreso' AND estado='En tránsito' LIMIT 1;
  IF _hay IS NULL THEN RAISE EXCEPTION 'La transferencia no está en tránsito.'; END IF;
  IF NOT public.puede_recibir_almacen(auth.uid(), _dest) THEN
    RAISE EXCEPTION 'Solo el encargado del almacén de destino puede recibir esta transferencia.';
  END IF;
  UPDATE public.movimientos_almacen SET estado='Recibido', fecha=coalesce(_fecha, fecha), recibido_por=auth.uid(), recibido_en=now()
  WHERE transferencia_id=_transferencia AND tipo='Ingreso' AND estado='En tránsito';
END $$;

CREATE OR REPLACE FUNCTION public.recepcionar_orden_obra(_orden uuid, _items jsonb, _fecha date, _obs text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  oc record; it jsonb; li record; ya numeric; q numeric; pendiente boolean; falta boolean;
BEGIN
  SELECT * INTO oc FROM public.ordenes_compra WHERE id = _orden FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada'; END IF;
  IF NOT public.puede_recibir_almacen(auth.uid(), oc.proyecto_id) THEN
    RAISE EXCEPTION 'Solo el encargado del almacén de la obra puede recepcionar esta orden.';
  END IF;
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
    INSERT INTO public.movimientos_almacen (fecha, tipo, proyecto_id, insumo_id, descripcion, unidad, cantidad, costo_unitario, orden_item_id, documento, observacion, motivo, recibido_por, recibido_en)
    VALUES (coalesce(_fecha, CURRENT_DATE), 'Ingreso', oc.proyecto_id, li.insumo_id, li.descripcion, li.unidad, q, li.precio_unitario, li.id, oc.codigo, coalesce(nullif(_obs,''),'Recepción en obra'), 'Compra', auth.uid(), now());
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
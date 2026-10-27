CREATE POLICY "Personal lee almacenes" ON public.almacenes FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE OR REPLACE FUNCTION public.transferir_almacen(_origen uuid, _destino uuid, _items jsonb, _fecha date, _documento text, _obs text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _t uuid := gen_random_uuid(); _it jsonb; _ins record; _cant numeric; _disp numeric; _cu numeric;
BEGIN
  IF NOT (public.is_admin_o_gerente(auth.uid()) OR public.es_encargado_almacen(auth.uid(), _origen)) THEN
    RAISE EXCEPTION 'Solo el Gerente o el encargado del almacén de origen puede transferir.';
  END IF;
  IF _origen IS NOT DISTINCT FROM _destino THEN RAISE EXCEPTION 'El almacén de origen y destino deben ser distintos.'; END IF;
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Agrega al menos un insumo.'; END IF;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _cant := (_it->>'cantidad')::numeric;
    IF _cant IS NULL OR _cant <= 0 THEN RAISE EXCEPTION 'Cantidad inválida.'; END IF;
    SELECT id, nombre, unidad INTO _ins FROM public.insumos WHERE id = (_it->>'insumo_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo no encontrado.'; END IF;
    _disp := public.stock_insumo_almacen(_origen, _ins.id);
    IF _cant > _disp + 0.0001 THEN
      RAISE EXCEPTION 'Stock insuficiente de % en el almacén de origen: disponible %.', _ins.nombre, round(_disp,2);
    END IF;
    _cu := public.costo_promedio_almacen(_origen, _ins.id);
    INSERT INTO public.movimientos_almacen (fecha,tipo,proyecto_id,insumo_id,descripcion,unidad,cantidad,costo_unitario,documento,observacion,motivo,estado,transferencia_id)
    VALUES (_fecha,'Salida',_origen,_ins.id,_ins.nombre,_ins.unidad,_cant,_cu,coalesce(_documento,''),coalesce(_obs,''),'Transferencia','Recibido',_t),
           (_fecha,'Ingreso',_destino,_ins.id,_ins.nombre,_ins.unidad,_cant,_cu,coalesce(_documento,''),coalesce(_obs,''),'Transferencia','En tránsito',_t);
  END LOOP;
  RETURN _t;
END $function$;
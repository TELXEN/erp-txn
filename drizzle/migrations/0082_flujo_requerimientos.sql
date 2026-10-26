ALTER TABLE public.requerimientos
  ADD COLUMN IF NOT EXISTS clase text NOT NULL DEFAULT 'materiales',
  ADD COLUMN IF NOT EXISTS aprobado_por uuid,
  ADD COLUMN IF NOT EXISTS aprobado_en timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tdr jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.requerimientos SET estado = 'Enviado a Gerencia' WHERE estado = 'Pendiente';
UPDATE public.requerimientos SET estado = 'Orden emitida' WHERE estado = 'Atendido';
ALTER TABLE public.requerimientos ALTER COLUMN estado SET DEFAULT 'Enviado a Gerencia';

DROP POLICY IF EXISTS "Gestionar requerimientos" ON public.requerimientos;
DROP POLICY IF EXISTS "Eliminar requerimientos" ON public.requerimientos;
CREATE POLICY "Gestionar requerimientos" ON public.requerimientos FOR UPDATE TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()) OR (creado_por = auth.uid() AND estado IN ('Borrador','Enviado a Gerencia','Rechazado')));
CREATE POLICY "Eliminar requerimientos" ON public.requerimientos FOR DELETE TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()) OR (creado_por = auth.uid() AND estado IN ('Borrador','Enviado a Gerencia','Rechazado')));
DROP POLICY IF EXISTS "Gestionar items" ON public.requerimiento_items;
CREATE POLICY "Gestionar items" ON public.requerimiento_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimientos r WHERE r.id = requerimiento_items.requerimiento_id AND (public.is_admin_o_gerente(auth.uid()) OR (r.creado_por = auth.uid() AND r.estado IN ('Borrador','Enviado a Gerencia')))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.requerimientos r WHERE r.id = requerimiento_items.requerimiento_id AND (public.is_admin_o_gerente(auth.uid()) OR (r.creado_por = auth.uid() AND r.estado IN ('Borrador','Enviado a Gerencia')))));

CREATE OR REPLACE FUNCTION public.validar_estado_requerimiento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF OLD.estado IN ('Enviado a Gerencia','Borrador') AND NEW.estado IN ('Aprobado','Rechazado') THEN
      IF NOT public.has_role(auth.uid(),'gerente') THEN
        RAISE EXCEPTION 'Solo Gerencia puede aprobar o rechazar requerimientos';
      END IF;
      NEW.aprobado_por := auth.uid();
      NEW.aprobado_en := now();
    ELSIF NEW.estado IN ('Aprobado','Rechazado') AND OLD.estado NOT IN ('Aprobado','Rechazado','En cotización') THEN
      IF NOT public.has_role(auth.uid(),'gerente') THEN
        RAISE EXCEPTION 'Solo Gerencia puede aprobar o rechazar requerimientos';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_estado_requerimiento ON public.requerimientos;
CREATE TRIGGER validar_estado_requerimiento BEFORE UPDATE ON public.requerimientos
  FOR EACH ROW EXECUTE FUNCTION public.validar_estado_requerimiento();

CREATE TABLE public.solicitudes_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requerimiento_id uuid NOT NULL REFERENCES public.requerimientos(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.terceros(id),
  codigo text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'Solicitada',
  moneda text NOT NULL DEFAULT 'PEN',
  plazo_entrega text NOT NULL DEFAULT '',
  condiciones text NOT NULL DEFAULT '',
  observacion text NOT NULL DEFAULT '',
  orden_id uuid REFERENCES public.ordenes_compra(id) ON DELETE SET NULL,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_cotizacion TO authenticated;
GRANT ALL ON public.solicitudes_cotizacion TO service_role;
ALTER TABLE public.solicitudes_cotizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver solicitudes cotizacion" ON public.solicitudes_cotizacion FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Gestionar solicitudes cotizacion" ON public.solicitudes_cotizacion FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.solicitud_cotizacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES public.solicitudes_cotizacion(id) ON DELETE CASCADE,
  requerimiento_item_id uuid NOT NULL REFERENCES public.requerimiento_items(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitud_cotizacion_items TO authenticated;
GRANT ALL ON public.solicitud_cotizacion_items TO service_role;
ALTER TABLE public.solicitud_cotizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver items solicitud" ON public.solicitud_cotizacion_items FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Gestionar items solicitud" ON public.solicitud_cotizacion_items FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE POLICY "Personal ve OC" ON public.ordenes_compra FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Personal ve items OC" ON public.orden_compra_items FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Personal ve movimientos" ON public.movimientos_almacen FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));

-- Recepción en obra: ingreso físico al almacén de la obra, sin exceder lo ordenado.
CREATE OR REPLACE FUNCTION public.recepcionar_orden_obra(_orden uuid, _items jsonb, _fecha date, _obs text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  oc record; it jsonb; li record; ya numeric; q numeric; pendiente boolean;
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
    UPDATE public.requerimientos r SET estado = CASE
      WHEN EXISTS (SELECT 1 FROM public.ordenes_compra o WHERE o.requerimiento_id = r.id AND o.estado NOT IN ('Recibida','Anulada')) THEN 'Recibido parcial'
      ELSE 'Recibido' END
    WHERE r.id = oc.requerimiento_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.recepcionar_orden_obra(uuid, jsonb, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recepcionar_orden_obra(uuid, jsonb, date, text) TO authenticated;
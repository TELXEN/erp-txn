CREATE TABLE public.ordenes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  proveedor_id uuid REFERENCES public.terceros(id) ON DELETE SET NULL,
  requerimiento_id uuid REFERENCES public.requerimientos(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega date,
  estado text NOT NULL DEFAULT 'Emitida',
  condicion_pago text NOT NULL DEFAULT 'Contado',
  observacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.orden_compra_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL,
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.movimientos_almacen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL CHECK (tipo IN ('Ingreso','Salida')),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL,
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_unitario numeric NOT NULL DEFAULT 0,
  orden_item_id uuid REFERENCES public.orden_compra_items(id) ON DELETE SET NULL,
  documento text NOT NULL DEFAULT '',
  observacion text NOT NULL DEFAULT '',
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordenes_compra, public.orden_compra_items, public.movimientos_almacen TO authenticated;
GRANT ALL ON public.ordenes_compra, public.orden_compra_items, public.movimientos_almacen TO service_role;
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_almacen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Gerente gestionan OC" ON public.ordenes_compra FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin/Gerente gestionan items OC" ON public.orden_compra_items FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin/Gerente gestionan almacen" ON public.movimientos_almacen FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_ordenes_compra_updated_at BEFORE UPDATE ON public.ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_oc_items_orden ON public.orden_compra_items(orden_id);
CREATE INDEX idx_mov_proyecto ON public.movimientos_almacen(proyecto_id);
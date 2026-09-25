CREATE TABLE public.importaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  proveedor_id uuid REFERENCES public.terceros(id),
  proveedor_extranjero text NOT NULL DEFAULT '',
  pais_origen text NOT NULL DEFAULT '',
  proyecto_id uuid REFERENCES public.proyectos(id),
  orden_id uuid REFERENCES public.ordenes_compra(id) ON DELETE SET NULL,
  tipo_despacho text NOT NULL DEFAULT 'Courier',
  transportista text NOT NULL DEFAULT '',
  tracking text NOT NULL DEFAULT '',
  incoterm text NOT NULL DEFAULT 'FOB',
  moneda public.moneda NOT NULL DEFAULT 'USD',
  fecha_pedido date NOT NULL DEFAULT current_date,
  fecha_embarque date,
  fecha_arribo date,
  estado text NOT NULL DEFAULT 'En tránsito',
  observacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT importaciones_estado_chk CHECK (estado IN ('En tránsito','En aduana','Nacionalizado','Liquidado','Anulado')),
  CONSTRAINT importaciones_despacho_chk CHECK (tipo_despacho IN ('Courier','DSI','Agente de aduana'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importaciones TO authenticated;
GRANT ALL ON public.importaciones TO service_role;
ALTER TABLE public.importaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Gerente gestionan importaciones" ON public.importaciones FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_importaciones_updated_at BEFORE UPDATE ON public.importaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.importacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacion_id uuid NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id),
  descripcion text NOT NULL,
  partida_arancelaria text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'und',
  cantidad numeric NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_fob numeric NOT NULL DEFAULT 0 CHECK (precio_fob >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacion_items TO authenticated;
GRANT ALL ON public.importacion_items TO service_role;
ALTER TABLE public.importacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Gerente gestionan items de importacion" ON public.importacion_items FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
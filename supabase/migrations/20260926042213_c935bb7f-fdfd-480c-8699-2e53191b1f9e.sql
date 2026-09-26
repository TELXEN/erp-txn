CREATE TABLE public.preliquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.terceros(id),
  concepto text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT current_date,
  moneda public.moneda NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric NOT NULL DEFAULT 1,
  pct_detraccion numeric NOT NULL DEFAULT 4,
  condicion_pago text NOT NULL DEFAULT 'Crédito',
  dias_credito integer NOT NULL DEFAULT 30,
  fecha_vencimiento date,
  estado text NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador','Enviada','Aprobada','Observada','Facturada')),
  observacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preliquidaciones TO authenticated;
GRANT ALL ON public.preliquidaciones TO service_role;
ALTER TABLE public.preliquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Gerente gestionan preliquidaciones" ON public.preliquidaciones FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_preliquidaciones_updated_at BEFORE UPDATE ON public.preliquidaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.preliquidacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preliquidacion_id uuid NOT NULL REFERENCES public.preliquidaciones(id) ON DELETE CASCADE,
  descripcion text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'glb',
  cantidad numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preliquidacion_items TO authenticated;
GRANT ALL ON public.preliquidacion_items TO service_role;
ALTER TABLE public.preliquidacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Gerente gestionan items de preliquidacion" ON public.preliquidacion_items FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

ALTER TABLE public.ventas
  ADD COLUMN preliquidacion_id uuid REFERENCES public.preliquidaciones(id) ON DELETE SET NULL,
  ADD COLUMN igv numeric NOT NULL DEFAULT 0,
  ADD COLUMN total numeric NOT NULL DEFAULT 0,
  ADD COLUMN pct_detraccion numeric NOT NULL DEFAULT 0,
  ADD COLUMN monto_detraccion numeric NOT NULL DEFAULT 0,
  ADD COLUMN detraccion_estado text NOT NULL DEFAULT 'No aplica',
  ADD COLUMN detraccion_fecha date,
  ADD COLUMN detraccion_constancia text NOT NULL DEFAULT '';
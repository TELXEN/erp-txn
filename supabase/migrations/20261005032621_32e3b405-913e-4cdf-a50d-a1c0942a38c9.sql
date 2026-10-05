CREATE TABLE public.comprobantes_recibidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  ruc_emisor text NOT NULL,
  razon_emisor text NOT NULL DEFAULT '',
  tipo text NOT NULL,
  serie text NOT NULL,
  numero text NOT NULL,
  fecha date,
  moneda text NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric NOT NULL DEFAULT 1,
  base numeric NOT NULL DEFAULT 0,
  igv numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  xml_path text, pdf_path text, cdr_path text,
  estado_descarga text NOT NULL DEFAULT 'Pendiente',
  error text,
  registrado_en text,
  registro_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ruc_emisor, tipo, serie, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobantes_recibidos TO authenticated;
GRANT ALL ON public.comprobantes_recibidos TO service_role;
ALTER TABLE public.comprobantes_recibidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/gerente gestionan recibidos" ON public.comprobantes_recibidos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER trg_recibidos_upd BEFORE UPDATE ON public.comprobantes_recibidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.comprobantes_recibidos_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.comprobantes_recibidos(id) ON DELETE CASCADE,
  orden int NOT NULL DEFAULT 0,
  descripcion text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobantes_recibidos_items TO authenticated;
GRANT ALL ON public.comprobantes_recibidos_items TO service_role;
ALTER TABLE public.comprobantes_recibidos_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/gerente gestionan items recibidos" ON public.comprobantes_recibidos_items FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

INSERT INTO storage.objects (bucket_id, name) SELECT 'x','x' WHERE false;
CREATE POLICY "Admin/gerente leen comprobantes compra" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes-compra' AND public.is_admin_o_gerente(auth.uid()));
CREATE TABLE public.marcas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marcas TO authenticated;
GRANT ALL ON public.marcas TO service_role;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leen marcas" ON public.marcas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y gerente gestionan marcas" ON public.marcas FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_marcas_updated_at BEFORE UPDATE ON public.marcas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.insumos ADD COLUMN marca_id uuid REFERENCES public.marcas(id) ON DELETE SET NULL;
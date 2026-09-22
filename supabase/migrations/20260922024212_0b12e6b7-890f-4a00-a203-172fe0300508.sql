CREATE TABLE public.empresa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social text NOT NULL DEFAULT '',
  ruc text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  web text NOT NULL DEFAULT '',
  color_marca text NOT NULL DEFAULT '#1F6F54',
  logo_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_config TO authenticated;
GRANT ALL ON public.empresa_config TO service_role;

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa config visible" ON public.empresa_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "empresa config gestion" ON public.empresa_config FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_empresa_config_updated_at BEFORE UPDATE ON public.empresa_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

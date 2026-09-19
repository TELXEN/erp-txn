CREATE TABLE public.terceros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento text NOT NULL DEFAULT 'RUC' CHECK (tipo_documento IN ('RUC','DNI','CE','OTRO')),
  numero_documento text NOT NULL DEFAULT 'PENDIENTE',
  razon_social text NOT NULL CHECK (char_length(razon_social) BETWEEN 1 AND 160),
  es_cliente boolean NOT NULL DEFAULT false,
  es_proveedor boolean NOT NULL DEFAULT false,
  direccion text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  condicion_pago text NOT NULL DEFAULT 'Contado' CHECK (condicion_pago IN ('Contado','Credito 15 dias','Credito 30 dias','Credito 60 dias')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_documento, numero_documento)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros TO authenticated;
GRANT ALL ON public.terceros TO service_role;
ALTER TABLE public.terceros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terceros visibles" ON public.terceros FOR SELECT TO authenticated USING (true);
CREATE POLICY "terceros gestion" ON public.terceros FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE CHECK (char_length(nombre) BETWEEN 1 AND 120),
  monedas text NOT NULL DEFAULT 'PEN' CHECK (monedas IN ('PEN','USD','PEN/USD')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bancos TO authenticated;
GRANT ALL ON public.bancos TO service_role;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bancos visibles" ON public.bancos FOR SELECT TO authenticated USING (true);
CREATE POLICY "bancos gestion" ON public.bancos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_terceros_updated_at BEFORE UPDATE ON public.terceros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bancos_updated_at BEFORE UPDATE ON public.bancos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
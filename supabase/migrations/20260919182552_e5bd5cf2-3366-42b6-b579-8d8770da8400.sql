CREATE TABLE public.categorias_financieras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('Costo', 'Ingreso')),
  codigo text NOT NULL,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, codigo),
  CHECK (length(btrim(codigo)) BETWEEN 1 AND 30),
  CHECK (length(btrim(nombre)) BETWEEN 1 AND 120)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_financieras TO authenticated;
GRANT ALL ON public.categorias_financieras TO service_role;
ALTER TABLE public.categorias_financieras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias financieras visibles" ON public.categorias_financieras FOR SELECT TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "categorias financieras gestion" ON public.categorias_financieras FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_categorias_financieras_updated_at BEFORE UPDATE ON public.categorias_financieras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.centros_costos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(codigo)) BETWEEN 1 AND 30),
  CHECK (length(btrim(nombre)) BETWEEN 1 AND 120)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_costos TO authenticated;
GRANT ALL ON public.centros_costos TO service_role;
ALTER TABLE public.centros_costos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centros costos visibles" ON public.centros_costos FOR SELECT TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "centros costos gestion" ON public.centros_costos FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_centros_costos_updated_at BEFORE UPDATE ON public.centros_costos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
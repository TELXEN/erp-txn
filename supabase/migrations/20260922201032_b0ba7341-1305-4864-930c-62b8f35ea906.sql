CREATE TABLE public.categorias_gasto_general (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_gasto_general TO authenticated;
GRANT ALL ON public.categorias_gasto_general TO service_role;

ALTER TABLE public.categorias_gasto_general ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias gasto general visibles" ON public.categorias_gasto_general
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categorias gasto general gestion" ON public.categorias_gasto_general
  FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_categorias_gasto_general_updated_at
  BEFORE UPDATE ON public.categorias_gasto_general
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categorias_gasto_general (nombre, orden) VALUES
  ('Alquileres y Campamento', 1),
  ('Servicios y Suministros', 2),
  ('Seguridad y SSOMA', 3),
  ('Viáticos y Movilidad', 4),
  ('Seguros y Fianzas', 5),
  ('Servicios Profesionales', 6);

ALTER TABLE public.gastos_generales
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Servicios y Suministros';
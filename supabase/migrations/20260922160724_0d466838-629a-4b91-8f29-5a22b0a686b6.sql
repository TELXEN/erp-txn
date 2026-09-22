ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS tipo_presupuesto text NOT NULL DEFAULT 'Contractual';

CREATE TABLE public.tipos_presupuesto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  es_contractual boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_presupuesto TO authenticated;
GRANT ALL ON public.tipos_presupuesto TO service_role;

ALTER TABLE public.tipos_presupuesto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tipos presupuesto visibles" ON public.tipos_presupuesto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tipos presupuesto gestion" ON public.tipos_presupuesto
  FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_tipos_presupuesto_updated_at
  BEFORE UPDATE ON public.tipos_presupuesto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tipos_presupuesto (nombre, es_contractual, orden) VALUES
  ('Contractual', true, 1),
  ('Adicional 01', false, 2),
  ('Adicional 02', false, 3),
  ('Adicional 03', false, 4),
  ('Mayor Metrado', false, 5),
  ('Deductivo', false, 6);
CREATE TABLE public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  clasificacion text NOT NULL DEFAULT 'Directo' CHECK (clasificacion IN ('Directo','Indirecto')),
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;
GRANT ALL ON public.cargos TO service_role;

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargos visibles" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargos gestion" ON public.cargos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_cargos_updated_at BEFORE UPDATE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cargos (nombre, clasificacion, orden) VALUES
  ('RESIDENTE','Indirecto',1),
  ('SUPERVISOR','Indirecto',2),
  ('SEGURIDAD','Indirecto',3),
  ('TÉCNICO ELECTRICISTA','Directo',4),
  ('TÉCNICO INSTRUMENTISTA','Directo',5),
  ('SOLDADOR','Directo',6),
  ('AYUDANTE','Directo',7),
  ('CONDUCTOR CAMIONETA','Directo',8);
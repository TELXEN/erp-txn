CREATE TABLE public.prioridades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prioridades TO authenticated;
GRANT ALL ON public.prioridades TO service_role;
ALTER TABLE public.prioridades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leen prioridades" ON public.prioridades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y gerente gestionan prioridades" ON public.prioridades FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_prioridades_updated_at BEFORE UPDATE ON public.prioridades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.prioridades (nombre, orden) VALUES ('Alta',1),('Media',2),('Baja',3);
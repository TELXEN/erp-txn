CREATE TABLE public.rubros_ingreso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text NOT NULL DEFAULT '',
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rubros_ingreso TO authenticated;
GRANT ALL ON public.rubros_ingreso TO service_role;
ALTER TABLE public.rubros_ingreso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leen rubros" ON public.rubros_ingreso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Gerente gestionan rubros" ON public.rubros_ingreso FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER trg_rubros_ingreso_updated BEFORE UPDATE ON public.rubros_ingreso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.rubros_ingreso (nombre, orden) VALUES
 ('Proyectos / Obras',1),('Consultorías',2),('Alquiler de equipos',3),('Servicios',4),('Otros ingresos',5);
ALTER TABLE public.ventas ADD COLUMN rubro text NOT NULL DEFAULT 'Proyectos / Obras';
ALTER TABLE public.ventas ALTER COLUMN proyecto_id DROP NOT NULL;
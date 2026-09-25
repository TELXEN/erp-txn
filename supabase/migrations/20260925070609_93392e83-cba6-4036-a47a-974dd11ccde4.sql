CREATE TABLE public.requerimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  codigo text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'Pendiente',
  observacion text NOT NULL DEFAULT '',
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.requerimiento_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requerimiento_id uuid NOT NULL REFERENCES public.requerimientos(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'MAT',
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL DEFAULT 0,
  precio_referencial numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimientos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimiento_items TO authenticated;
GRANT ALL ON public.requerimientos TO service_role;
GRANT ALL ON public.requerimiento_items TO service_role;
ALTER TABLE public.requerimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimiento_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver requerimientos" ON public.requerimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear requerimientos" ON public.requerimientos FOR INSERT TO authenticated WITH CHECK (creado_por = auth.uid());
CREATE POLICY "Gestionar requerimientos" ON public.requerimientos FOR UPDATE TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()) OR (creado_por = auth.uid() AND estado = 'Pendiente'));
CREATE POLICY "Eliminar requerimientos" ON public.requerimientos FOR DELETE TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()) OR (creado_por = auth.uid() AND estado = 'Pendiente'));
CREATE POLICY "Ver items" ON public.requerimiento_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestionar items" ON public.requerimiento_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requerimientos r WHERE r.id = requerimiento_id
    AND (public.is_admin_o_gerente(auth.uid()) OR (r.creado_por = auth.uid() AND r.estado = 'Pendiente'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.requerimientos r WHERE r.id = requerimiento_id
    AND (public.is_admin_o_gerente(auth.uid()) OR (r.creado_por = auth.uid() AND r.estado = 'Pendiente'))));
CREATE TRIGGER update_requerimientos_updated_at BEFORE UPDATE ON public.requerimientos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
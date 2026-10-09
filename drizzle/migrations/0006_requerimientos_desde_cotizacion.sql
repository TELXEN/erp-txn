ALTER TABLE public.requerimientos ADD COLUMN IF NOT EXISTS cotizacion_id uuid REFERENCES public.cotizaciones(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'obra';
CREATE TABLE public.requerimiento_item_origenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requerimiento_item_id uuid NOT NULL REFERENCES public.requerimiento_items(id) ON DELETE CASCADE,
  cotizacion_item_id uuid,
  partida_codigo text NOT NULL DEFAULT '',
  partida_nombre text NOT NULL DEFAULT '',
  metrado numeric NOT NULL DEFAULT 0,
  cantidad_unitaria numeric NOT NULL DEFAULT 0,
  cantidad numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requerimiento_item_origenes TO authenticated;
GRANT ALL ON public.requerimiento_item_origenes TO service_role;
ALTER TABLE public.requerimiento_item_origenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver origenes" ON public.requerimiento_item_origenes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestionar origenes" ON public.requerimiento_item_origenes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.requerimiento_items i JOIN public.requerimientos r ON r.id = i.requerimiento_id WHERE i.id = requerimiento_item_id AND (public.is_admin_o_gerente(auth.uid()) OR (r.creado_por = auth.uid() AND r.estado = 'Pendiente'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.requerimiento_items i JOIN public.requerimientos r ON r.id = i.requerimiento_id WHERE i.id = requerimiento_item_id AND (public.is_admin_o_gerente(auth.uid()) OR (r.creado_por = auth.uid() AND r.estado = 'Pendiente'))));
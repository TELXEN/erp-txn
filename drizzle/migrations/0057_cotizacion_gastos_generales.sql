CREATE TABLE public.cotizacion_gastos_generales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  nivel text NOT NULL DEFAULT 'item' CHECK (nivel IN ('bloque','grupo','item')),
  descripcion text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'mes',
  cantidad numeric NOT NULL DEFAULT 0,
  tiempo numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cotizacion_gastos_generales(cotizacion_id, orden);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizacion_gastos_generales TO authenticated;
GRANT ALL ON public.cotizacion_gastos_generales TO service_role;
ALTER TABLE public.cotizacion_gastos_generales ENABLE ROW LEVEL SECURITY;
CREATE POLICY cgg_select ON public.cotizacion_gastos_generales FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY cgg_manage ON public.cotizacion_gastos_generales FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
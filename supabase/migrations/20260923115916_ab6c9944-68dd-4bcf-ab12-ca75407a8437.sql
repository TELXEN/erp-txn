CREATE TABLE public.cajas_chicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  responsable_id uuid NOT NULL REFERENCES public.trabajadores(id),
  motivo text NOT NULL DEFAULT '',
  monto_entregado numeric NOT NULL DEFAULT 0,
  fecha_entrega date NOT NULL DEFAULT CURRENT_DATE,
  fecha_liquidacion date,
  estado text NOT NULL DEFAULT 'Abierta',
  observacion text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cajas_chicas TO authenticated;
GRANT ALL ON public.cajas_chicas TO service_role;

ALTER TABLE public.cajas_chicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cajas chicas visibles" ON public.cajas_chicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "cajas chicas gestion" ON public.cajas_chicas FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_cajas_chicas_updated_at BEFORE UPDATE ON public.cajas_chicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gastos_directos ADD COLUMN IF NOT EXISTS caja_chica_id uuid REFERENCES public.cajas_chicas(id) ON DELETE SET NULL;
ALTER TABLE public.gastos_generales ADD COLUMN IF NOT EXISTS caja_chica_id uuid REFERENCES public.cajas_chicas(id) ON DELETE SET NULL;

CREATE INDEX idx_gastos_directos_caja ON public.gastos_directos(caja_chica_id);
CREATE INDEX idx_gastos_generales_caja ON public.gastos_generales(caja_chica_id);
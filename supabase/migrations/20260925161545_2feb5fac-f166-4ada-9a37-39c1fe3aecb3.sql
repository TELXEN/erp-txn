CREATE TABLE public.recibos_honorarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id),
  proyecto_id uuid REFERENCES public.proyectos(id),
  numero_recibo text NOT NULL,
  fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  concepto text NOT NULL DEFAULT '',
  monto_bruto numeric NOT NULL CHECK (monto_bruto > 0),
  retencion numeric NOT NULL DEFAULT 0 CHECK (retencion >= 0),
  monto_neto numeric NOT NULL,
  estado_pago text NOT NULL DEFAULT 'Pendiente' CHECK (estado_pago IN ('Pendiente','Pagado')),
  banco_id uuid REFERENCES public.bancos(id),
  fecha_pago date,
  numero_operacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trabajador_id, numero_recibo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recibos_honorarios TO authenticated;
GRANT ALL ON public.recibos_honorarios TO service_role;
ALTER TABLE public.recibos_honorarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin y gerente gestionan recibos" ON public.recibos_honorarios
  FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_recibos_honorarios_updated_at BEFORE UPDATE ON public.recibos_honorarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
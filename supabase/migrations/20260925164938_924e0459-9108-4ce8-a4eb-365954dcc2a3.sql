CREATE TABLE public.pagos_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  concepto text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  banco_id uuid REFERENCES public.bancos(id),
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  numero_operacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, mes, concepto)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos_estado TO authenticated;
GRANT ALL ON public.pagos_estado TO service_role;
ALTER TABLE public.pagos_estado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin y gerente gestionan pagos al Estado" ON public.pagos_estado FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
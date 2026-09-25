CREATE TABLE public.beneficios_sociales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('CTS','Gratificación','Liquidación')),
  anio integer NOT NULL,
  periodo text NOT NULL,
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id),
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  meses integer NOT NULL DEFAULT 0,
  dias integer NOT NULL DEFAULT 0,
  remuneracion_computable numeric NOT NULL DEFAULT 0,
  monto numeric NOT NULL DEFAULT 0,
  bonificacion numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado_pago text NOT NULL DEFAULT 'Pendiente' CHECK (estado_pago IN ('Pendiente','Pagado')),
  banco_id uuid REFERENCES public.bancos(id),
  fecha_pago date,
  numero_operacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, anio, periodo, trabajador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_sociales TO authenticated;
GRANT ALL ON public.beneficios_sociales TO service_role;
ALTER TABLE public.beneficios_sociales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin y gerente gestionan beneficios" ON public.beneficios_sociales FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_beneficios_sociales_updated_at BEFORE UPDATE ON public.beneficios_sociales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.trabajadores ADD COLUMN fecha_cese date;
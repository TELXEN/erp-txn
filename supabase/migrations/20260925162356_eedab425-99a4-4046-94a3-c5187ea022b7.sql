CREATE TABLE public.planillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  estado text NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador','Cerrada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anio, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planillas TO authenticated;
GRANT ALL ON public.planillas TO service_role;
ALTER TABLE public.planillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin y gerente gestionan planillas" ON public.planillas FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_planillas_updated_at BEFORE UPDATE ON public.planillas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.boletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planilla_id uuid NOT NULL REFERENCES public.planillas(id) ON DELETE CASCADE,
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id),
  regimen_laboral text NOT NULL DEFAULT 'General',
  sistema_pensiones text NOT NULL DEFAULT 'ONP',
  dias_laborados integer NOT NULL DEFAULT 30 CHECK (dias_laborados BETWEEN 0 AND 31),
  sueldo_basico numeric NOT NULL DEFAULT 0,
  asignacion_familiar numeric NOT NULL DEFAULT 0,
  horas_extra numeric NOT NULL DEFAULT 0,
  otros_ingresos numeric NOT NULL DEFAULT 0,
  total_ingresos numeric NOT NULL DEFAULT 0,
  aporte_pension numeric NOT NULL DEFAULT 0,
  renta_quinta numeric NOT NULL DEFAULT 0,
  otros_descuentos numeric NOT NULL DEFAULT 0,
  total_descuentos numeric NOT NULL DEFAULT 0,
  neto_pagar numeric NOT NULL DEFAULT 0,
  essalud numeric NOT NULL DEFAULT 0,
  estado_pago text NOT NULL DEFAULT 'Pendiente' CHECK (estado_pago IN ('Pendiente','Pagado')),
  banco_id uuid REFERENCES public.bancos(id),
  fecha_pago date,
  numero_operacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (planilla_id, trabajador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletas TO authenticated;
GRANT ALL ON public.boletas TO service_role;
ALTER TABLE public.boletas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin y gerente gestionan boletas" ON public.boletas FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_boletas_updated_at BEFORE UPDATE ON public.boletas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.emos_trabajador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE RESTRICT,
  tipo_emo text NOT NULL DEFAULT 'Periódico',
  examenes text[] NOT NULL DEFAULT '{}',
  resultado text NOT NULL DEFAULT 'Apto',
  restricciones text,
  fecha_emo date NOT NULL,
  fecha_vencimiento date NOT NULL,
  clinica text NOT NULL,
  sede_clinica text,
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  estado_pago text NOT NULL DEFAULT 'Pendiente' CHECK (estado_pago IN ('Pendiente','Pagado')),
  fecha_pago date,
  observaciones text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_vencimiento >= fecha_emo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emos_trabajador TO authenticated;
GRANT ALL ON public.emos_trabajador TO service_role;
ALTER TABLE public.emos_trabajador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emos gestion" ON public.emos_trabajador FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE INDEX emos_trabajador_trab_idx ON public.emos_trabajador(trabajador_id);
CREATE TRIGGER update_emos_trabajador_updated_at BEFORE UPDATE ON public.emos_trabajador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
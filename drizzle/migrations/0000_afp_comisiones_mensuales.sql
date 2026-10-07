CREATE TABLE public.afp_comisiones_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  afp text NOT NULL,
  aporte_fondo numeric NOT NULL,
  prima_seguro numeric NOT NULL,
  comision_flujo numeric NOT NULL,
  tope_remuneracion numeric NOT NULL DEFAULT 0,
  origen text NOT NULL DEFAULT 'decolecta',
  consultado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periodo, afp)
);
GRANT SELECT ON public.afp_comisiones_mensuales TO authenticated;
GRANT ALL ON public.afp_comisiones_mensuales TO service_role;
ALTER TABLE public.afp_comisiones_mensuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura comisiones AFP" ON public.afp_comisiones_mensuales FOR SELECT TO authenticated USING (true);
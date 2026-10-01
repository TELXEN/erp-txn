CREATE TABLE public.margenes_insumo (
  tipo text PRIMARY KEY CHECK (tipo IN ('MO','MAT','EQ','HT','SC')),
  margen_pct numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.margenes_insumo TO authenticated;
GRANT ALL ON public.margenes_insumo TO service_role;
ALTER TABLE public.margenes_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados ven margenes" ON public.margenes_insumo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerente edita margenes" ON public.margenes_insumo FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Gerente crea margenes" ON public.margenes_insumo FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'gerente'));
CREATE TRIGGER trg_margenes_insumo_updated BEFORE UPDATE ON public.margenes_insumo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.margenes_insumo (tipo) VALUES ('MO'),('MAT'),('EQ'),('HT'),('SC');
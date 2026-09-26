CREATE TABLE public.cronograma_partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  pct numeric(6,2) NOT NULL DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partida_id, anio, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_partidas TO authenticated;
GRANT ALL ON public.cronograma_partidas TO service_role;
ALTER TABLE public.cronograma_partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven cronograma" ON public.cronograma_partidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Roles gestionan cronograma" ON public.cronograma_partidas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ingeniero') OR public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'ingeniero') OR public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER trg_cronograma_updated BEFORE UPDATE ON public.cronograma_partidas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
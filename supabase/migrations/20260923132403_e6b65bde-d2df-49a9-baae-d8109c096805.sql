CREATE TABLE public.especialidades_partida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.especialidades_partida TO authenticated;
GRANT ALL ON public.especialidades_partida TO service_role;

ALTER TABLE public.especialidades_partida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de especialidades para usuarios"
  ON public.especialidades_partida FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion de especialidades admin o gerente"
  ON public.especialidades_partida FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_especialidades_partida_updated_at
  BEFORE UPDATE ON public.especialidades_partida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '';
-- Pie del APU: especificaciones técnicas de la partida y tabla de metrado.
ALTER TABLE public.partidas_apu
  ADD COLUMN IF NOT EXISTS especificaciones text;

CREATE TABLE IF NOT EXISTS public.partidas_apu_metrado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES public.partidas_apu(id) ON DELETE CASCADE,
  concepto text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL DEFAULT 0,
  observacion text NOT NULL DEFAULT '',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partidas_apu_metrado TO authenticated;
GRANT ALL ON public.partidas_apu_metrado TO service_role;

ALTER TABLE public.partidas_apu_metrado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura autenticados" ON public.partidas_apu_metrado
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura autenticados" ON public.partidas_apu_metrado
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_partidas_apu_metrado_updated ON public.partidas_apu_metrado;
CREATE TRIGGER trg_partidas_apu_metrado_updated
  BEFORE UPDATE ON public.partidas_apu_metrado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
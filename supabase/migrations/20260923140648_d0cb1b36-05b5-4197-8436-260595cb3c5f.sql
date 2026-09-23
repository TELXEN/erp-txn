CREATE TABLE public.unidades_medida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simbolo text NOT NULL UNIQUE,
  descripcion text NOT NULL DEFAULT '',
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades_medida TO authenticated;
GRANT ALL ON public.unidades_medida TO service_role;

ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de unidades para usuarios autenticados"
  ON public.unidades_medida FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion de unidades para admin y gerente"
  ON public.unidades_medida FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_unidades_medida_updated_at
  BEFORE UPDATE ON public.unidades_medida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.unidades_medida (simbolo, descripcion, orden) VALUES
  ('und', 'Unidad', 1),
  ('glb', 'Global / Suma alzada', 2),
  ('m', 'Metro lineal', 3),
  ('m2', 'Metro cuadrado', 4),
  ('m3', 'Metro cúbico', 5),
  ('kg', 'Kilogramo', 6),
  ('tn', 'Tonelada', 7),
  ('pto', 'Punto', 8),
  ('est', 'Estimado', 9),
  ('jgo', 'Juego', 10),
  ('km', 'Kilómetro', 11),
  ('hr', 'Hora', 12),
  ('día', 'Día', 13),
  ('mes', 'Mes', 14),
  ('gal', 'Galón', 15),
  ('rll', 'Rollo', 16);

ALTER TABLE public.partidas
  ADD COLUMN unidad text NOT NULL DEFAULT 'glb',
  ADD COLUMN metrado numeric NOT NULL DEFAULT 1,
  ADD COLUMN precio_unitario numeric NOT NULL DEFAULT 0;

UPDATE public.partidas SET metrado = 1, precio_unitario = presupuesto_inicial;
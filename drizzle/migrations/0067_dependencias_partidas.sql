CREATE TABLE public.dependencias_partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  predecesora_id uuid NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  sucesora_id uuid NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'FS' CHECK (tipo IN ('FS','SS','FF')),
  desfase_dias integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (predecesora_id, sucesora_id),
  CHECK (predecesora_id <> sucesora_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependencias_partidas TO authenticated;
GRANT ALL ON public.dependencias_partidas TO service_role;
ALTER TABLE public.dependencias_partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven dependencias" ON public.dependencias_partidas FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Roles gestionan dependencias" ON public.dependencias_partidas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ingeniero') OR public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'ingeniero') OR public.is_admin_o_gerente(auth.uid()));

CREATE OR REPLACE FUNCTION public.validar_dependencia_partida() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT proyecto_id FROM partidas WHERE id = NEW.predecesora_id) IS DISTINCT FROM NEW.proyecto_id
     OR (SELECT proyecto_id FROM partidas WHERE id = NEW.sucesora_id) IS DISTINCT FROM NEW.proyecto_id THEN
    RAISE EXCEPTION 'Las partidas deben pertenecer a la misma obra';
  END IF;
  IF EXISTS (
    WITH RECURSIVE cadena(id) AS (
      SELECT sucesora_id FROM dependencias_partidas WHERE predecesora_id = NEW.sucesora_id AND id <> NEW.id
      UNION
      SELECT d.sucesora_id FROM dependencias_partidas d JOIN cadena c ON d.predecesora_id = c.id WHERE d.id <> NEW.id
    ) SELECT 1 FROM cadena WHERE id = NEW.predecesora_id
  ) OR NEW.sucesora_id = NEW.predecesora_id THEN
    RAISE EXCEPTION 'La dependencia crea un círculo entre partidas';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_dependencia_partida BEFORE INSERT OR UPDATE ON public.dependencias_partidas
FOR EACH ROW EXECUTE FUNCTION public.validar_dependencia_partida();
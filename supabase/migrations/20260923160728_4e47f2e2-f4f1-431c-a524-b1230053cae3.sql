CREATE TABLE public.categorias_partida (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  especialidad text NOT NULL DEFAULT '',
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_partida TO authenticated;
GRANT ALL ON public.categorias_partida TO service_role;

ALTER TABLE public.categorias_partida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven categorias de partida"
  ON public.categorias_partida FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin y gerente gestionan categorias de partida"
  ON public.categorias_partida FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE UNIQUE INDEX categorias_partida_especialidad_nombre_key
  ON public.categorias_partida (especialidad, nombre);

CREATE TRIGGER update_categorias_partida_updated_at
  BEFORE UPDATE ON public.categorias_partida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partidas_maestras ADD COLUMN categoria text NOT NULL DEFAULT '';
ALTER TABLE public.cotizacion_items ADD COLUMN categoria text NOT NULL DEFAULT '';
ALTER TABLE public.partidas ADD COLUMN categoria text NOT NULL DEFAULT '';
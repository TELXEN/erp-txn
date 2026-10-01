CREATE TABLE public.configuracion_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_pdf text NOT NULL DEFAULT 'carlito' CHECK (fuente_pdf IN ('carlito', 'arial', 'times', 'source-sans-3')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.configuracion_documentos TO authenticated;
GRANT ALL ON public.configuracion_documentos TO service_role;

ALTER TABLE public.configuracion_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configuracion documental visible"
ON public.configuracion_documentos
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Gerente actualiza configuracion documental"
ON public.configuracion_documentos
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'gerente'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'gerente'::public.app_role));

CREATE TRIGGER update_configuracion_documentos_updated_at
BEFORE UPDATE ON public.configuracion_documentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracion_documentos (fuente_pdf) VALUES ('carlito');
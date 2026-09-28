CREATE TABLE public.codificacion_preliquidacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefijo TEXT NOT NULL DEFAULT 'TXN',
  incluir_anio BOOLEAN NOT NULL DEFAULT true,
  anio_dos_digitos BOOLEAN NOT NULL DEFAULT true,
  separador TEXT NOT NULL DEFAULT '-',
  tipo_letra TEXT NOT NULL DEFAULT 'PL',
  digitos INTEGER NOT NULL DEFAULT 3,
  correlativo_actual INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.codificacion_preliquidacion TO authenticated;
GRANT ALL ON public.codificacion_preliquidacion TO service_role;
ALTER TABLE public.codificacion_preliquidacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gestionan codificacion de preliquidacion" ON public.codificacion_preliquidacion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_codificacion_preliquidacion_updated_at BEFORE UPDATE ON public.codificacion_preliquidacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.codificacion_preliquidacion (prefijo, incluir_anio, anio_dos_digitos, separador, tipo_letra, digitos, correlativo_actual) VALUES ('TXN', true, true, '-', 'PL', 3, 0);
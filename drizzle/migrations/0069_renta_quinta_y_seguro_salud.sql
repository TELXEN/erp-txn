ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS seguro_salud text NOT NULL DEFAULT 'EsSalud';
ALTER TABLE public.boletas ADD COLUMN IF NOT EXISTS renta_quinta_manual boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.validar_seguro_salud() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.seguro_salud NOT IN ('EsSalud','EPS') THEN RAISE EXCEPTION 'Seguro de salud inválido: %', NEW.seguro_salud; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validar_seguro_salud ON public.trabajadores;
CREATE TRIGGER trg_validar_seguro_salud BEFORE INSERT OR UPDATE OF seguro_salud ON public.trabajadores FOR EACH ROW EXECUTE FUNCTION public.validar_seguro_salud();
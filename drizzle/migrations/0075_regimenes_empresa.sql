CREATE TABLE public.regimenes_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regimen text NOT NULL,
  fecha_inicio date NOT NULL UNIQUE,
  remype_numero text,
  remype_certificado text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regimenes_empresa TO authenticated;
GRANT ALL ON public.regimenes_empresa TO service_role;
ALTER TABLE public.regimenes_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee regimenes" ON public.regimenes_empresa FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Admin o gerente gestiona regimenes" ON public.regimenes_empresa FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS agrario_prorrateado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.rango_regimen(_r text) RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _r WHEN 'MYPE Micro' THEN 0 WHEN 'MYPE Pequeña' THEN 1 ELSE 2 END
$$;

CREATE OR REPLACE FUNCTION public.validar_regimen_trabajador() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _empresa text;
BEGIN
  IF NEW.tipo_contratacion IS DISTINCT FROM 'Planilla' OR NEW.fecha_ingreso IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.regimen_laboral IS NOT DISTINCT FROM OLD.regimen_laboral AND NEW.fecha_ingreso IS NOT DISTINCT FROM OLD.fecha_ingreso THEN RETURN NEW; END IF;
  SELECT regimen INTO _empresa FROM public.regimenes_empresa WHERE fecha_inicio <= NEW.fecha_ingreso ORDER BY fecha_inicio DESC LIMIT 1;
  _empresa := coalesce(_empresa, 'General');
  IF public.rango_regimen(NEW.regimen_laboral) < public.rango_regimen(_empresa) THEN
    RAISE EXCEPTION 'El trabajador ingresó el % con la empresa en régimen %; no puede pasar a %.', to_char(NEW.fecha_ingreso,'DD/MM/YYYY'), _empresa, NEW.regimen_laboral;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_regimen_trabajador ON public.trabajadores;
CREATE TRIGGER validar_regimen_trabajador BEFORE INSERT OR UPDATE ON public.trabajadores FOR EACH ROW EXECUTE FUNCTION public.validar_regimen_trabajador();
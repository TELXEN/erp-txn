-- Los porcentajes de pricing (gastos generales y utilidad) se guardan siempre con 2 decimales,
-- sin importar quién escriba la fila (pantalla, gastos generales, revisión, plantilla).
CREATE OR REPLACE FUNCTION public.redondear_porcentajes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pct_gastos_generales IS NOT NULL THEN
    NEW.pct_gastos_generales := ROUND(NEW.pct_gastos_generales, 2);
  END IF;
  IF NEW.pct_utilidad IS NOT NULL THEN
    NEW.pct_utilidad := ROUND(NEW.pct_utilidad, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_redondear_porcentajes ON public.cotizaciones;
CREATE TRIGGER trg_redondear_porcentajes BEFORE INSERT OR UPDATE ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.redondear_porcentajes();

DROP TRIGGER IF EXISTS trg_redondear_porcentajes ON public.proyectos;
CREATE TRIGGER trg_redondear_porcentajes BEFORE INSERT OR UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.redondear_porcentajes();

DROP TRIGGER IF EXISTS trg_redondear_porcentajes ON public.plantillas_cotizacion;
CREATE TRIGGER trg_redondear_porcentajes BEFORE INSERT OR UPDATE ON public.plantillas_cotizacion
  FOR EACH ROW EXECUTE FUNCTION public.redondear_porcentajes();
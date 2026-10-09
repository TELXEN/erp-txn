CREATE OR REPLACE FUNCTION public.redondear_importes_gasto()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.monto := round(coalesce(NEW.monto, 0)::numeric, 2);
  NEW.monto_soles := round(coalesce(NEW.monto_soles, 0)::numeric, 2);
  IF TG_TABLE_NAME = 'gastos_directos' THEN
    NEW.cantidad := round(coalesce(NEW.cantidad, 0)::numeric, 4);
    NEW.precio_unitario := round(coalesce(NEW.precio_unitario, 0)::numeric, 4);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.redondear_importes_venta()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.monto := round(coalesce(NEW.monto, 0)::numeric, 2);
  NEW.monto_soles := round(coalesce(NEW.monto_soles, 0)::numeric, 2);
  NEW.igv := round(coalesce(NEW.igv, 0)::numeric, 2);
  NEW.total := round(coalesce(NEW.total, 0)::numeric, 2);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_redondeo_gastos_directos ON public.gastos_directos;
CREATE TRIGGER trg_redondeo_gastos_directos BEFORE INSERT OR UPDATE ON public.gastos_directos FOR EACH ROW EXECUTE FUNCTION public.redondear_importes_gasto();
DROP TRIGGER IF EXISTS trg_redondeo_gastos_generales ON public.gastos_generales;
CREATE TRIGGER trg_redondeo_gastos_generales BEFORE INSERT OR UPDATE ON public.gastos_generales FOR EACH ROW EXECUTE FUNCTION public.redondear_importes_gasto();
DROP TRIGGER IF EXISTS trg_redondeo_ventas ON public.ventas;
CREATE TRIGGER trg_redondeo_ventas BEFORE INSERT OR UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.redondear_importes_venta();
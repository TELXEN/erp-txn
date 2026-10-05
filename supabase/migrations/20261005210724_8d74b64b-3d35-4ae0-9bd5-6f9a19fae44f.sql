CREATE OR REPLACE FUNCTION public.sincronizar_grupo_cotizacion_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE multi boolean;
BEGIN
  SELECT multidisciplinaria INTO multi FROM public.cotizaciones WHERE id = NEW.cotizacion_id;
  IF NOT coalesce(multi, false) THEN
    NEW.grupo := coalesce(NEW.especialidad, '');
  ELSIF coalesce(NEW.grupo, '') = '' THEN
    SELECT grupo INTO NEW.grupo FROM public.categorias_partida
      WHERE nombre = NEW.categoria AND grupo <> '' LIMIT 1;
    NEW.grupo := coalesce(NEW.grupo, '');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sincronizar_grupo_cotizacion_item BEFORE INSERT OR UPDATE ON public.cotizacion_items
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_grupo_cotizacion_item();
ALTER TABLE public.proyectos
  ADD COLUMN archivado_en timestamptz;

ALTER TABLE public.proyectos
  DROP CONSTRAINT proyectos_situacion_chk;

ALTER TABLE public.proyectos
  ADD CONSTRAINT proyectos_situacion_chk
  CHECK (situacion = ANY (ARRAY['Borrador'::text, 'No iniciado'::text, 'En proceso'::text, 'Retrasado'::text, 'Completado'::text, 'Cancelado'::text]));

INSERT INTO public.estados_proyecto (nombre, orden, activo)
SELECT 'Borrador', 0, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.estados_proyecto WHERE lower(trim(nombre)) = 'borrador'
);

CREATE OR REPLACE FUNCTION public.sincronizar_estado_proyecto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.estado := CASE
    WHEN NEW.situacion = 'Completado' THEN 'Finalizado'::public.estado_proyecto
    ELSE 'En Ejecucion'::public.estado_proyecto
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sincronizar_estado_proyecto
BEFORE INSERT OR UPDATE OF situacion ON public.proyectos
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_estado_proyecto();

CREATE OR REPLACE FUNCTION public.validar_costo_proyecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  estado_actual text;
  presupuesto_actual numeric;
  importe numeric;
BEGIN
  IF NEW.proyecto_id IS NULL THEN
    RETURN NEW;
  END IF;

  importe := CASE TG_TABLE_NAME
    WHEN 'gastos_directos' THEN COALESCE(NEW.monto_soles, 0)
    WHEN 'gastos_generales' THEN COALESCE(NEW.monto_soles, 0)
    WHEN 'tareos' THEN COALESCE(NEW.costo_soles, 0)
    WHEN 'tareo_vehiculos' THEN COALESCE(NEW.costo_soles, 0)
    ELSE 0
  END;

  IF importe = 0 THEN
    RETURN NEW;
  END IF;

  SELECT p.situacion,
         COALESCE((
           SELECT SUM(COALESCE(pa.presupuesto_inicial, 0))
           FROM public.partidas pa
           WHERE pa.proyecto_id = p.id
         ), 0)
    INTO estado_actual, presupuesto_actual
  FROM public.proyectos p
  WHERE p.id = NEW.proyecto_id;

  IF estado_actual IS NULL THEN
    RAISE EXCEPTION 'El proyecto seleccionado no existe';
  END IF;
  IF estado_actual = 'Borrador' THEN
    RAISE EXCEPTION 'No se puede registrar el costo porque el proyecto está en Borrador';
  END IF;
  IF presupuesto_actual <= 0 THEN
    RAISE EXCEPTION 'Asigna un presupuesto mayor a S/ 0.00 antes de registrar costos';
  END IF;

  IF importe > 0 AND estado_actual = 'No iniciado' THEN
    UPDATE public.proyectos
       SET situacion = 'En proceso'
     WHERE id = NEW.proyecto_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_costo_gastos_directos
BEFORE INSERT OR UPDATE OF proyecto_id, monto_soles ON public.gastos_directos
FOR EACH ROW EXECUTE FUNCTION public.validar_costo_proyecto();

CREATE TRIGGER trg_validar_costo_gastos_generales
BEFORE INSERT OR UPDATE OF proyecto_id, monto_soles ON public.gastos_generales
FOR EACH ROW EXECUTE FUNCTION public.validar_costo_proyecto();

CREATE TRIGGER trg_validar_costo_tareos
BEFORE INSERT OR UPDATE OF proyecto_id, costo_soles ON public.tareos
FOR EACH ROW EXECUTE FUNCTION public.validar_costo_proyecto();

CREATE TRIGGER trg_validar_costo_tareo_vehiculos
BEFORE INSERT OR UPDATE OF proyecto_id, costo_soles ON public.tareo_vehiculos
FOR EACH ROW EXECUTE FUNCTION public.validar_costo_proyecto();

UPDATE public.proyectos p
SET situacion = 'En proceso'
WHERE p.situacion = 'No iniciado'
  AND (
    EXISTS (SELECT 1 FROM public.gastos_directos g WHERE g.proyecto_id = p.id AND g.monto_soles > 0)
    OR EXISTS (SELECT 1 FROM public.gastos_generales g WHERE g.proyecto_id = p.id AND g.monto_soles > 0)
    OR EXISTS (SELECT 1 FROM public.tareos t WHERE t.proyecto_id = p.id AND t.costo_soles > 0)
    OR EXISTS (SELECT 1 FROM public.tareo_vehiculos tv WHERE tv.proyecto_id = p.id AND tv.costo_soles > 0)
  );
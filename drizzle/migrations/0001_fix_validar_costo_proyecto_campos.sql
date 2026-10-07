CREATE OR REPLACE FUNCTION public.validar_costo_proyecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  estado_actual text;
  presupuesto_actual numeric;
  importe numeric;
BEGIN
  IF NEW.proyecto_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME IN ('gastos_directos', 'gastos_generales') THEN
    EXECUTE 'SELECT COALESCE(($1).monto_soles, 0)' INTO importe USING NEW;
  ELSIF TG_TABLE_NAME IN ('tareos', 'tareo_vehiculos') THEN
    EXECUTE 'SELECT COALESCE(($1).costo_soles, 0)' INTO importe USING NEW;
  ELSE
    importe := 0;
  END IF;

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
$function$;
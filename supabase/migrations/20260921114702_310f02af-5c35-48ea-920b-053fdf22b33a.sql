ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS situacion text NOT NULL DEFAULT 'No iniciado',
  ADD COLUMN IF NOT EXISTS prioridad text NOT NULL DEFAULT 'Media';

ALTER TABLE public.partidas
  ADD COLUMN IF NOT EXISTS situacion text NOT NULL DEFAULT 'No iniciado',
  ADD COLUMN IF NOT EXISTS prioridad text NOT NULL DEFAULT 'Media';

ALTER TABLE public.proyectos
  ADD CONSTRAINT proyectos_situacion_chk CHECK (situacion IN ('No iniciado','En proceso','Retrasado','Completado','Cancelado')),
  ADD CONSTRAINT proyectos_prioridad_chk CHECK (prioridad IN ('Alta','Media','Baja'));

ALTER TABLE public.partidas
  ADD CONSTRAINT partidas_situacion_chk CHECK (situacion IN ('No iniciado','En proceso','Retrasado','Completado','Cancelado')),
  ADD CONSTRAINT partidas_prioridad_chk CHECK (prioridad IN ('Alta','Media','Baja'));

UPDATE public.proyectos SET situacion = CASE WHEN estado = 'Finalizado' THEN 'Completado' ELSE 'En proceso' END;
UPDATE public.partidas SET situacion = CASE WHEN avance_pct >= 100 THEN 'Completado' WHEN avance_pct > 0 THEN 'En proceso' ELSE 'No iniciado' END;

CREATE OR REPLACE FUNCTION public.proteger_partida()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN
    IF NEW.nombre IS DISTINCT FROM OLD.nombre
       OR NEW.especialidad IS DISTINCT FROM OLD.especialidad
       OR NEW.presupuesto_inicial IS DISTINCT FROM OLD.presupuesto_inicial
       OR NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id THEN
      RAISE EXCEPTION 'El ingeniero de campo solo puede modificar el %% de avance fisico y el estado';
    END IF;
  END IF;

  IF public.has_role(auth.uid(), 'administrador'::app_role)
     AND NOT public.has_role(auth.uid(), 'gerente'::app_role) THEN
    IF NEW.avance_pct IS DISTINCT FROM OLD.avance_pct THEN
      RAISE EXCEPTION 'El administrador de oficina no puede modificar el %% de avance fisico';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
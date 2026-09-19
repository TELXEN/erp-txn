CREATE OR REPLACE FUNCTION public.proteger_partida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ingeniero de campo: solo puede tocar el % de avance
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN
    IF NEW.nombre IS DISTINCT FROM OLD.nombre
       OR NEW.especialidad IS DISTINCT FROM OLD.especialidad
       OR NEW.presupuesto_inicial IS DISTINCT FROM OLD.presupuesto_inicial
       OR NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id THEN
      RAISE EXCEPTION 'El ingeniero de campo solo puede modificar el %% de avance fisico';
    END IF;
  END IF;

  -- Administrador de oficina: no puede modificar el % de avance fisico
  IF public.has_role(auth.uid(), 'administrador'::app_role)
     AND NOT public.has_role(auth.uid(), 'gerente'::app_role) THEN
    IF NEW.avance_pct IS DISTINCT FROM OLD.avance_pct THEN
      RAISE EXCEPTION 'El administrador de oficina no puede modificar el %% de avance fisico';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
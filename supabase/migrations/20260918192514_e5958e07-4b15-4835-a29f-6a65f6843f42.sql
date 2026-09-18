CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_o_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrador','gerente'))
$$;

CREATE OR REPLACE FUNCTION public.proteger_partida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN
    IF NEW.nombre IS DISTINCT FROM OLD.nombre
       OR NEW.especialidad IS DISTINCT FROM OLD.especialidad
       OR NEW.presupuesto_inicial IS DISTINCT FROM OLD.presupuesto_inicial
       OR NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id THEN
      RAISE EXCEPTION 'El ingeniero de campo solo puede modificar el %% de avance fisico';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_o_gerente(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.proteger_partida() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_o_gerente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.proteger_partida() TO authenticated;
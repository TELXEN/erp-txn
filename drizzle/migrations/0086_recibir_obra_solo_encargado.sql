CREATE OR REPLACE FUNCTION public.puede_recibir_almacen(_user uuid, _proyecto uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.es_encargado_almacen(_user, _proyecto)
    OR (_proyecto IS NULL AND public.has_role(_user,'gerente'))
$$;
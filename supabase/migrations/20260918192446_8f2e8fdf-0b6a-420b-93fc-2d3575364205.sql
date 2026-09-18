REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_o_gerente(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.proteger_partida() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_o_gerente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.proteger_partida() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() TO authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() TO authenticated;
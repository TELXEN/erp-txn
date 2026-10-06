DROP POLICY "perfiles visibles" ON public.profiles;
CREATE POLICY "perfil propio o admin gerente" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin_o_gerente(auth.uid()));
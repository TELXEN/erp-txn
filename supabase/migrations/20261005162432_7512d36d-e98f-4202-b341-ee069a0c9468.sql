CREATE POLICY "Admin/gerente suben comprobantes compra" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes-compra' AND public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin/gerente reemplazan comprobantes compra" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'comprobantes-compra' AND public.is_admin_o_gerente(auth.uid()));
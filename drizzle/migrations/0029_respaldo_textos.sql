CREATE TABLE public.respaldo_textos (
  id bigserial PRIMARY KEY,
  tabla text NOT NULL,
  fila_id text NOT NULL,
  columna text NOT NULL,
  valor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.respaldo_textos TO authenticated;
GRANT ALL ON public.respaldo_textos TO service_role;
ALTER TABLE public.respaldo_textos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo admin o gerente leen respaldo" ON public.respaldo_textos FOR SELECT TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
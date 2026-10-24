CREATE TABLE public.terceros_cuentas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id uuid NOT NULL REFERENCES public.terceros(id) ON DELETE CASCADE,
  banco text NOT NULL DEFAULT '',
  moneda text NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN','USD')),
  numero_cuenta text NOT NULL DEFAULT '',
  cci text NOT NULL DEFAULT '',
  es_principal boolean NOT NULL DEFAULT false,
  es_detraccion boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX terceros_cuentas_bancarias_tercero_idx ON public.terceros_cuentas_bancarias(tercero_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terceros_cuentas_bancarias TO authenticated;
GRANT ALL ON public.terceros_cuentas_bancarias TO service_role;
ALTER TABLE public.terceros_cuentas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cuentas terceros gestion" ON public.terceros_cuentas_bancarias FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "cuentas terceros visibles" ON public.terceros_cuentas_bancarias FOR SELECT TO authenticated
  USING (public.es_personal(auth.uid()));
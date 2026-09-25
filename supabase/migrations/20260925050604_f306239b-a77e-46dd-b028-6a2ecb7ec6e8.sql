CREATE TABLE public.metas_flujo_caja (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_ingreso numeric NOT NULL DEFAULT 0,
  meta_costo numeric NOT NULL DEFAULT 0,
  notas text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (anio, mes)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_flujo_caja TO authenticated;
GRANT ALL ON public.metas_flujo_caja TO service_role;

ALTER TABLE public.metas_flujo_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas flujo visibles admin gerente"
ON public.metas_flujo_caja FOR SELECT TO authenticated
USING (public.is_admin_o_gerente(auth.uid()));

CREATE POLICY "metas flujo gestionadas admin gerente"
ON public.metas_flujo_caja FOR ALL TO authenticated
USING (public.is_admin_o_gerente(auth.uid()))
WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_metas_flujo_caja_updated_at
BEFORE UPDATE ON public.metas_flujo_caja
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
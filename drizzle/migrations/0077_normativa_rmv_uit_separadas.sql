CREATE TABLE public.normativa_rmv (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vigencia_desde date NOT NULL UNIQUE, monto numeric NOT NULL, base_legal text NOT NULL DEFAULT '', observaciones text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.normativa_uit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), anio integer NOT NULL UNIQUE, monto numeric NOT NULL, base_legal text NOT NULL DEFAULT '', observaciones text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.normativa_rmv, public.normativa_uit TO authenticated;
GRANT ALL ON public.normativa_rmv, public.normativa_uit TO service_role;
ALTER TABLE public.normativa_rmv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normativa_uit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee RMV" ON public.normativa_rmv FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Admin/gerencia gestiona RMV" ON public.normativa_rmv FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Personal lee UIT" ON public.normativa_uit FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Admin/gerencia gestiona UIT" ON public.normativa_uit FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER normativa_rmv_updated BEFORE UPDATE ON public.normativa_rmv FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER normativa_uit_updated BEFORE UPDATE ON public.normativa_uit FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.normativa_rmv (vigencia_desde, monto, base_legal, observaciones)
SELECT vigencia_desde, rmv, base_legal, observaciones FROM (SELECT *, lag(rmv) OVER (ORDER BY vigencia_desde) AS prev FROM public.historial_normativo) h WHERE prev IS NULL OR prev <> rmv;
INSERT INTO public.normativa_uit (anio, monto, base_legal, observaciones)
SELECT DISTINCT ON (extract(year FROM vigencia_desde)) extract(year FROM vigencia_desde)::int, uit, base_legal, observaciones FROM public.historial_normativo ORDER BY extract(year FROM vigencia_desde), vigencia_desde;
COMMENT ON TABLE public.historial_normativo IS 'DEPRECATED: replaced by normativa_rmv and normativa_uit';
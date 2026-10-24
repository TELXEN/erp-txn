CREATE TABLE public.historial_normativo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_desde date NOT NULL UNIQUE,
  rmv numeric(10,2) NOT NULL,
  uit numeric(10,2) NOT NULL,
  base_legal text NOT NULL DEFAULT '',
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historial_normativo TO authenticated;
GRANT ALL ON public.historial_normativo TO service_role;
ALTER TABLE public.historial_normativo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee normativa" ON public.historial_normativo FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "Admin/gerencia gestiona normativa" ON public.historial_normativo FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER historial_normativo_updated BEFORE UPDATE ON public.historial_normativo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.historial_normativo (vigencia_desde, rmv, uit, base_legal) VALUES
 ('2022-05-01', 1025, 4600, 'D.S. N° 003-2022-TR'),
 ('2025-01-01', 1130, 5350, 'D.S. N° 006-2024-TR / D.S. N° 260-2024-EF'),
 ('2026-01-01', 1130, 5500, 'UIT 2026'),
 ('2026-10-01', 1230, 5500, 'Incremento RMV');
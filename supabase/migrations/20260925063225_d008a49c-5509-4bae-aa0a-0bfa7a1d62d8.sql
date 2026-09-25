CREATE TABLE public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'MAT' CHECK (tipo IN ('MO','MAT','EQ','SC')),
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  unidad text NOT NULL DEFAULT 'und',
  precio numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos TO authenticated;
GRANT ALL ON public.insumos TO service_role;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insumos_select" ON public.insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_manage" ON public.insumos FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_insumos_updated_at BEFORE UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partidas_maestras
  ADD COLUMN rendimiento numeric NOT NULL DEFAULT 1,
  ADD COLUMN jornada numeric NOT NULL DEFAULT 8,
  ADD COLUMN pct_herramientas numeric NOT NULL DEFAULT 3;

CREATE TABLE public.apu_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_maestra_id uuid NOT NULL REFERENCES public.partidas_maestras(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  cuadrilla numeric NOT NULL DEFAULT 0,
  cantidad numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apu_componentes_partida_idx ON public.apu_componentes(partida_maestra_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apu_componentes TO authenticated;
GRANT ALL ON public.apu_componentes TO service_role;
ALTER TABLE public.apu_componentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apu_select" ON public.apu_componentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "apu_manage" ON public.apu_componentes FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_apu_componentes_updated_at BEFORE UPDATE ON public.apu_componentes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
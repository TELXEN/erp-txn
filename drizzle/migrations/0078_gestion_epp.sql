CREATE TABLE public.epp_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'Cabeza',
  marca text NOT NULL DEFAULT '',
  norma text NOT NULL DEFAULT '',
  tallas text NOT NULL DEFAULT '',
  criticidad text NOT NULL DEFAULT 'Media',
  vida_util_dias integer NOT NULL DEFAULT 180,
  costo_unitario numeric NOT NULL DEFAULT 0,
  stock numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epp_catalogo TO authenticated;
GRANT ALL ON public.epp_catalogo TO service_role;
ALTER TABLE public.epp_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epp catalogo admin" ON public.epp_catalogo FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.epp_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE CASCADE,
  epp_id uuid NOT NULL REFERENCES public.epp_catalogo(id) ON DELETE RESTRICT,
  fecha_entrega date NOT NULL DEFAULT CURRENT_DATE,
  cantidad numeric NOT NULL DEFAULT 1,
  talla text NOT NULL DEFAULT '',
  motivo text NOT NULL DEFAULT 'Dotación inicial',
  fecha_renovacion date,
  fecha_devolucion date,
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epp_entregas TO authenticated;
GRANT ALL ON public.epp_entregas TO service_role;
ALTER TABLE public.epp_entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epp entregas admin" ON public.epp_entregas FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE INDEX epp_entregas_trab_idx ON public.epp_entregas(trabajador_id);
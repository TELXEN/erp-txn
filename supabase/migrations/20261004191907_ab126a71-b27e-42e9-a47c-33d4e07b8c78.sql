CREATE TABLE public.sire_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  usuario_sol text NOT NULL DEFAULT '',
  tiene_secret boolean NOT NULL DEFAULT false,
  tiene_clave boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sire_config TO authenticated;
GRANT ALL ON public.sire_config TO service_role;
ALTER TABLE public.sire_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerente gestiona config SIRE" ON public.sire_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));
CREATE TRIGGER update_sire_config_updated_at BEFORE UPDATE ON public.sire_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sire_credenciales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_secret text,
  clave_sol text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sire_credenciales TO service_role;
ALTER TABLE public.sire_credenciales ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sire_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libro text NOT NULL CHECK (libro IN ('RVIE','RCE')),
  periodo text NOT NULL,
  estado text NOT NULL DEFAULT 'Sincronizado',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_base numeric NOT NULL DEFAULT 0,
  total_igv numeric NOT NULL DEFAULT 0,
  total_docs integer NOT NULL DEFAULT 0,
  sincronizado_en timestamptz,
  aceptado_por uuid,
  aceptado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (libro, periodo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sire_periodos TO authenticated;
GRANT ALL ON public.sire_periodos TO service_role;
ALTER TABLE public.sire_periodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin y gerente gestionan periodos SIRE" ON public.sire_periodos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_sire_periodos_updated_at BEFORE UPDATE ON public.sire_periodos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
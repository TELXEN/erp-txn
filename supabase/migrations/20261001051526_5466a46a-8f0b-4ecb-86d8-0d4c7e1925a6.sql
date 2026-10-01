ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS sueldo_mensual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regimen_laboral text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS categoria_obrero text,
  ADD COLUMN IF NOT EXISTS asignacion_familiar boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.parametros_laborales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rmv numeric NOT NULL DEFAULT 1130,
  essalud_pct numeric NOT NULL DEFAULT 9,
  sctr_pct numeric NOT NULL DEFAULT 1.5,
  vida_ley_pct numeric NOT NULL DEFAULT 0.53,
  horas_semanales numeric NOT NULL DEFAULT 48,
  feriados_anuales numeric NOT NULL DEFAULT 12,
  jornal_operario numeric NOT NULL DEFAULT 103.20,
  jornal_oficial numeric NOT NULL DEFAULT 89.20,
  jornal_peon numeric NOT NULL DEFAULT 79.80,
  buc_operario_pct numeric NOT NULL DEFAULT 32,
  buc_oficial_pct numeric NOT NULL DEFAULT 30,
  buc_peon_pct numeric NOT NULL DEFAULT 30,
  pasaje_diario numeric NOT NULL DEFAULT 7.20,
  herramienta_pct numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parametros_laborales TO authenticated;
GRANT ALL ON public.parametros_laborales TO service_role;
ALTER TABLE public.parametros_laborales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados pueden leer parametros laborales" ON public.parametros_laborales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo gerente edita parametros laborales" ON public.parametros_laborales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gerente')) WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE TRIGGER update_parametros_laborales_updated_at BEFORE UPDATE ON public.parametros_laborales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.parametros_laborales (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.parametros_laborales);

CREATE TABLE IF NOT EXISTS public.codificacion_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digito_mo int NOT NULL DEFAULT 1,
  digito_mat int NOT NULL DEFAULT 2,
  digito_eq int NOT NULL DEFAULT 3,
  digito_ht int NOT NULL DEFAULT 4,
  digito_sc int NOT NULL DEFAULT 5,
  correlativo_mo bigint NOT NULL DEFAULT 0,
  correlativo_mat bigint NOT NULL DEFAULT 0,
  correlativo_eq bigint NOT NULL DEFAULT 0,
  correlativo_ht bigint NOT NULL DEFAULT 0,
  correlativo_sc bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.codificacion_insumo TO authenticated;
GRANT ALL ON public.codificacion_insumo TO service_role;
ALTER TABLE public.codificacion_insumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados pueden leer codificacion de insumos" ON public.codificacion_insumo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo gerente edita codificacion de insumos" ON public.codificacion_insumo FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gerente')) WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE TRIGGER update_codificacion_insumo_updated_at BEFORE UPDATE ON public.codificacion_insumo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.codificacion_insumo (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.codificacion_insumo);

CREATE OR REPLACE FUNCTION public.siguiente_codigo_insumo(_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.codificacion_insumo%ROWTYPE;
  digito int;
  correlativo bigint;
BEGIN
  IF _tipo NOT IN ('MO','MAT','EQ','HT','SC') THEN
    RAISE EXCEPTION 'Tipo de insumo no válido';
  END IF;
  SELECT * INTO cfg FROM public.codificacion_insumo ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.codificacion_insumo DEFAULT VALUES RETURNING * INTO cfg;
  END IF;
  IF _tipo = 'MO' THEN digito := cfg.digito_mo; correlativo := cfg.correlativo_mo + 1;
  ELSIF _tipo = 'MAT' THEN digito := cfg.digito_mat; correlativo := cfg.correlativo_mat + 1;
  ELSIF _tipo = 'EQ' THEN digito := cfg.digito_eq; correlativo := cfg.correlativo_eq + 1;
  ELSIF _tipo = 'HT' THEN digito := cfg.digito_ht; correlativo := cfg.correlativo_ht + 1;
  ELSE digito := cfg.digito_sc; correlativo := cfg.correlativo_sc + 1;
  END IF;
  UPDATE public.codificacion_insumo SET
    correlativo_mo = CASE WHEN _tipo = 'MO' THEN correlativo ELSE correlativo_mo END,
    correlativo_mat = CASE WHEN _tipo = 'MAT' THEN correlativo ELSE correlativo_mat END,
    correlativo_eq = CASE WHEN _tipo = 'EQ' THEN correlativo ELSE correlativo_eq END,
    correlativo_ht = CASE WHEN _tipo = 'HT' THEN correlativo ELSE correlativo_ht END,
    correlativo_sc = CASE WHEN _tipo = 'SC' THEN correlativo ELSE correlativo_sc END,
    updated_at = now()
  WHERE id = cfg.id;
  RETURN digito::text || lpad(correlativo::text, 7, '0');
END;
$function$;
REVOKE ALL ON FUNCTION public.siguiente_codigo_insumo(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_insumo(text) TO service_role;
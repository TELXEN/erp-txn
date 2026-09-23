CREATE TABLE public.codificacion_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefijo text NOT NULL DEFAULT 'PRY',
  incluir_anio boolean NOT NULL DEFAULT true,
  separador text NOT NULL DEFAULT '-',
  digitos integer NOT NULL DEFAULT 3,
  correlativo_actual integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.codificacion_config TO authenticated;
GRANT ALL ON public.codificacion_config TO service_role;

ALTER TABLE public.codificacion_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de codificacion para autenticados"
  ON public.codificacion_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion de codificacion admin o gerente"
  ON public.codificacion_config FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid()))
  WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TRIGGER update_codificacion_config_updated_at
  BEFORE UPDATE ON public.codificacion_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.codificacion_config (prefijo, incluir_anio, separador, digitos, correlativo_actual)
VALUES ('PRY', true, '-', 3, 0);

ALTER TABLE public.proyectos ADD COLUMN codigo text;
CREATE UNIQUE INDEX proyectos_codigo_unico ON public.proyectos (codigo) WHERE codigo IS NOT NULL;

CREATE OR REPLACE FUNCTION public.siguiente_codigo_proyecto()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cfg public.codificacion_config%ROWTYPE;
        candidato text;
BEGIN
  SELECT * INTO cfg FROM public.codificacion_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.codificacion_config DEFAULT VALUES RETURNING * INTO cfg;
  END IF;

  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio THEN cfg.separador || to_char(now(), 'YYYY') ELSE '' END
      || cfg.separador
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.proyectos WHERE codigo = candidato);
  END LOOP;

  UPDATE public.codificacion_config SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END;
$$;

GRANT EXECUTE ON FUNCTION public.siguiente_codigo_proyecto() TO authenticated;
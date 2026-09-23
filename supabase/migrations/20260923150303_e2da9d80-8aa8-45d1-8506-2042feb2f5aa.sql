CREATE TABLE public.partidas_maestras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  especialidad text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'glb',
  precio_unitario numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partidas_maestras TO authenticated;
GRANT ALL ON public.partidas_maestras TO service_role;
ALTER TABLE public.partidas_maestras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partidas_maestras_select" ON public.partidas_maestras FOR SELECT TO authenticated USING (true);
CREATE POLICY "partidas_maestras_manage" ON public.partidas_maestras FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_partidas_maestras_updated_at BEFORE UPDATE ON public.partidas_maestras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.codificacion_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefijo text NOT NULL DEFAULT 'COT',
  incluir_anio boolean NOT NULL DEFAULT true,
  separador text NOT NULL DEFAULT '-',
  digitos integer NOT NULL DEFAULT 3,
  correlativo_actual integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.codificacion_cotizacion TO authenticated;
GRANT ALL ON public.codificacion_cotizacion TO service_role;
ALTER TABLE public.codificacion_cotizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codificacion_cotizacion_select" ON public.codificacion_cotizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "codificacion_cotizacion_manage" ON public.codificacion_cotizacion FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_codificacion_cotizacion_updated_at BEFORE UPDATE ON public.codificacion_cotizacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.codificacion_cotizacion DEFAULT VALUES;

CREATE TABLE public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  cliente_id uuid REFERENCES public.terceros(id) ON DELETE SET NULL,
  cliente text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  ubicacion text NOT NULL DEFAULT '',
  fecha_emision date NOT NULL DEFAULT current_date,
  validez_dias integer NOT NULL DEFAULT 15,
  pct_gastos_generales numeric NOT NULL DEFAULT 0,
  pct_utilidad numeric NOT NULL DEFAULT 0,
  moneda moneda NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric NOT NULL DEFAULT 1,
  condiciones text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Borrador',
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cotizaciones_codigo_unico ON public.cotizaciones (codigo) WHERE codigo IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizaciones TO authenticated;
GRANT ALL ON public.cotizaciones TO service_role;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotizaciones_select" ON public.cotizaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "cotizaciones_manage" ON public.cotizaciones FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_cotizaciones_updated_at BEFORE UPDATE ON public.cotizaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cotizacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  especialidad text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'glb',
  metrado numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cotizacion_items_cotizacion_idx ON public.cotizacion_items (cotizacion_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizacion_items TO authenticated;
GRANT ALL ON public.cotizacion_items TO service_role;
ALTER TABLE public.cotizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotizacion_items_select" ON public.cotizacion_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "cotizacion_items_manage" ON public.cotizacion_items FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_cotizacion_items_updated_at BEFORE UPDATE ON public.cotizacion_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.siguiente_codigo_cotizacion()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cfg public.codificacion_cotizacion%ROWTYPE;
        candidato text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para generar codigos de cotizacion';
  END IF;

  SELECT * INTO cfg FROM public.codificacion_cotizacion ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.codificacion_cotizacion DEFAULT VALUES RETURNING * INTO cfg;
  END IF;

  LOOP
    cfg.correlativo_actual := cfg.correlativo_actual + 1;
    candidato := cfg.prefijo
      || CASE WHEN cfg.incluir_anio THEN cfg.separador || to_char(now(), 'YYYY') ELSE '' END
      || cfg.separador
      || lpad(cfg.correlativo_actual::text, GREATEST(cfg.digitos, 1), '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cotizaciones WHERE codigo = candidato);
  END LOOP;

  UPDATE public.codificacion_cotizacion SET correlativo_actual = cfg.correlativo_actual WHERE id = cfg.id;
  RETURN candidato;
END;
$$;
REVOKE ALL ON FUNCTION public.siguiente_codigo_cotizacion() FROM public;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_cotizacion() TO authenticated;
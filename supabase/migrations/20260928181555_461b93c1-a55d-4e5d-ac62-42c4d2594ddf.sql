CREATE TABLE public.series_comprobante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_comprobante text NOT NULL CHECK (tipo_comprobante IN ('01','03','07','08')),
  serie text NOT NULL,
  correlativo_actual bigint NOT NULL DEFAULT 0 CHECK (correlativo_actual >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_comprobante, serie),
  CHECK (
    (tipo_comprobante = '01' AND serie ~ '^F[A-Z0-9]{3}$') OR
    (tipo_comprobante = '03' AND serie ~ '^B[A-Z0-9]{3}$') OR
    (tipo_comprobante = '07' AND serie ~ '^[FB][A-Z0-9]{3}$') OR
    (tipo_comprobante = '08' AND serie ~ '^[FB][A-Z0-9]{3}$')
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_comprobante TO authenticated;
GRANT ALL ON public.series_comprobante TO service_role;
ALTER TABLE public.series_comprobante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administracion gestiona series de comprobante" ON public.series_comprobante FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_series_comprobante_updated_at BEFORE UPDATE ON public.series_comprobante FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.series_comprobante (tipo_comprobante, serie) VALUES
  ('01', 'F001'),
  ('03', 'B001'),
  ('07', 'FC01'),
  ('08', 'FD01');

CREATE TABLE public.comprobantes_electronicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_comprobante text NOT NULL CHECK (tipo_comprobante IN ('01','03','07','08')),
  serie text NOT NULL,
  correlativo bigint NOT NULL CHECK (correlativo > 0),
  numero text NOT NULL UNIQUE,
  preliquidacion_id uuid REFERENCES public.preliquidaciones(id) ON DELETE SET NULL,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.terceros(id) ON DELETE RESTRICT,
  comprobante_referencia_id uuid REFERENCES public.comprobantes_electronicos(id) ON DELETE RESTRICT,
  motivo_nota_codigo text NOT NULL DEFAULT '',
  motivo_nota_descripcion text NOT NULL DEFAULT '',
  fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  moneda public.moneda NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric NOT NULL DEFAULT 1 CHECK (tipo_cambio > 0),
  operacion_tipo text NOT NULL DEFAULT 'gravada' CHECK (operacion_tipo IN ('gravada','exonerada','inafecta')),
  valor_venta numeric NOT NULL DEFAULT 0 CHECK (valor_venta >= 0),
  total_descuentos numeric NOT NULL DEFAULT 0 CHECK (total_descuentos >= 0),
  igv numeric NOT NULL DEFAULT 0 CHECK (igv >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  total_soles numeric NOT NULL DEFAULT 0 CHECK (total_soles >= 0),
  total_letras text NOT NULL DEFAULT '',
  condicion_pago text NOT NULL DEFAULT 'Contado' CHECK (condicion_pago IN ('Contado','Crédito')),
  dias_credito integer NOT NULL DEFAULT 0 CHECK (dias_credito >= 0),
  tipo_tributario text NOT NULL DEFAULT 'ninguno' CHECK (tipo_tributario IN ('detraccion','retencion','ninguno')),
  codigo_spot text NOT NULL DEFAULT '',
  pct_detraccion numeric NOT NULL DEFAULT 0 CHECK (pct_detraccion >= 0 AND pct_detraccion <= 100),
  monto_detraccion numeric NOT NULL DEFAULT 0 CHECK (monto_detraccion >= 0),
  monto_retencion numeric NOT NULL DEFAULT 0 CHECK (monto_retencion >= 0),
  detraccion_estado text NOT NULL DEFAULT 'No aplica' CHECK (detraccion_estado IN ('No aplica','Pendiente','Depositada')),
  detraccion_fecha date,
  detraccion_constancia text NOT NULL DEFAULT '',
  orden_compra text NOT NULL DEFAULT '',
  observacion text NOT NULL DEFAULT '',
  estado_fiscal text NOT NULL DEFAULT 'Borrador' CHECK (estado_fiscal IN ('Borrador','Emitido - Pendiente SUNAT','Aceptado con CDR','Observado','Rechazado','Anulado con Nota de Crédito')),
  estado_pago public.estado_venta NOT NULL DEFAULT 'Pendiente de Pago',
  fecha_pago date,
  banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  numero_operacion text NOT NULL DEFAULT '',
  hash_cpe text NOT NULL DEFAULT '',
  qr_payload text NOT NULL DEFAULT '',
  xml_url text NOT NULL DEFAULT '',
  cdr_url text NOT NULL DEFAULT '',
  cdr_codigo text NOT NULL DEFAULT '',
  cdr_descripcion text NOT NULL DEFAULT '',
  proveedor_envio text NOT NULL DEFAULT '',
  payload_fiscal jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_comprobante, serie, correlativo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobantes_electronicos TO authenticated;
GRANT ALL ON public.comprobantes_electronicos TO service_role;
ALTER TABLE public.comprobantes_electronicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administracion gestiona comprobantes electronicos" ON public.comprobantes_electronicos FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_comprobantes_electronicos_updated_at BEFORE UPDATE ON public.comprobantes_electronicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.comprobante_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.comprobantes_electronicos(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  codigo text NOT NULL DEFAULT '',
  descripcion text NOT NULL,
  unidad_sunat text NOT NULL DEFAULT 'ZZ',
  cantidad numeric NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  valor_unitario numeric NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
  descuento numeric NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  afectacion_igv text NOT NULL DEFAULT '10' CHECK (afectacion_igv IN ('10','20','30')),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  igv numeric NOT NULL DEFAULT 0 CHECK (igv >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobante_items TO authenticated;
GRANT ALL ON public.comprobante_items TO service_role;
ALTER TABLE public.comprobante_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administracion gestiona items de comprobante" ON public.comprobante_items FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_comprobante_items_updated_at BEFORE UPDATE ON public.comprobante_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.comprobante_cuotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.comprobantes_electronicos(id) ON DELETE CASCADE,
  numero integer NOT NULL CHECK (numero > 0),
  fecha_vencimiento date NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comprobante_id, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobante_cuotas TO authenticated;
GRANT ALL ON public.comprobante_cuotas TO service_role;
ALTER TABLE public.comprobante_cuotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administracion gestiona cuotas de comprobante" ON public.comprobante_cuotas FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_comprobante_cuotas_updated_at BEFORE UPDATE ON public.comprobante_cuotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ventas ADD COLUMN comprobante_electronico_id uuid REFERENCES public.comprobantes_electronicos(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX ventas_comprobante_electronico_unique ON public.ventas(comprobante_electronico_id) WHERE comprobante_electronico_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.siguiente_numero_comprobante(_tipo text, _serie text)
RETURNS TABLE(correlativo bigint, numero text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  siguiente bigint;
BEGIN
  IF _tipo NOT IN ('01','03','07','08') THEN
    RAISE EXCEPTION 'Tipo de comprobante no válido';
  END IF;

  UPDATE public.series_comprobante
     SET correlativo_actual = correlativo_actual + 1,
         updated_at = now()
   WHERE tipo_comprobante = _tipo
     AND serie = upper(trim(_serie))
     AND activo = true
   RETURNING correlativo_actual INTO siguiente;

  IF siguiente IS NULL THEN
    RAISE EXCEPTION 'La serie no existe o está inactiva';
  END IF;

  RETURN QUERY SELECT siguiente, upper(trim(_serie)) || '-' || lpad(siguiente::text, 8, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.siguiente_numero_comprobante(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.siguiente_numero_comprobante(text, text) TO service_role;
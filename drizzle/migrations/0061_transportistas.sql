CREATE TABLE public.transportistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc text NOT NULL UNIQUE,
  razon_social text NOT NULL,
  direccion text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  estado_sunat text NOT NULL DEFAULT '',
  condicion_sunat text NOT NULL DEFAULT '',
  registro_mtc text NOT NULL DEFAULT '',
  certificado_habilitacion text NOT NULL DEFAULT '',
  certificado_vencimiento date,
  entidad_autorizacion text NOT NULL DEFAULT '',
  numero_autorizacion text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transportista_vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transportista_id uuid NOT NULL REFERENCES public.transportistas(id) ON DELETE CASCADE,
  placa text NOT NULL,
  placa_secundaria text NOT NULL DEFAULT '',
  marca text NOT NULL DEFAULT '',
  tarjeta_circulacion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transportista_conductores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transportista_id uuid NOT NULL REFERENCES public.transportistas(id) ON DELETE CASCADE,
  nombres text NOT NULL,
  apellidos text NOT NULL DEFAULT '',
  tipo_documento text NOT NULL DEFAULT 'DNI',
  numero_documento text NOT NULL,
  licencia text NOT NULL,
  categoria_licencia text NOT NULL DEFAULT '',
  licencia_vencimiento date,
  celular text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportistas, public.transportista_vehiculos, public.transportista_conductores TO authenticated;
GRANT ALL ON public.transportistas, public.transportista_vehiculos, public.transportista_conductores TO service_role;
ALTER TABLE public.transportistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportista_vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportista_conductores ENABLE ROW LEVEL SECURITY;
CREATE POLICY transportistas_personal ON public.transportistas FOR ALL TO authenticated USING (public.es_personal(auth.uid())) WITH CHECK (public.es_personal(auth.uid()));
CREATE POLICY tveh_personal ON public.transportista_vehiculos FOR ALL TO authenticated USING (public.es_personal(auth.uid())) WITH CHECK (public.es_personal(auth.uid()));
CREATE POLICY tcond_personal ON public.transportista_conductores FOR ALL TO authenticated USING (public.es_personal(auth.uid())) WITH CHECK (public.es_personal(auth.uid()));
CREATE TABLE public.vehiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  anio INTEGER,
  tipo TEXT NOT NULL DEFAULT 'Camioneta',
  propiedad TEXT NOT NULL DEFAULT 'Propio',
  proveedor_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  km_actual NUMERIC NOT NULL DEFAULT 0,
  soat_vencimiento DATE,
  revision_tecnica_vencimiento DATE,
  tarifa_dia NUMERIC NOT NULL DEFAULT 0,
  tarifa_km NUMERIC NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Operativo',
  observacion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehiculos TO authenticated;
GRANT ALL ON public.vehiculos TO service_role;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven la flota" ON public.vehiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y gerente gestionan vehiculos" ON public.vehiculos FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_vehiculos_updated_at BEFORE UPDATE ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tareo_vehiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  conductor_id UUID REFERENCES public.trabajadores(id) ON DELETE SET NULL,
  dias NUMERIC NOT NULL DEFAULT 1,
  km NUMERIC NOT NULL DEFAULT 0,
  costo_soles NUMERIC NOT NULL DEFAULT 0,
  observacion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareo_vehiculos TO authenticated;
GRANT ALL ON public.tareo_vehiculos TO service_role;
ALTER TABLE public.tareo_vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven el tareo vehicular" ON public.tareo_vehiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos registran tareo vehicular" ON public.tareo_vehiculos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin y gerente editan tareo vehicular" ON public.tareo_vehiculos FOR UPDATE TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin y gerente borran tareo vehicular" ON public.tareo_vehiculos FOR DELETE TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_tareo_vehiculos_updated_at BEFORE UPDATE ON public.tareo_vehiculos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.traslados_vehiculo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  conductor_id UUID REFERENCES public.trabajadores(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,
  origen TEXT NOT NULL DEFAULT '',
  destino TEXT NOT NULL DEFAULT '',
  km_inicial NUMERIC NOT NULL DEFAULT 0,
  km_final NUMERIC NOT NULL DEFAULT 0,
  carga TEXT NOT NULL DEFAULT '',
  combustible_galones NUMERIC NOT NULL DEFAULT 0,
  combustible_monto NUMERIC NOT NULL DEFAULT 0,
  observacion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traslados_vehiculo TO authenticated;
GRANT ALL ON public.traslados_vehiculo TO service_role;
ALTER TABLE public.traslados_vehiculo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven los traslados" ON public.traslados_vehiculo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos registran traslados" ON public.traslados_vehiculo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin y gerente editan traslados" ON public.traslados_vehiculo FOR UPDATE TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Admin y gerente borran traslados" ON public.traslados_vehiculo FOR DELETE TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_traslados_vehiculo_updated_at BEFORE UPDATE ON public.traslados_vehiculo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mantenimientos_vehiculo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL DEFAULT 'Preventivo',
  taller_id UUID REFERENCES public.terceros(id) ON DELETE SET NULL,
  costo NUMERIC NOT NULL DEFAULT 0,
  km NUMERIC NOT NULL DEFAULT 0,
  detalle TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mantenimientos_vehiculo TO authenticated;
GRANT ALL ON public.mantenimientos_vehiculo TO service_role;
ALTER TABLE public.mantenimientos_vehiculo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven mantenimientos" ON public.mantenimientos_vehiculo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y gerente gestionan mantenimientos" ON public.mantenimientos_vehiculo FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_mantenimientos_vehiculo_updated_at BEFORE UPDATE ON public.mantenimientos_vehiculo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_mantenimiento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cada_km NUMERIC,
  cada_meses INTEGER,
  ultimo_km NUMERIC NOT NULL DEFAULT 0,
  ultima_fecha DATE,
  proximo_km NUMERIC,
  proxima_fecha DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_mantenimiento TO authenticated;
GRANT ALL ON public.plan_mantenimiento TO service_role;
ALTER TABLE public.plan_mantenimiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos ven el plan de mantenimiento" ON public.plan_mantenimiento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y gerente gestionan el plan" ON public.plan_mantenimiento FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_plan_mantenimiento_updated_at BEFORE UPDATE ON public.plan_mantenimiento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
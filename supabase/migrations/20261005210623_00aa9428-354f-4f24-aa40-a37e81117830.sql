ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS multidisciplinaria boolean NOT NULL DEFAULT false;
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS alcance text NOT NULL DEFAULT 'ambos';
ALTER TABLE public.cotizacion_items ADD COLUMN IF NOT EXISTS grupo text NOT NULL DEFAULT '';
ALTER TABLE public.categorias_partida ADD COLUMN IF NOT EXISTS grupo text NOT NULL DEFAULT '';

CREATE TABLE public.grupos_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_cotizacion TO authenticated;
GRANT ALL ON public.grupos_cotizacion TO service_role;
ALTER TABLE public.grupos_cotizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grupos_cotizacion_select" ON public.grupos_cotizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "grupos_cotizacion_manage" ON public.grupos_cotizacion FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_grupos_cotizacion_updated_at BEFORE UPDATE ON public.grupos_cotizacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.grupos_cotizacion (nombre, orden) VALUES ('SUMINISTRO DE MATERIALES', 1), ('MONTAJE ELECTROMECÁNICO', 2);

CREATE TABLE public.plantillas_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  multidisciplinaria boolean NOT NULL DEFAULT false,
  alcance text NOT NULL DEFAULT 'ambos',
  pct_gastos_generales numeric NOT NULL DEFAULT 10,
  pct_utilidad numeric NOT NULL DEFAULT 10,
  condiciones text NOT NULL DEFAULT '',
  condiciones_pago text NOT NULL DEFAULT '',
  recursos_humanos text NOT NULL DEFAULT '',
  tiempo_ejecucion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantillas_cotizacion TO authenticated;
GRANT ALL ON public.plantillas_cotizacion TO service_role;
ALTER TABLE public.plantillas_cotizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plantillas_cotizacion_select" ON public.plantillas_cotizacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "plantillas_cotizacion_manage" ON public.plantillas_cotizacion FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE TRIGGER update_plantillas_cotizacion_updated_at BEFORE UPDATE ON public.plantillas_cotizacion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plantilla_cotizacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id uuid NOT NULL REFERENCES public.plantillas_cotizacion(id) ON DELETE CASCADE,
  padre_id uuid REFERENCES public.plantilla_cotizacion_items(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT '',
  grupo text NOT NULL DEFAULT '',
  especialidad text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT '',
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL DEFAULT '',
  marca text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT '',
  metrado numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantilla_cotizacion_items TO authenticated;
GRANT ALL ON public.plantilla_cotizacion_items TO service_role;
ALTER TABLE public.plantilla_cotizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plantilla_items_select" ON public.plantilla_cotizacion_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "plantilla_items_manage" ON public.plantilla_cotizacion_items FOR ALL TO authenticated USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

INSERT INTO public.plantillas_cotizacion (nombre, descripcion) VALUES
 ('Líneas de media tensión', 'Redes aéreas/subterráneas de MT'),
 ('Montaje de tableros en sala', 'Plantas, tableros y salas eléctricas'),
 ('Subestaciones', 'Subestaciones de distribución y potencia'),
 ('Edificaciones', 'Instalaciones eléctricas en edificaciones');

UPDATE public.cotizaciones c SET multidisciplinaria = true
WHERE (SELECT count(DISTINCT nullif(especialidad,'')) FROM public.cotizacion_items i WHERE i.cotizacion_id = c.id) > 1;
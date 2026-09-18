
CREATE TYPE public.app_role AS ENUM ('ingeniero','administrador','gerente');
CREATE TYPE public.moneda AS ENUM ('PEN','USD');
CREATE TYPE public.categoria_obrero AS ENUM ('Operario','Oficial','Peon');
CREATE TYPE public.estado_venta AS ENUM ('Pagado','Pendiente de Pago');
CREATE TYPE public.estado_proyecto AS ENUM ('En Ejecucion','Finalizado');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_o_gerente(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrador','gerente'))
$$;

CREATE POLICY "perfiles visibles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "editar propio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "gerente edita perfiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));

CREATE POLICY "roles visibles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerente gestiona roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gerente')) WITH CHECK (public.has_role(auth.uid(),'gerente'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE es_primero boolean;
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email);
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO es_primero;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN es_primero THEN 'gerente'::public.app_role ELSE 'ingeniero'::public.app_role END);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cliente text NOT NULL DEFAULT '',
  ubicacion text NOT NULL DEFAULT '',
  estado public.estado_proyecto NOT NULL DEFAULT 'En Ejecucion',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proyectos TO authenticated;
GRANT ALL ON public.proyectos TO service_role;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proyectos visibles" ON public.proyectos FOR SELECT TO authenticated USING (true);
CREATE POLICY "proyectos gestion" ON public.proyectos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  especialidad text NOT NULL,
  presupuesto_inicial numeric(14,2) NOT NULL DEFAULT 0,
  avance_pct numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partidas TO authenticated;
GRANT ALL ON public.partidas TO service_role;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partidas visibles" ON public.partidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "partidas gestion" ON public.partidas FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "ingeniero actualiza avance" ON public.partidas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'ingeniero')) WITH CHECK (public.has_role(auth.uid(),'ingeniero'));

CREATE OR REPLACE FUNCTION public.proteger_partida()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_o_gerente(auth.uid()) THEN
    IF NEW.nombre IS DISTINCT FROM OLD.nombre
       OR NEW.especialidad IS DISTINCT FROM OLD.especialidad
       OR NEW.presupuesto_inicial IS DISTINCT FROM OLD.presupuesto_inicial
       OR NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id THEN
      RAISE EXCEPTION 'El ingeniero de campo solo puede modificar el %% de avance fisico';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_proteger_partida BEFORE UPDATE ON public.partidas
FOR EACH ROW EXECUTE FUNCTION public.proteger_partida();

CREATE TABLE public.trabajadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria public.categoria_obrero NOT NULL DEFAULT 'Peon',
  jornal_diario numeric(12,2) NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabajadores TO authenticated;
GRANT ALL ON public.trabajadores TO service_role;
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trabajadores gestion" ON public.trabajadores FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.tareos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  partida_id uuid REFERENCES public.partidas(id) ON DELETE SET NULL,
  asistencia numeric(2,1) NOT NULL DEFAULT 1,
  costo_soles numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fecha, trabajador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareos TO authenticated;
GRANT ALL ON public.tareos TO service_role;
ALTER TABLE public.tareos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tareos gestion" ON public.tareos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.gastos_directos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  partida_id uuid NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  proveedor text NOT NULL DEFAULT '',
  monto numeric(14,2) NOT NULL DEFAULT 0,
  moneda public.moneda NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric(8,4) NOT NULL DEFAULT 1,
  monto_soles numeric(14,2) NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos_directos TO authenticated;
GRANT ALL ON public.gastos_directos TO service_role;
ALTER TABLE public.gastos_directos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gastos directos gestion" ON public.gastos_directos FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.gastos_generales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL,
  proveedor text NOT NULL DEFAULT '',
  monto numeric(14,2) NOT NULL DEFAULT 0,
  moneda public.moneda NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric(8,4) NOT NULL DEFAULT 1,
  monto_soles numeric(14,2) NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos_generales TO authenticated;
GRANT ALL ON public.gastos_generales TO service_role;
ALTER TABLE public.gastos_generales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gastos generales gestion" ON public.gastos_generales FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  concepto text NOT NULL,
  monto numeric(14,2) NOT NULL DEFAULT 0,
  moneda public.moneda NOT NULL DEFAULT 'PEN',
  tipo_cambio numeric(8,4) NOT NULL DEFAULT 1,
  monto_soles numeric(14,2) NOT NULL DEFAULT 0,
  numero_factura text NOT NULL DEFAULT '',
  fecha_pago date,
  estado public.estado_venta NOT NULL DEFAULT 'Pendiente de Pago',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventas TO authenticated;
GRANT ALL ON public.ventas TO service_role;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ventas gestion" ON public.ventas FOR ALL TO authenticated
  USING (public.is_admin_o_gerente(auth.uid())) WITH CHECK (public.is_admin_o_gerente(auth.uid()));

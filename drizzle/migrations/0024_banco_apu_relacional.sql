CREATE TABLE public.materiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  descripcion text NOT NULL,
  marca text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'und',
  precio_base numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  costo_unitario numeric GENERATED ALWAYS AS (round(precio_base * (1 + margen/100), 4)) STORED,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mano_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT 'H-H',
  costo_hora numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.equipos_herramientas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  descripcion text NOT NULL,
  tipo text NOT NULL DEFAULT 'propio' CHECK (tipo IN ('propio','alquilado')),
  unidad text NOT NULL DEFAULT 'H-M' CHECK (unidad IN ('H-M','%')),
  costo_hora numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  costo_unitario numeric GENERATED ALWAYS AS (CASE WHEN tipo = 'alquilado' THEN round(costo_hora * (1 + margen/100), 4) ELSE costo_hora END) STORED,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subcontratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT 'glb',
  costo numeric NOT NULL DEFAULT 0,
  margen numeric NOT NULL DEFAULT 0,
  costo_unitario numeric GENERATED ALWAYS AS (round(costo * (1 + margen/100), 4)) STORED,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.partidas_apu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_jerarquico text NOT NULL DEFAULT '',
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT 'und',
  rendimiento_diario numeric NOT NULL DEFAULT 1,
  especialidad text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.partida_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_padre_id uuid NOT NULL REFERENCES public.partidas_apu(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materiales(id) ON DELETE RESTRICT,
  mano_obra_id uuid REFERENCES public.mano_obra(id) ON DELETE RESTRICT,
  equipo_id uuid REFERENCES public.equipos_herramientas(id) ON DELETE RESTRICT,
  subcontrato_id uuid REFERENCES public.subcontratos(id) ON DELETE RESTRICT,
  subpartida_hijo_id uuid REFERENCES public.partidas_apu(id) ON DELETE RESTRICT,
  cantidad_o_cuadrilla numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(material_id, mano_obra_id, equipo_id, subcontrato_id, subpartida_hijo_id) = 1),
  CHECK (subpartida_hijo_id IS NULL OR subpartida_hijo_id <> partida_padre_id)
);
CREATE INDEX ON public.partida_detalle(partida_padre_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['materiales','mano_obra','equipos_herramientas','subcontratos','partidas_apu','partida_detalle'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Lectura autenticados" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Escritura autenticados" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    IF t <> 'partida_detalle' THEN
      EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END IF;
  END LOOP;
END $$;

-- Eliminación segura: si está en uso en partida_detalle se inactiva; si no, se borra.
CREATE OR REPLACE FUNCTION public.quitar_recurso_apu(_tabla text, _id uuid)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE col text; usado boolean;
BEGIN
  col := CASE _tabla
    WHEN 'materiales' THEN 'material_id'
    WHEN 'mano_obra' THEN 'mano_obra_id'
    WHEN 'equipos_herramientas' THEN 'equipo_id'
    WHEN 'subcontratos' THEN 'subcontrato_id'
    WHEN 'partidas_apu' THEN 'subpartida_hijo_id'
    ELSE NULL END;
  IF col IS NULL THEN RAISE EXCEPTION 'Tabla no permitida'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.partida_detalle WHERE %I = $1)', col) INTO usado USING _id;
  IF usado THEN
    EXECUTE format('UPDATE public.%I SET estado = ''inactivo'' WHERE id = $1', _tabla) USING _id;
    RETURN 'inactivado';
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = $1', _tabla) USING _id;
  RETURN 'eliminado';
END $$;
GRANT EXECUTE ON FUNCTION public.quitar_recurso_apu(text, uuid) TO authenticated;

-- Backfill desde el maestro de insumos existente
INSERT INTO public.materiales (codigo, descripcion, unidad, precio_base, margen, estado)
  SELECT codigo, nombre, unidad, precio, margen_pct, CASE WHEN activo THEN 'activo' ELSE 'inactivo' END FROM public.insumos WHERE tipo = 'MAT';
INSERT INTO public.mano_obra (codigo, descripcion, costo_hora, estado)
  SELECT codigo, nombre, precio, CASE WHEN activo THEN 'activo' ELSE 'inactivo' END FROM public.insumos WHERE tipo = 'MO';
INSERT INTO public.equipos_herramientas (codigo, descripcion, tipo, unidad, costo_hora, margen, estado)
  SELECT codigo, nombre, CASE WHEN propiedad = 'Alquilado' THEN 'alquilado' ELSE 'propio' END,
         CASE WHEN tipo = 'HT' THEN '%' ELSE 'H-M' END, precio, margen_pct, CASE WHEN activo THEN 'activo' ELSE 'inactivo' END
  FROM public.insumos WHERE tipo IN ('EQ','HT');
INSERT INTO public.subcontratos (codigo, descripcion, unidad, costo, margen, estado)
  SELECT codigo, nombre, unidad, precio, margen_pct, CASE WHEN activo THEN 'activo' ELSE 'inactivo' END FROM public.insumos WHERE tipo = 'SC';
INSERT INTO public.partidas_apu (codigo_jerarquico, descripcion, unidad, rendimiento_diario, especialidad, estado)
  SELECT codigo, nombre, unidad, rendimiento, especialidad, CASE WHEN activo THEN 'activo' ELSE 'inactivo' END FROM public.partidas_maestras;
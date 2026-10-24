CREATE TABLE public.valorizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  estado text NOT NULL DEFAULT 'Borrador',
  pct_gg numeric NOT NULL DEFAULT 0,
  pct_utilidad numeric NOT NULL DEFAULT 0,
  pct_adelanto numeric NOT NULL DEFAULT 0,
  pct_retencion numeric NOT NULL DEFAULT 0,
  costo_directo numeric NOT NULL DEFAULT 0,
  neto numeric NOT NULL DEFAULT 0,
  firma_nombre text NOT NULL DEFAULT '',
  firma_cargo text NOT NULL DEFAULT '',
  firma_fecha date,
  observacion text NOT NULL DEFAULT '',
  preliquidacion_id uuid REFERENCES public.preliquidaciones(id) ON DELETE SET NULL,
  aprobado_por uuid,
  aprobado_en timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proyecto_id, numero),
  CHECK (estado IN ('Borrador','En revisión','Aprobada','Preliquidada')),
  CHECK (periodo_fin >= periodo_inicio)
);
CREATE TABLE public.valorizacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valorizacion_id uuid NOT NULL REFERENCES public.valorizaciones(id) ON DELETE CASCADE,
  partida_id uuid REFERENCES public.partidas(id) ON DELETE SET NULL,
  codigo text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT '',
  metrado_contratado numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  metrado_actual numeric NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valorizaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valorizacion_items TO authenticated;
GRANT ALL ON public.valorizaciones TO service_role;
GRANT ALL ON public.valorizacion_items TO service_role;
ALTER TABLE public.valorizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valorizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal lee valorizaciones" ON public.valorizaciones FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE POLICY "personal crea valorizaciones" ON public.valorizaciones FOR INSERT TO authenticated WITH CHECK (public.es_personal(auth.uid()) AND estado IN ('Borrador','En revisión'));
CREATE POLICY "personal edita valorizaciones" ON public.valorizaciones FOR UPDATE TO authenticated USING (public.es_personal(auth.uid())) WITH CHECK (public.es_personal(auth.uid()) AND (estado IN ('Borrador','En revisión') OR public.is_admin_o_gerente(auth.uid())));
CREATE POLICY "admin elimina valorizaciones" ON public.valorizaciones FOR DELETE TO authenticated USING (public.is_admin_o_gerente(auth.uid()) AND estado IN ('Borrador','En revisión'));
CREATE POLICY "personal gestiona items valorizacion" ON public.valorizacion_items FOR ALL TO authenticated
  USING (public.es_personal(auth.uid()))
  WITH CHECK (public.es_personal(auth.uid()) AND EXISTS (SELECT 1 FROM public.valorizaciones v WHERE v.id = valorizacion_id AND v.estado IN ('Borrador','En revisión')));

CREATE OR REPLACE FUNCTION public.proteger_valorizacion() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado IN ('Aprobada','Preliquidada') THEN
      IF NEW.estado = 'Preliquidada' AND OLD.estado = 'Aprobada' AND NEW.costo_directo = OLD.costo_directo AND NEW.neto = OLD.neto THEN
        RETURN NEW;
      END IF;
      IF NEW.estado = OLD.estado AND NEW.preliquidacion_id IS DISTINCT FROM OLD.preliquidacion_id AND NEW.neto = OLD.neto THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'La valorización aprobada está congelada y no se puede modificar.';
    END IF;
    IF NEW.estado = 'Aprobada' THEN
      IF NOT public.is_admin_o_gerente(auth.uid()) THEN
        RAISE EXCEPTION 'Solo Administración o Gerencia pueden aprobar valorizaciones.';
      END IF;
      IF btrim(NEW.firma_nombre) = '' OR btrim(NEW.firma_cargo) = '' OR NEW.firma_fecha IS NULL THEN
        RAISE EXCEPTION 'Para aprobar se requiere la firma de conformidad del supervisor (nombre, cargo y fecha).';
      END IF;
      NEW.aprobado_por := auth.uid();
      NEW.aprobado_en := now();
    END IF;
  END IF;
  NEW.pct_gg := round(NEW.pct_gg, 2); NEW.pct_utilidad := round(NEW.pct_utilidad, 2);
  NEW.pct_adelanto := round(NEW.pct_adelanto, 2); NEW.pct_retencion := round(NEW.pct_retencion, 2);
  NEW.costo_directo := round(NEW.costo_directo, 2); NEW.neto := round(NEW.neto, 2);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_proteger_valorizacion BEFORE INSERT OR UPDATE ON public.valorizaciones FOR EACH ROW EXECUTE FUNCTION public.proteger_valorizacion();

CREATE OR REPLACE FUNCTION public.redondear_item_valorizacion() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.metrado_contratado := round(NEW.metrado_contratado, 4);
  NEW.precio_unitario := round(NEW.precio_unitario, 4);
  NEW.metrado_actual := round(NEW.metrado_actual, 4);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_redondear_item_valorizacion BEFORE INSERT OR UPDATE ON public.valorizacion_items FOR EACH ROW EXECUTE FUNCTION public.redondear_item_valorizacion();
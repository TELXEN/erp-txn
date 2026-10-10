ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS cd_base numeric;
COMMENT ON COLUMN public.proyectos.cd_base IS 'Techo de costo directo (línea base). Null = sin techo.';

CREATE TABLE public.control_sobrecosto (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  tolerancia_pct numeric NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.control_sobrecosto TO authenticated;
GRANT ALL ON public.control_sobrecosto TO service_role;
ALTER TABLE public.control_sobrecosto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer control sobrecosto" ON public.control_sobrecosto FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gerencia inserta control" ON public.control_sobrecosto FOR INSERT TO authenticated WITH CHECK (public.is_admin_o_gerente(auth.uid()));
CREATE POLICY "Gerencia edita control" ON public.control_sobrecosto FOR UPDATE TO authenticated USING (public.is_admin_o_gerente(auth.uid()));

CREATE TABLE public.solicitudes_desbloqueo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  partida_id uuid REFERENCES public.partidas(id) ON DELETE CASCADE,
  rubro text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  proveedor text NOT NULL DEFAULT '',
  monto numeric NOT NULL DEFAULT 0,
  exceso numeric NOT NULL DEFAULT 0,
  motivo text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Pendiente',
  solicitado_por uuid DEFAULT auth.uid(),
  resuelto_por uuid,
  resuelto_en timestamptz,
  vence_en timestamptz,
  usada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.solicitudes_desbloqueo (partida_id, estado);
CREATE INDEX ON public.solicitudes_desbloqueo (proyecto_id);
GRANT SELECT, INSERT, UPDATE ON public.solicitudes_desbloqueo TO authenticated;
GRANT ALL ON public.solicitudes_desbloqueo TO service_role;
ALTER TABLE public.solicitudes_desbloqueo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer solicitudes" ON public.solicitudes_desbloqueo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Crear solicitud propia" ON public.solicitudes_desbloqueo FOR INSERT TO authenticated WITH CHECK (solicitado_por = auth.uid() AND estado = 'Pendiente');
CREATE POLICY "Gerencia resuelve" ON public.solicitudes_desbloqueo FOR UPDATE TO authenticated USING (public.is_admin_o_gerente(auth.uid()));

-- Mano de obra presupuestada de un proyecto (APU de sus partidas)
CREATE OR REPLACE FUNCTION public.mo_presupuestada(_proyecto uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(COALESCE(p.metrado,0) * (
    CASE WHEN c.cuadrilla > 0 AND COALESCE(p.rendimiento,0) > 0
      THEN c.cuadrilla * COALESCE(p.jornada,8) / p.rendimiento ELSE COALESCE(c.cantidad,0) END
  ) * COALESCE(i.precio,0) * (1 + COALESCE(i.margen_pct,0)/100)), 0)
  FROM public.partidas p
  JOIN public.apu_componentes c ON c.partida_id = p.id
  JOIN public.insumos i ON i.id = c.insumo_id AND i.tipo = 'MO'
  WHERE p.proyecto_id = _proyecto
$$;

-- Techo de costo directo: suma de partidas hoja <= cd_base
CREATE OR REPLACE FUNCTION public.validar_techo_partidas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE techo numeric; total numeric;
BEGIN
  SELECT cd_base INTO techo FROM public.proyectos WHERE id = NEW.proyecto_id;
  IF techo IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(COALESCE(pa.presupuesto_inicial,0)),0) INTO total
  FROM public.partidas pa
  WHERE pa.proyecto_id = NEW.proyecto_id AND pa.id <> NEW.id
    AND NOT EXISTS (SELECT 1 FROM public.partidas h WHERE h.padre_id = pa.id);
  IF NOT EXISTS (SELECT 1 FROM public.partidas h WHERE h.padre_id = NEW.id) THEN
    total := total + COALESCE(NEW.presupuesto_inicial,0);
  END IF;
  IF total > techo + 0.005 THEN
    RAISE EXCEPTION 'Las partidas suman S/ % y superan el Costo Directo Base de S/ % (exceso S/ %)',
      to_char(total,'FM999,999,990.00'), to_char(techo,'FM999,999,990.00'), to_char(total-techo,'FM999,999,990.00');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_techo_partidas BEFORE INSERT OR UPDATE OF presupuesto_inicial, proyecto_id ON public.partidas
FOR EACH ROW EXECUTE FUNCTION public.validar_techo_partidas();

-- Candado de compras por avance físico + tope de herramientas manuales
CREATE OR REPLACE FUNCTION public.validar_candado_compra()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tol numeric; pres numeric; av numeric; real_ac numeric; limite numeric;
  importe numeric := COALESCE(NEW.monto_soles,0); sol uuid; base_ht numeric; pct_ht numeric;
BEGIN
  IF importe <= 0 OR NEW.proyecto_id IS NULL THEN RETURN NEW; END IF;
  SELECT tolerancia_pct INTO tol FROM public.control_sobrecosto WHERE id;
  tol := COALESCE(tol, 15);

  IF NEW.rubro = 'Herramientas manuales' THEN
    SELECT margen_pct INTO pct_ht FROM public.margenes_insumo WHERE tipo = 'HT';
    base_ht := public.mo_presupuestada(NEW.proyecto_id) * COALESCE(pct_ht,0) / 100;
    SELECT COALESCE(SUM(monto_soles),0) INTO real_ac FROM public.gastos_directos
      WHERE proyecto_id = NEW.proyecto_id AND rubro = 'Herramientas manuales';
    IF real_ac + importe > base_ht + 0.005 THEN
      SELECT id INTO sol FROM public.solicitudes_desbloqueo
        WHERE proyecto_id = NEW.proyecto_id AND rubro = 'Herramientas manuales' AND estado = 'Aprobada'
          AND usada_en IS NULL AND vence_en > now() AND monto >= importe - 0.01
        ORDER BY created_at LIMIT 1;
      IF sol IS NULL THEN
        RAISE EXCEPTION 'SOBRECOSTO|Herramientas manuales superaría su base de S/ % (comprado S/ %). Exceso S/ %',
          to_char(base_ht,'FM999,999,990.00'), to_char(real_ac,'FM999,999,990.00'), to_char(real_ac+importe-base_ht,'FM999,999,990.00');
      END IF;
      UPDATE public.solicitudes_desbloqueo SET usada_en = now(), estado = 'Usada' WHERE id = sol;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.partida_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(presupuesto_inicial,0), COALESCE(avance_pct,0) INTO pres, av FROM public.partidas WHERE id = NEW.partida_id;
  SELECT COALESCE(SUM(monto_soles),0) INTO real_ac FROM public.gastos_directos WHERE partida_id = NEW.partida_id;
  limite := pres * (av/100 + tol/100);
  IF real_ac + importe > limite + 0.005 THEN
    SELECT id INTO sol FROM public.solicitudes_desbloqueo
      WHERE partida_id = NEW.partida_id AND estado = 'Aprobada' AND usada_en IS NULL
        AND vence_en > now() AND monto >= importe - 0.01
      ORDER BY created_at LIMIT 1;
    IF sol IS NULL THEN
      RAISE EXCEPTION 'SOBRECOSTO|Partida bloqueada por sobrecosto: con % %% de avance el límite es S/ % (comprado S/ %). Exceso S/ %',
        to_char(av,'FM990.0'), to_char(limite,'FM999,999,990.00'), to_char(real_ac,'FM999,999,990.00'), to_char(real_ac+importe-limite,'FM999,999,990.00');
    END IF;
    UPDATE public.solicitudes_desbloqueo SET usada_en = now(), estado = 'Usada' WHERE id = sol;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_candado_compra BEFORE INSERT ON public.gastos_directos
FOR EACH ROW EXECUTE FUNCTION public.validar_candado_compra();
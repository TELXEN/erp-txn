CREATE OR REPLACE FUNCTION public.validar_candado_compra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _presupuesto numeric;
  _real numeric;
  _tol numeric := 10;
  _limite numeric;
  _autorizada boolean;
  _tipo text;
  _base_rubro numeric;
  _real_rubro numeric;
  _base_mo numeric;
  _pct_ht numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.monto_soles <= COALESCE(OLD.monto_soles, 0) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.presupuesto_inicial, 0) INTO _presupuesto
  FROM public.partidas p WHERE p.id = NEW.partida_id;

  IF _presupuesto IS NULL OR _presupuesto <= 0 THEN
    RETURN NEW;
  END IF;

  -- Autorizacion vigente de Gerencia (vale para ambos candados)
  SELECT EXISTS (
    SELECT 1 FROM public.solicitudes_desbloqueo s
    WHERE s.partida_id = NEW.partida_id
      AND s.estado = 'Aprobada'
      AND s.usada_en IS NULL
      AND s.vence_en >= now()
      AND s.monto >= NEW.monto_soles
  ) INTO _autorizada;

  -- Candado 1: total de la partida
  SELECT COALESCE(SUM(g.monto_soles), 0) INTO _real
  FROM public.gastos_directos g
  WHERE g.partida_id = NEW.partida_id AND g.id <> NEW.id;

  _limite := _presupuesto * (1 + _tol / 100);

  IF (_real + NEW.monto_soles) > _limite AND NOT _autorizada THEN
    RAISE EXCEPTION 'Compra bloqueada: el costo real superaria en mas del 10%% el presupuesto de la partida (limite S/ %, real S/ %, compra S/ %). Solicite desbloqueo a Gerencia.',
      round(_limite, 2), round(_real, 2), round(NEW.monto_soles, 2);
  END IF;

  -- Candado 2: rubro de la compra vs su propio presupuesto (APU de la partida)
  _tipo := CASE NEW.rubro
    WHEN 'Materiales' THEN 'MAT'
    WHEN 'Subcontratos' THEN 'SC'
    WHEN 'Equipos' THEN 'EQ'
    WHEN 'Herramientas manuales' THEN 'HT'
    ELSE NULL END;

  IF _tipo IS NOT NULL THEN
    IF _tipo = 'HT' THEN
      SELECT COALESCE(SUM(
        COALESCE(p.metrado, 0) *
        CASE WHEN c.cuadrilla > 0 AND COALESCE(p.rendimiento, 0) > 0
             THEN c.cuadrilla * COALESCE(p.jornada, 8) / p.rendimiento
             ELSE c.cantidad END *
        i.precio * (1 + COALESCE(m.margen_pct, 0) / 100)
      ), 0) INTO _base_mo
      FROM public.apu_componentes c
      JOIN public.partidas p ON p.id = c.partida_id
      JOIN public.insumos i ON i.id = c.insumo_id
      LEFT JOIN public.margenes_insumo m ON m.tipo = i.tipo
      WHERE c.partida_id = NEW.partida_id AND i.tipo = 'MO';

      SELECT COALESCE(m.margen_pct, 0) INTO _pct_ht
      FROM public.margenes_insumo m WHERE m.tipo = 'HT';

      _base_rubro := _base_mo * COALESCE(_pct_ht, 0) / 100;
    ELSE
      SELECT COALESCE(SUM(
        COALESCE(p.metrado, 0) *
        CASE WHEN c.cuadrilla > 0 AND COALESCE(p.rendimiento, 0) > 0
             THEN c.cuadrilla * COALESCE(p.jornada, 8) / p.rendimiento
             ELSE c.cantidad END *
        i.precio * (1 + CASE WHEN i.tipo = 'EQ' AND i.propiedad = 'Propio' THEN 0 ELSE COALESCE(m.margen_pct, 0) END / 100)
      ), 0) INTO _base_rubro
      FROM public.apu_componentes c
      JOIN public.partidas p ON p.id = c.partida_id
      JOIN public.insumos i ON i.id = c.insumo_id
      LEFT JOIN public.margenes_insumo m ON m.tipo = i.tipo
      WHERE c.partida_id = NEW.partida_id AND i.tipo = _tipo;
    END IF;

    IF _base_rubro > 0 THEN
      SELECT COALESCE(SUM(g.monto_soles), 0) INTO _real_rubro
      FROM public.gastos_directos g
      WHERE g.partida_id = NEW.partida_id AND g.rubro = NEW.rubro AND g.id <> NEW.id;

      _limite := _base_rubro * (1 + _tol / 100);

      IF (_real_rubro + NEW.monto_soles) > _limite AND NOT _autorizada THEN
        RAISE EXCEPTION 'Compra bloqueada: el rubro % superaria en mas del 10%% su presupuesto (limite S/ %, real S/ %, compra S/ %). Solicite desbloqueo a Gerencia.',
          NEW.rubro, round(_limite, 2), round(_real_rubro, 2), round(NEW.monto_soles, 2);
      END IF;
    END IF;
  END IF;

  IF (_real + NEW.monto_soles) > (_presupuesto * (1 + _tol / 100)) AND _autorizada THEN
    UPDATE public.solicitudes_desbloqueo
    SET usada_en = now()
    WHERE id = (
      SELECT s.id FROM public.solicitudes_desbloqueo s
      WHERE s.partida_id = NEW.partida_id
        AND s.estado = 'Aprobada'
        AND s.usada_en IS NULL
        AND s.vence_en >= now()
        AND s.monto >= NEW.monto_soles
      ORDER BY s.vence_en ASC
      LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$;
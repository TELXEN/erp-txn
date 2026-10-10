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
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.monto_soles <= COALESCE(OLD.monto_soles, 0) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.presupuesto_inicial, 0) INTO _presupuesto
  FROM public.partidas p WHERE p.id = NEW.partida_id;

  IF _presupuesto IS NULL OR _presupuesto <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(g.monto_soles), 0) INTO _real
  FROM public.gastos_directos g
  WHERE g.partida_id = NEW.partida_id AND g.id <> NEW.id;

  _limite := _presupuesto * (1 + _tol / 100);

  IF (_real + NEW.monto_soles) <= _limite THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.solicitudes_desbloqueo s
    WHERE s.partida_id = NEW.partida_id
      AND s.estado = 'Aprobada'
      AND s.usada_en IS NULL
      AND s.vence_el >= CURRENT_DATE
      AND s.monto_autorizado >= NEW.monto_soles
  ) INTO _autorizada;

  IF _autorizada THEN
    UPDATE public.solicitudes_desbloqueo
    SET usada_en = now()
    WHERE id = (
      SELECT s.id FROM public.solicitudes_desbloqueo s
      WHERE s.partida_id = NEW.partida_id
        AND s.estado = 'Aprobada'
        AND s.usada_en IS NULL
        AND s.vence_el >= CURRENT_DATE
        AND s.monto_autorizado >= NEW.monto_soles
      ORDER BY s.vence_el ASC
      LIMIT 1
    );
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Compra bloqueada: el costo real superaria en mas del 10%% el presupuesto de la partida (limite S/ %, real S/ %, compra S/ %). Solicite desbloqueo a Gerencia.',
    round(_limite, 2), round(_real, 2), round(NEW.monto_soles, 2);
END;
$$;
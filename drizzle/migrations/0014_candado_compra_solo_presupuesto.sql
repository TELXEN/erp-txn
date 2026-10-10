CREATE OR REPLACE FUNCTION public.validar_candado_compra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tol numeric; pres numeric; real_ac numeric; limite numeric;
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
  SELECT COALESCE(presupuesto_inicial,0) INTO pres FROM public.partidas WHERE id = NEW.partida_id;
  SELECT COALESCE(SUM(monto_soles),0) INTO real_ac FROM public.gastos_directos WHERE partida_id = NEW.partida_id;
  limite := pres * (1 + tol/100);
  IF real_ac + importe > limite + 0.005 THEN
    SELECT id INTO sol FROM public.solicitudes_desbloqueo
      WHERE partida_id = NEW.partida_id AND estado = 'Aprobada' AND usada_en IS NULL
        AND vence_en > now() AND monto >= importe - 0.01
      ORDER BY created_at LIMIT 1;
    IF sol IS NULL THEN
      RAISE EXCEPTION 'SOBRECOSTO|Partida bloqueada por sobrecosto: el límite es S/ % (presupuesto S/ % + % %% de tolerancia; comprado S/ %). Exceso S/ %',
        to_char(limite,'FM999,999,990.00'), to_char(pres,'FM999,999,990.00'), to_char(tol,'FM990.0'), to_char(real_ac,'FM999,999,990.00'), to_char(real_ac+importe-limite,'FM999,999,990.00');
    END IF;
    UPDATE public.solicitudes_desbloqueo SET usada_en = now(), estado = 'Usada' WHERE id = sol;
  END IF;
  RETURN NEW;
END
$function$;
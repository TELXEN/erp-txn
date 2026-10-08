ALTER TABLE public.empresa_config
  ADD COLUMN rubro text NOT NULL DEFAULT '';

ALTER TABLE public.recibos_honorarios
  ADD COLUMN mes integer NOT NULL DEFAULT 1,
  ADD COLUMN anio integer NOT NULL DEFAULT 2026,
  ADD COLUMN dias_laborados numeric NOT NULL DEFAULT 0,
  ADD COLUMN dias_viaje numeric NOT NULL DEFAULT 0,
  ADD COLUMN horas_extras numeric NOT NULL DEFAULT 0,
  ADD COLUMN otros_remuneraciones numeric NOT NULL DEFAULT 0,
  ADD COLUMN costo_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN saldo_mes_anterior numeric NOT NULL DEFAULT 0,
  ADD COLUMN adelantos numeric NOT NULL DEFAULT 0,
  ADD COLUMN devolucion_gastos numeric NOT NULL DEFAULT 0,
  ADD COLUMN pagos_a_cuenta_planilla numeric NOT NULL DEFAULT 0,
  ADD COLUMN fondo_pensiones numeric NOT NULL DEFAULT 0,
  ADD COLUMN descuento_herramientas numeric NOT NULL DEFAULT 0,
  ADD COLUMN lugar_emision text NOT NULL DEFAULT 'Huancayo';

ALTER TABLE public.recibos_honorarios
  ADD CONSTRAINT recibos_honorarios_mes_valido CHECK (mes BETWEEN 1 AND 12),
  ADD CONSTRAINT recibos_honorarios_anio_valido CHECK (anio BETWEEN 2000 AND 2200),
  ADD CONSTRAINT recibos_honorarios_detalle_no_negativo CHECK (
    dias_laborados >= 0 AND dias_viaje >= 0 AND horas_extras >= 0 AND
    otros_remuneraciones >= 0 AND costo_unitario >= 0 AND saldo_mes_anterior >= 0 AND
    adelantos >= 0 AND devolucion_gastos >= 0 AND pagos_a_cuenta_planilla >= 0 AND
    fondo_pensiones >= 0 AND descuento_herramientas >= 0
  );
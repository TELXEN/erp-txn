ALTER TABLE public.importaciones
  ADD COLUMN tipo_cambio numeric NOT NULL DEFAULT 1,
  ADD COLUMN fecha_liquidacion date,
  ADD COLUMN flete numeric NOT NULL DEFAULT 0,
  ADD COLUMN seguro numeric NOT NULL DEFAULT 0,
  ADD COLUMN pct_percepcion numeric NOT NULL DEFAULT 3.5,
  ADD COLUMN gasto_handling numeric NOT NULL DEFAULT 0,
  ADD COLUMN gasto_almacenaje numeric NOT NULL DEFAULT 0,
  ADD COLUMN gasto_honorarios numeric NOT NULL DEFAULT 0,
  ADD COLUMN gasto_flete_local numeric NOT NULL DEFAULT 0,
  ADD COLUMN gasto_otros numeric NOT NULL DEFAULT 0;
ALTER TABLE public.importacion_items
  ADD COLUMN pct_advalorem numeric NOT NULL DEFAULT 0,
  ADD COLUMN costo_unitario_pen numeric NOT NULL DEFAULT 0;
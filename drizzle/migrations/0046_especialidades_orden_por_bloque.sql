-- El orden de las especialidades se numera por bloque (Ingeniería y Construcción),
-- igual que hacen recodificar_wbs() y mover_item_wbs(). La restricción global UNIQUE (orden)
-- heredada de antes de existir la columna bloque impedía cualquier actualización de la tabla.
ALTER TABLE public.especialidades_partida DROP CONSTRAINT especialidades_partida_orden_uniq;
ALTER TABLE public.especialidades_partida ADD CONSTRAINT especialidades_partida_orden_uniq UNIQUE (bloque, orden) DEFERRABLE INITIALLY DEFERRED;
-- El N° de recibo pasa a ser opcional (se asigna cuando el trabajador emite su recibo)
ALTER TABLE public.recibos_honorarios ALTER COLUMN numero_recibo DROP NOT NULL;

-- La unicidad solo aplica cuando existe número; sin número pueden convivir varias boletas
ALTER TABLE public.recibos_honorarios DROP CONSTRAINT recibos_honorarios_trabajador_id_numero_recibo_key;
CREATE UNIQUE INDEX recibos_honorarios_trabajador_numero_uk
  ON public.recibos_honorarios (trabajador_id, numero_recibo)
  WHERE numero_recibo IS NOT NULL;
ALTER TABLE public.cotizacion_apu_detalle
  ADD COLUMN IF NOT EXISTS codigo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descripcion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS marca text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unidad text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_recurso text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS precio_unitario numeric(14,4);
COMMENT ON COLUMN public.cotizacion_apu_detalle.precio_unitario IS 'Copia fija del costo unitario en la moneda de la cotización (o % para equipos en %). NULL = usar el banco.';

ALTER TABLE public.cotizacion_items
  ADD COLUMN IF NOT EXISTS especificaciones text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS metrado_detalle jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.cotizacion_apu_detalle d SET codigo = coalesce(m.codigo,''), descripcion = coalesce(m.descripcion,''), marca = coalesce(m.marca,''), unidad = coalesce(m.unidad,''), tipo_recurso = 'MAT',
  precio_unitario = CASE WHEN c.moneda = 'PEN' THEN m.costo_unitario END
FROM public.materiales m, public.cotizacion_items i, public.cotizaciones c
WHERE d.material_id = m.id AND i.id = d.cotizacion_item_id AND c.id = i.cotizacion_id;
UPDATE public.cotizacion_apu_detalle d SET codigo = coalesce(m.codigo,''), descripcion = coalesce(m.descripcion,''), unidad = coalesce(m.unidad,''), tipo_recurso = 'MO',
  precio_unitario = CASE WHEN c.moneda = 'PEN' THEN m.costo_hora END
FROM public.mano_obra m, public.cotizacion_items i, public.cotizaciones c
WHERE d.mano_obra_id = m.id AND i.id = d.cotizacion_item_id AND c.id = i.cotizacion_id;
UPDATE public.cotizacion_apu_detalle d SET codigo = coalesce(m.codigo,''), descripcion = coalesce(m.descripcion,''), unidad = coalesce(m.unidad,''), tipo_recurso = 'EQ',
  precio_unitario = CASE WHEN m.unidad = '%' THEN m.costo_hora WHEN c.moneda = 'PEN' THEN m.costo_unitario END
FROM public.equipos_herramientas m, public.cotizacion_items i, public.cotizaciones c
WHERE d.equipo_id = m.id AND i.id = d.cotizacion_item_id AND c.id = i.cotizacion_id;
UPDATE public.cotizacion_apu_detalle d SET codigo = coalesce(m.codigo,''), descripcion = coalesce(m.descripcion,''), unidad = coalesce(m.unidad,''), tipo_recurso = 'SC',
  precio_unitario = CASE WHEN c.moneda = 'PEN' THEN m.costo_unitario END
FROM public.subcontratos m, public.cotizacion_items i, public.cotizaciones c
WHERE d.subcontrato_id = m.id AND i.id = d.cotizacion_item_id AND c.id = i.cotizacion_id;
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS condicion_venta text,
  ADD COLUMN IF NOT EXISTS fecha_envio date,
  ADD COLUMN IF NOT EXISTS tipo_cambio_fecha date;
COMMENT ON COLUMN public.cotizaciones.condicion_venta IS 'Condición comercial: Crédito o Contado, independiente del detalle de condiciones_pago.';
COMMENT ON COLUMN public.cotizaciones.fecha_envio IS 'Fecha de Lima en que se marca enviada la cotización; no se inventa para envíos históricos.';
COMMENT ON COLUMN public.cotizaciones.tipo_cambio_fecha IS 'Fecha del tipo de cambio oficial guardado al enviar.';
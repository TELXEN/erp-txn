ALTER TABLE public.proyectos ADD COLUMN documento_tipo text NOT NULL DEFAULT '' CHECK (documento_tipo IN ('', 'Orden de Compra', 'Orden de Servicio', 'Contrato')), ADD COLUMN documento_numero text NOT NULL DEFAULT '';
ALTER TABLE public.preliquidaciones ADD COLUMN orden_compra text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.proyectos.documento_tipo IS 'Documento comercial del cliente: Orden de Compra, Orden de Servicio o Contrato; opcional.';
COMMENT ON COLUMN public.proyectos.documento_numero IS 'Número opcional del documento comercial del proyecto.';
COMMENT ON COLUMN public.preliquidaciones.orden_compra IS 'Número del documento comercial copiado del proyecto al crear o seleccionar; independiente del concepto y conservado como referencia histórica.';
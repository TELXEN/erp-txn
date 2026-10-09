ALTER TABLE public.orden_compra_items ADD COLUMN IF NOT EXISTS requerimiento_item_id uuid REFERENCES public.requerimiento_items(id) ON DELETE SET NULL;
ALTER TABLE public.gastos_directos ADD COLUMN IF NOT EXISTS orden_compra_item_id uuid REFERENCES public.orden_compra_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orden_compra_items_requerimiento_item_id ON public.orden_compra_items(requerimiento_item_id);
CREATE INDEX IF NOT EXISTS idx_gastos_directos_orden_compra_item_id ON public.gastos_directos(orden_compra_item_id);
CREATE INDEX IF NOT EXISTS idx_orden_compra_items_orden_id ON public.orden_compra_items(orden_id);
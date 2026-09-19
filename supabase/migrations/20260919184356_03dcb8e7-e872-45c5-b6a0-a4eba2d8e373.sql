ALTER TABLE public.gastos_directos ADD COLUMN proveedor_id uuid REFERENCES public.terceros(id) ON DELETE RESTRICT;
CREATE INDEX gastos_directos_proveedor_id_idx ON public.gastos_directos(proveedor_id);
ALTER TABLE public.gastos_generales ADD COLUMN proveedor_id uuid REFERENCES public.terceros(id) ON DELETE RESTRICT;
CREATE INDEX gastos_generales_proveedor_id_idx ON public.gastos_generales(proveedor_id);
ALTER TABLE public.partidas ADD COLUMN padre_id uuid REFERENCES public.partidas(id) ON DELETE CASCADE;
ALTER TABLE public.cotizacion_items ADD COLUMN padre_id uuid REFERENCES public.cotizacion_items(id) ON DELETE CASCADE;
CREATE INDEX idx_partidas_padre ON public.partidas(padre_id);
CREATE INDEX idx_cotizacion_items_padre ON public.cotizacion_items(padre_id);
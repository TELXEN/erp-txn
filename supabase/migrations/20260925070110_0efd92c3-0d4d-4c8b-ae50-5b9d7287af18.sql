ALTER TABLE public.apu_componentes ALTER COLUMN partida_maestra_id DROP NOT NULL;
ALTER TABLE public.apu_componentes
  ADD COLUMN partida_id uuid REFERENCES public.partidas(id) ON DELETE CASCADE,
  ADD COLUMN cotizacion_item_id uuid REFERENCES public.cotizacion_items(id) ON DELETE CASCADE;
ALTER TABLE public.apu_componentes ADD CONSTRAINT apu_un_solo_origen CHECK (
  (partida_maestra_id IS NOT NULL)::int + (partida_id IS NOT NULL)::int + (cotizacion_item_id IS NOT NULL)::int = 1);
CREATE INDEX idx_apu_partida ON public.apu_componentes(partida_id);
CREATE INDEX idx_apu_cot_item ON public.apu_componentes(cotizacion_item_id);
ALTER TABLE public.partidas
  ADD COLUMN rendimiento numeric NOT NULL DEFAULT 1,
  ADD COLUMN jornada numeric NOT NULL DEFAULT 8,
  ADD COLUMN pct_herramientas numeric NOT NULL DEFAULT 3;
ALTER TABLE public.cotizacion_items
  ADD COLUMN rendimiento numeric NOT NULL DEFAULT 1,
  ADD COLUMN jornada numeric NOT NULL DEFAULT 8,
  ADD COLUMN pct_herramientas numeric NOT NULL DEFAULT 3;
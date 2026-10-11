ALTER TABLE public.partida_detalle ALTER COLUMN partida_padre_id DROP NOT NULL;
ALTER TABLE public.partida_detalle ADD COLUMN IF NOT EXISTS partida_obra_id UUID REFERENCES public.partidas(id) ON DELETE CASCADE;
COMMENT ON COLUMN public.partida_detalle.partida_obra_id IS 'Partida de obra (proyecto) dueña de la fila; alternativa a partida_padre_id del banco.';
CREATE INDEX partida_detalle_obra_idx ON public.partida_detalle(partida_obra_id);

ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS partida_apu_id UUID REFERENCES public.partidas_apu(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.partidas.partida_apu_id IS 'Partida del Banco APU de origen (trazabilidad).';

ALTER TABLE public.partida_detalle DROP CONSTRAINT IF EXISTS partida_detalle_un_recurso;
ALTER TABLE public.partida_detalle ADD CONSTRAINT partida_detalle_un_recurso CHECK (
  (material_id IS NOT NULL)::int + (mano_obra_id IS NOT NULL)::int +
  (equipo_id IS NOT NULL)::int + (subcontrato_id IS NOT NULL)::int +
  (subpartida_hijo_id IS NOT NULL)::int = 1
);
ALTER TABLE public.partida_detalle ADD CONSTRAINT partida_detalle_un_padre CHECK (
  (partida_padre_id IS NOT NULL)::int + (partida_obra_id IS NOT NULL)::int = 1
);
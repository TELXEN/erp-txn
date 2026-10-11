ALTER TABLE public.cotizacion_items ADD COLUMN IF NOT EXISTS partida_apu_id UUID REFERENCES public.partidas_apu(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.cotizacion_items.partida_apu_id IS 'Partida del Banco APU de origen (si se eligió del catálogo).';

CREATE TABLE public.cotizacion_apu_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_item_id UUID NOT NULL REFERENCES public.cotizacion_items(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materiales(id) ON DELETE RESTRICT,
  mano_obra_id UUID REFERENCES public.mano_obra(id) ON DELETE RESTRICT,
  equipo_id UUID REFERENCES public.equipos_herramientas(id) ON DELETE RESTRICT,
  subcontrato_id UUID REFERENCES public.subcontratos(id) ON DELETE RESTRICT,
  cantidad_o_cuadrilla NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cotizacion_apu_detalle_un_recurso CHECK (
    (material_id IS NOT NULL)::int + (mano_obra_id IS NOT NULL)::int +
    (equipo_id IS NOT NULL)::int + (subcontrato_id IS NOT NULL)::int = 1
  )
);
CREATE INDEX cotizacion_apu_detalle_item_idx ON public.cotizacion_apu_detalle(cotizacion_item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotizacion_apu_detalle TO authenticated;
GRANT ALL ON public.cotizacion_apu_detalle TO service_role;

ALTER TABLE public.cotizacion_apu_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gestionan cotizacion_apu_detalle"
  ON public.cotizacion_apu_detalle FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
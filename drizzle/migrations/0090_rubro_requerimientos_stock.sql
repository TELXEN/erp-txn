ALTER TABLE public.requerimientos ADD COLUMN IF NOT EXISTS rubro text;
ALTER TABLE public.requerimientos ADD CONSTRAINT requerimientos_rubro_chk CHECK (rubro IS NULL OR rubro IN ('MAT','EQ','HE','EPP'));
ALTER TABLE public.requerimientos ALTER COLUMN proyecto_id DROP NOT NULL;
ALTER TABLE public.ordenes_compra ADD COLUMN IF NOT EXISTS rubro text;
ALTER TABLE public.ordenes_compra ADD CONSTRAINT ordenes_compra_rubro_chk CHECK (rubro IS NULL OR rubro IN ('MAT','EQ','HE','EPP'));
ALTER TABLE public.ordenes_compra ALTER COLUMN proyecto_id DROP NOT NULL;
COMMENT ON COLUMN public.requerimientos.rubro IS 'Rubro homogéneo del pedido: MAT, EQ, HE o EPP. NULL = requerimientos antiguos o TDR.';
COMMENT ON COLUMN public.requerimientos.proyecto_id IS 'NULL = requerimiento de Logística para stock del Almacén Central.';
CREATE POLICY "Personal lee catalogo EPP" ON public.epp_catalogo FOR SELECT TO authenticated USING (public.es_personal(auth.uid()));
CREATE OR REPLACE FUNCTION public.validar_rubro_requerimiento() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.proyecto_id IS NULL AND NOT public.is_admin_o_gerente(auth.uid()) THEN
    RAISE EXCEPTION 'Solo Logística (Gerencia/Administración) puede pedir compras para stock del Almacén Central.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_rubro_requerimiento BEFORE INSERT ON public.requerimientos FOR EACH ROW EXECUTE FUNCTION public.validar_rubro_requerimiento();
ALTER TABLE public.banco_saldos DROP CONSTRAINT banco_saldos_banco_id_fkey;
ALTER TABLE public.banco_saldos ADD CONSTRAINT banco_saldos_banco_id_fkey FOREIGN KEY(banco_id) REFERENCES public.bancos(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.sincronizar_apertura_bancaria() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.saldo_inicial<0 THEN RAISE EXCEPTION 'El saldo inicial no puede ser negativo; registra el financiamiento recibido.'; END IF;
  INSERT INTO public.banco_saldos(banco_id,saldo) VALUES(NEW.id,NEW.saldo_inicial);
 ELSE
  IF NEW.monedas IS DISTINCT FROM OLD.monedas THEN RAISE EXCEPTION 'La moneda de una cuenta no puede cambiar; registra una cuenta nueva.'; END IF;
  IF NEW.saldo_inicial IS DISTINCT FROM OLD.saldo_inicial AND NEW.saldo_inicial<0 THEN RAISE EXCEPTION 'El saldo inicial no puede ser negativo; registra el financiamiento recibido.'; END IF;
  UPDATE public.banco_saldos SET saldo=saldo+NEW.saldo_inicial-OLD.saldo_inicial WHERE banco_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sincronizar_apertura_bancaria() FROM PUBLIC,anon,authenticated;
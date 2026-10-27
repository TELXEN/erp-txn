CREATE OR REPLACE FUNCTION public.actualizar_saldo_bancario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE oldj jsonb; newj jsonb; m record; b public.bancos%ROWTYPE; s numeric; diferencial numeric;
BEGIN
 IF TG_OP<>'INSERT' THEN oldj:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN newj:=to_jsonb(NEW); END IF;
 FOR m IN SELECT x.banco_id,sum(x.ingreso) AS di,sum(x.egreso) AS de FROM (
  SELECT banco_id,ingreso,egreso FROM public.movimiento_bancario(TG_TABLE_NAME,newj)
  UNION ALL SELECT banco_id,-ingreso,-egreso FROM public.movimiento_bancario(TG_TABLE_NAME,oldj)
 ) x GROUP BY x.banco_id ORDER BY x.banco_id LOOP
  diferencial:=m.di-m.de;
  IF diferencial=0 AND m.di=0 AND m.de=0 THEN CONTINUE; END IF;
  SELECT * INTO b FROM public.bancos WHERE id=m.banco_id;
  -- Solo un egreso nuevo exige cuenta comercial activa; anular un cobro (revertir ingreso) se permite.
  IF m.de>0 AND (NOT b.activo OR b.tipo_cuenta ILIKE '%detracc%') THEN RAISE EXCEPTION 'El pago requiere una cuenta comercial activa; no se permite usar la cuenta de detracciones.'; END IF;
  UPDATE public.banco_saldos SET saldo=saldo+diferencial,ingresos=ingresos+m.di,egresos=egresos+m.de WHERE banco_id=m.banco_id RETURNING saldo INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria sin saldo inicializado.'; END IF;
  IF diferencial<0 AND s<0 THEN RAISE EXCEPTION 'Saldo insuficiente en % (%). Disponible: %, pago: %, faltante: %. Registra el financiamiento antes de pagar.', b.nombre,b.monedas,s-diferencial,-diferencial,-s; END IF;
 END LOOP;
 RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.actualizar_saldo_bancario() FROM PUBLIC,anon,authenticated;
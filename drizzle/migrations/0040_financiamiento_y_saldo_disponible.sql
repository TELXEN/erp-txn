CREATE TABLE public.financiamientos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), acreedor text NOT NULL CHECK(length(trim(acreedor))>0), referencia text NOT NULL CHECK(length(trim(referencia))>0), banco_id uuid NOT NULL REFERENCES public.bancos(id), moneda text NOT NULL CHECK(moneda IN ('PEN','USD')), tipo_cambio numeric NOT NULL DEFAULT 1 CHECK(tipo_cambio>0), capital numeric(16,2) NOT NULL CHECK(capital>0), fecha_desembolso date NOT NULL, numero_operacion text NOT NULL CHECK(length(trim(numero_operacion))>0), notas text NOT NULL DEFAULT '', creado_por uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(acreedor,referencia)
);
GRANT SELECT ON public.financiamientos TO authenticated;
GRANT ALL ON public.financiamientos TO service_role;
ALTER TABLE public.financiamientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finanzas leen financiamientos" ON public.financiamientos FOR SELECT TO authenticated USING(public.is_admin_o_gerente(auth.uid()));
CREATE TABLE public.financiamiento_cuotas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), financiamiento_id uuid NOT NULL REFERENCES public.financiamientos(id), numero integer NOT NULL CHECK(numero>0), vencimiento date NOT NULL, capital numeric(16,2) NOT NULL CHECK(capital>0), interes numeric(16,2) NOT NULL DEFAULT 0 CHECK(interes>=0), comision numeric(16,2) NOT NULL DEFAULT 0 CHECK(comision>=0), banco_id uuid REFERENCES public.bancos(id), fecha_pago date, numero_operacion text, UNIQUE(financiamiento_id,numero), CHECK((fecha_pago IS NULL AND banco_id IS NULL) OR (fecha_pago IS NOT NULL AND banco_id IS NOT NULL AND length(trim(numero_operacion))>0))
);
GRANT SELECT ON public.financiamiento_cuotas TO authenticated;
GRANT ALL ON public.financiamiento_cuotas TO service_role;
ALTER TABLE public.financiamiento_cuotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finanzas leen cuotas" ON public.financiamiento_cuotas FOR SELECT TO authenticated USING(public.is_admin_o_gerente(auth.uid()));
CREATE INDEX ON public.financiamiento_cuotas(financiamiento_id);
CREATE TABLE public.banco_saldos (
 banco_id uuid PRIMARY KEY REFERENCES public.bancos(id), saldo numeric NOT NULL DEFAULT 0, ingresos numeric NOT NULL DEFAULT 0, egresos numeric NOT NULL DEFAULT 0
);
GRANT SELECT ON public.banco_saldos TO authenticated;
GRANT ALL ON public.banco_saldos TO service_role;
ALTER TABLE public.banco_saldos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finanzas leen saldo" ON public.banco_saldos FOR SELECT TO authenticated USING(public.is_admin_o_gerente(auth.uid()));
COMMENT ON TABLE public.banco_saldos IS 'Transactional bank balance projection, initialized from existing records; historical deficits retained. Writes only by source triggers.';
CREATE FUNCTION public.movimiento_bancario(_tabla text,_fila jsonb) RETURNS TABLE(banco_id uuid,ingreso numeric,egreso numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b uuid; d uuid; mon text; cm text; monto numeric:=0; soles numeric:=0; tc numeric:=1; det numeric:=0; entrada boolean:=false; f public.financiamientos%ROWTYPE;
BEGIN
 IF _fila IS NULL THEN RETURN; END IF;
 b:=NULLIF(_fila->>'banco_id','')::uuid;
 IF _tabla='ventas' THEN
  IF _fila->>'estado' IS DISTINCT FROM 'Pagado' THEN RETURN; END IF;
  entrada:=true; monto:=COALESCE((_fila->>'monto')::numeric,0); soles:=COALESCE((_fila->>'monto_soles')::numeric,0); mon:=_fila->>'moneda'; tc:=COALESCE(NULLIF((_fila->>'tipo_cambio')::numeric,0),1);
  d:=NULLIF(_fila->>'banco_detraccion_id','')::uuid;
  IF d IS NOT NULL THEN det:=COALESCE(NULLIF((_fila->>'monto_detraccion')::numeric,0),(_fila->>'monto_retencion')::numeric,0); END IF;
 ELSIF _tabla IN ('gastos_directos','gastos_generales') THEN
  IF NULLIF(_fila->>'caja_chica_id','') IS NOT NULL THEN RETURN; END IF;
  monto:=COALESCE((_fila->>'monto')::numeric,0); soles:=COALESCE((_fila->>'monto_soles')::numeric,0); mon:=_fila->>'moneda'; tc:=COALESCE(NULLIF((_fila->>'tipo_cambio')::numeric,0),1);
  IF _fila->>'detraccion_estado'='No pagada' OR (_fila->>'detraccion_estado'='Pagada' AND NULLIF(_fila->>'detraccion_banco_id','') IS NOT NULL) THEN
   det:=COALESCE(NULLIF((_fila->>'monto_detraccion')::numeric,0),round(soles*0.12));
  END IF;
  IF _fila->>'detraccion_estado'='Pagada' THEN d:=NULLIF(_fila->>'detraccion_banco_id','')::uuid; END IF;
  IF _fila->>'estado_pago' IS DISTINCT FROM 'Pagada' THEN b:=NULL; END IF;
 ELSIF _tabla='financiamientos' THEN
  entrada:=true; monto:=(_fila->>'capital')::numeric; mon:=_fila->>'moneda'; tc:=(_fila->>'tipo_cambio')::numeric; soles:=monto*tc;
 ELSIF _tabla='financiamiento_cuotas' THEN
  IF _fila->>'fecha_pago' IS NULL THEN RETURN; END IF;
  SELECT * INTO f FROM public.financiamientos WHERE id=(_fila->>'financiamiento_id')::uuid;
  monto:=(_fila->>'capital')::numeric+(_fila->>'interes')::numeric+(_fila->>'comision')::numeric; mon:=f.moneda; tc:=f.tipo_cambio; soles:=monto*tc;
 ELSE
  mon:='PEN'; tc:=1;
  IF _tabla='cajas_chicas' THEN monto:=COALESCE((_fila->>'monto_entregado')::numeric,0);
  ELSIF _tabla='mantenimientos_vehiculo' THEN IF NULLIF(_fila->>'caja_chica_id','') IS NOT NULL THEN RETURN; END IF; monto:=COALESCE((_fila->>'costo')::numeric,0);
  ELSIF _tabla='traslados_vehiculo' THEN IF NULLIF(_fila->>'caja_chica_id','') IS NOT NULL THEN RETURN; END IF; monto:=COALESCE((_fila->>'combustible_monto')::numeric,0);
  ELSIF _tabla='pagos_estado' THEN monto:=COALESCE((_fila->>'monto')::numeric,0);
  ELSE
   IF _fila->>'estado_pago' IS DISTINCT FROM 'Pagado' THEN RETURN; END IF;
   monto:=COALESCE((_fila->>CASE _tabla WHEN 'boletas' THEN 'neto_pagar' WHEN 'recibos_honorarios' THEN 'monto_neto' ELSE 'total' END)::numeric,0);
  END IF;
  soles:=monto;
 END IF;
 IF b IS NOT NULL THEN
  SELECT monedas INTO cm FROM public.bancos WHERE id=b;
  banco_id:=b;
  monto:=CASE WHEN mon=cm THEN monto WHEN cm='PEN' THEN soles ELSE soles/tc END;
  IF _tabla IN ('ventas','gastos_directos','gastos_generales') THEN monto:=monto-CASE WHEN cm='PEN' THEN det ELSE det/tc END; END IF;
  ingreso:=CASE WHEN entrada THEN round(monto,2) ELSE 0 END; egreso:=CASE WHEN entrada THEN 0 ELSE round(monto,2) END; RETURN NEXT;
 END IF;
 IF d IS NOT NULL THEN
  SELECT monedas INTO cm FROM public.bancos WHERE id=d;
  banco_id:=d; ingreso:=CASE WHEN entrada THEN round(CASE WHEN cm='PEN' THEN det ELSE det/tc END,2) ELSE 0 END;
  egreso:=CASE WHEN entrada THEN 0 ELSE round(CASE WHEN cm='PEN' THEN det ELSE det/tc END,2) END; RETURN NEXT;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.movimiento_bancario(text,jsonb) FROM PUBLIC,anon,authenticated;
INSERT INTO public.banco_saldos(banco_id,saldo) SELECT id,saldo_inicial FROM public.bancos;
DO $$ DECLARE t text; r record; m record; BEGIN
 FOREACH t IN ARRAY ARRAY['ventas','gastos_directos','gastos_generales','cajas_chicas','mantenimientos_vehiculo','traslados_vehiculo','boletas','recibos_honorarios','beneficios_sociales','pagos_estado'] LOOP
  FOR r IN EXECUTE format('SELECT to_jsonb(x) AS j FROM public.%I x',t) LOOP
   FOR m IN SELECT * FROM public.movimiento_bancario(t,r.j) LOOP
    UPDATE public.banco_saldos SET ingresos=ingresos+m.ingreso,egresos=egresos+m.egreso,saldo=saldo+m.ingreso-m.egreso WHERE banco_id=m.banco_id;
   END LOOP;
  END LOOP;
 END LOOP;
END $$;
CREATE FUNCTION public.actualizar_saldo_bancario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
  IF diferencial<0 AND (NOT b.activo OR b.tipo_cuenta ILIKE '%detracc%') THEN RAISE EXCEPTION 'El pago requiere una cuenta comercial activa; no se permite usar la cuenta de detracciones.'; END IF;
  UPDATE public.banco_saldos SET saldo=saldo+diferencial,ingresos=ingresos+m.di,egresos=egresos+m.de WHERE banco_id=m.banco_id RETURNING saldo INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta bancaria sin saldo inicializado.'; END IF;
  IF diferencial<0 AND s<0 THEN RAISE EXCEPTION 'Saldo insuficiente en % (%). Disponible: %, pago: %, faltante: %. Registra el financiamiento antes de pagar.', b.nombre,b.monedas,s-diferencial,-diferencial,-s; END IF;
 END LOOP;
 RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.actualizar_saldo_bancario() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ventas','gastos_directos','gastos_generales','cajas_chicas','mantenimientos_vehiculo','traslados_vehiculo','boletas','recibos_honorarios','beneficios_sociales','pagos_estado','financiamientos','financiamiento_cuotas'] LOOP
 EXECUTE format('CREATE TRIGGER saldo_disponible AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo_bancario()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.sincronizar_apertura_bancaria() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO public.banco_saldos(banco_id,saldo) VALUES(NEW.id,NEW.saldo_inicial);
 ELSE
  IF NEW.monedas IS DISTINCT FROM OLD.monedas THEN RAISE EXCEPTION 'La moneda de una cuenta no puede cambiar; registra una cuenta nueva.'; END IF;
  UPDATE public.banco_saldos SET saldo=saldo+NEW.saldo_inicial-OLD.saldo_inicial WHERE banco_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sincronizar_apertura_bancaria() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sincronizar_apertura AFTER INSERT OR UPDATE ON public.bancos FOR EACH ROW EXECUTE FUNCTION public.sincronizar_apertura_bancaria();
CREATE FUNCTION public.registrar_financiamiento(_datos jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE idn uuid; b public.bancos%ROWTYPE; cap numeric; n integer; primero date; i integer; parte numeric; acumulado numeric:=0; tc numeric;
BEGIN
 IF NOT COALESCE(public.is_admin_o_gerente(auth.uid()),false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT * INTO b FROM public.bancos WHERE id=(_datos->>'banco_id')::uuid;
 IF b.id IS NULL OR NOT b.activo OR b.tipo_cuenta ILIKE '%detracc%' THEN RAISE EXCEPTION 'Selecciona una cuenta comercial activa.'; END IF;
 cap:=round((_datos->>'capital')::numeric,2); n:=(_datos->>'cuotas')::integer; primero:=(_datos->>'primer_vencimiento')::date;
 tc:=CASE WHEN b.monedas='PEN' THEN 1 ELSE (_datos->>'tipo_cambio')::numeric END;
 IF cap IS NULL OR cap<=0 OR n IS NULL OR n<1 OR n>120 OR cap/n<0.01 THEN RAISE EXCEPTION 'Capital o número de cuotas inválido (1 a 120).'; END IF;
 IF (_datos->>'fecha_desembolso')::date>(now() AT TIME ZONE 'America/Lima')::date OR primero<(_datos->>'fecha_desembolso')::date THEN RAISE EXCEPTION 'Revisa las fechas: solo desembolsos recibidos y cuotas posteriores al desembolso.'; END IF;
 IF primero IS NULL OR (_datos->>'fecha_desembolso') IS NULL THEN RAISE EXCEPTION 'Completa las fechas.'; END IF;
 IF COALESCE((_datos->>'interes')::numeric,0)<0 OR COALESCE((_datos->>'comision')::numeric,0)<0 THEN RAISE EXCEPTION 'Intereses y comisiones no pueden ser negativos.'; END IF;
 INSERT INTO public.financiamientos(acreedor,referencia,banco_id,moneda,tipo_cambio,capital,fecha_desembolso,numero_operacion,notas,creado_por)
 VALUES(trim(_datos->>'acreedor'),trim(_datos->>'referencia'),b.id,b.monedas,tc,cap,(_datos->>'fecha_desembolso')::date,trim(_datos->>'numero_operacion'),COALESCE(_datos->>'notas',''),auth.uid()) RETURNING id INTO idn;
 FOR i IN 1..n LOOP
  parte:=CASE WHEN i=n THEN cap-acumulado ELSE trunc(cap/n,2) END;
  INSERT INTO public.financiamiento_cuotas(financiamiento_id,numero,vencimiento,capital,interes,comision)
  VALUES(idn,i,(primero+(i-1)*interval '1 month')::date,parte,round(COALESCE((_datos->>'interes')::numeric,0),2),round(COALESCE((_datos->>'comision')::numeric,0),2)); acumulado:=acumulado+parte;
 END LOOP;
 RETURN idn;
END $$;
REVOKE ALL ON FUNCTION public.registrar_financiamiento(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_financiamiento(jsonb) TO authenticated;
CREATE FUNCTION public.pagar_financiamiento(_cuota uuid,_banco uuid,_fecha date,_operacion text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.financiamiento_cuotas%ROWTYPE; f public.financiamientos%ROWTYPE; b public.bancos%ROWTYPE;
BEGIN
 IF NOT COALESCE(public.is_admin_o_gerente(auth.uid()),false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
 SELECT * INTO c FROM public.financiamiento_cuotas WHERE id=_cuota FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Cuota no encontrada.'; END IF;
 IF c.fecha_pago IS NOT NULL THEN RAISE EXCEPTION 'Esta cuota ya fue pagada.'; END IF;
 SELECT * INTO f FROM public.financiamientos WHERE id=c.financiamiento_id;
 SELECT * INTO b FROM public.bancos WHERE id=_banco;
 IF b.id IS NULL OR NOT b.activo OR b.tipo_cuenta ILIKE '%detracc%' OR b.monedas<>f.moneda THEN RAISE EXCEPTION 'Selecciona una cuenta comercial activa en la moneda del préstamo.'; END IF;
 IF _fecha IS NULL OR _fecha<f.fecha_desembolso OR _fecha>(now() AT TIME ZONE 'America/Lima')::date OR length(trim(COALESCE(_operacion,'')))=0 THEN RAISE EXCEPTION 'Revisa fecha y número de operación.'; END IF;
 UPDATE public.financiamiento_cuotas SET banco_id=_banco,fecha_pago=_fecha,numero_operacion=trim(_operacion) WHERE id=c.id;
END $$;
REVOKE ALL ON FUNCTION public.pagar_financiamiento(uuid,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pagar_financiamiento(uuid,uuid,date,text) TO authenticated;
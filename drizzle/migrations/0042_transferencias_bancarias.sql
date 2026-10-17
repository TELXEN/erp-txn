CREATE TABLE public.transferencias_bancarias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 banco_origen_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
 banco_destino_id uuid NOT NULL REFERENCES public.bancos(id) ON DELETE CASCADE,
 monto_origen numeric(16,2) NOT NULL CHECK(monto_origen>0),
 tipo_cambio numeric NOT NULL DEFAULT 1 CHECK(tipo_cambio>0),
 monto_destino numeric(16,2) NOT NULL CHECK(monto_destino>0),
 fecha date NOT NULL,
 numero_operacion text NOT NULL CHECK(length(trim(numero_operacion))>0),
 notas text NOT NULL DEFAULT '',
 creado_por uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(banco_origen_id<>banco_destino_id)
);
GRANT SELECT ON public.transferencias_bancarias TO authenticated;
GRANT ALL ON public.transferencias_bancarias TO service_role;
ALTER TABLE public.transferencias_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finanzas leen transferencias" ON public.transferencias_bancarias FOR SELECT TO authenticated USING(public.is_admin_o_gerente(auth.uid()));

CREATE FUNCTION public.registrar_transferencia(_origen uuid,_destino uuid,_monto numeric,_tc numeric,_fecha date,_operacion text,_notas text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.bancos%ROWTYPE; d public.bancos%ROWTYPE; disp numeric; dest numeric; nid uuid;
BEGIN
 IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Solo Gerencia o Administración pueden transferir entre cuentas.'; END IF;
 IF _origen=_destino THEN RAISE EXCEPTION 'La cuenta destino debe ser distinta del origen.'; END IF;
 IF _monto IS NULL OR _monto<=0 THEN RAISE EXCEPTION 'Ingresa un monto mayor a cero.'; END IF;
 IF _operacion IS NULL OR length(trim(_operacion))=0 THEN RAISE EXCEPTION 'Ingresa el N° de operación.'; END IF;
 SELECT * INTO o FROM public.bancos WHERE id=_origen;
 SELECT * INTO d FROM public.bancos WHERE id=_destino;
 IF o.id IS NULL OR d.id IS NULL OR NOT o.activo OR NOT d.activo THEN RAISE EXCEPTION 'Ambas cuentas deben estar activas.'; END IF;
 IF o.tipo_cuenta ILIKE '%detracc%' OR d.tipo_cuenta ILIKE '%detracc%' THEN RAISE EXCEPTION 'La cuenta de detracciones no participa en transferencias.'; END IF;
 IF o.monedas=d.monedas THEN _tc:=1; ELSIF _tc IS NULL OR _tc<=0 THEN RAISE EXCEPTION 'Ingresa el tipo de cambio.'; END IF;
 dest:=round(CASE WHEN o.monedas=d.monedas THEN _monto WHEN o.monedas='USD' THEN _monto*_tc ELSE _monto/_tc END,2);
 SELECT saldo INTO disp FROM public.banco_saldos WHERE banco_id=_origen FOR UPDATE;
 PERFORM 1 FROM public.banco_saldos WHERE banco_id=_destino FOR UPDATE;
 IF disp IS NULL OR disp<_monto THEN RAISE EXCEPTION 'Saldo insuficiente en % (%). Disponible: %, transferencia: %.', o.nombre,o.monedas,COALESCE(disp,0),_monto; END IF;
 INSERT INTO public.transferencias_bancarias(banco_origen_id,banco_destino_id,monto_origen,tipo_cambio,monto_destino,fecha,numero_operacion,notas,creado_por)
 VALUES(_origen,_destino,round(_monto,2),_tc,dest,_fecha,trim(_operacion),COALESCE(_notas,''),auth.uid()) RETURNING id INTO nid;
 UPDATE public.banco_saldos SET saldo=saldo-round(_monto,2),egresos=egresos+round(_monto,2) WHERE banco_id=_origen;
 UPDATE public.banco_saldos SET saldo=saldo+dest,ingresos=ingresos+dest WHERE banco_id=_destino;
 RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.registrar_transferencia(uuid,uuid,numeric,numeric,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_transferencia(uuid,uuid,numeric,numeric,date,text,text) TO authenticated;
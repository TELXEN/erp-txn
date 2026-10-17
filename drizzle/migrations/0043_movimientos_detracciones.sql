CREATE TABLE public.movimientos_detracciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 banco_id uuid NOT NULL REFERENCES public.bancos(id),
 tipo text NOT NULL CHECK (tipo IN ('ingreso','pago_sunat')),
 concepto text NOT NULL,
 periodo text,
 monto numeric(14,2) NOT NULL CHECK (monto>0),
 fecha date NOT NULL DEFAULT current_date,
 numero_operacion text NOT NULL,
 notas text DEFAULT '',
 creado_por uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movimientos_detracciones TO authenticated;
GRANT ALL ON public.movimientos_detracciones TO service_role;
ALTER TABLE public.movimientos_detracciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal lee detracciones" ON public.movimientos_detracciones FOR SELECT TO authenticated USING (public.is_admin_o_gerente(auth.uid()));

CREATE OR REPLACE FUNCTION public.registrar_movimiento_detraccion(_banco uuid,_tipo text,_concepto text,_periodo text,_monto numeric,_fecha date,_operacion text,_notas text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bancos%ROWTYPE; disp numeric; nid uuid; m numeric:=round(_monto,2);
BEGIN
 IF NOT public.is_admin_o_gerente(auth.uid()) THEN RAISE EXCEPTION 'Solo Gerencia o Administración.'; END IF;
 IF _tipo NOT IN ('ingreso','pago_sunat') THEN RAISE EXCEPTION 'Tipo inválido.'; END IF;
 IF m IS NULL OR m<=0 THEN RAISE EXCEPTION 'Ingresa un monto mayor a cero.'; END IF;
 IF _operacion IS NULL OR length(trim(_operacion))=0 THEN RAISE EXCEPTION 'Ingresa el N° de operación o constancia.'; END IF;
 SELECT * INTO b FROM public.bancos WHERE id=_banco;
 IF b.id IS NULL OR NOT b.activo OR b.tipo_cuenta NOT ILIKE '%detracc%' THEN RAISE EXCEPTION 'Selecciona la cuenta de detracciones activa.'; END IF;
 SELECT saldo INTO disp FROM public.banco_saldos WHERE banco_id=_banco FOR UPDATE;
 IF disp IS NULL THEN INSERT INTO public.banco_saldos(banco_id,saldo,ingresos,egresos) VALUES(_banco,0,0,0); disp:=0; END IF;
 IF _tipo='pago_sunat' AND disp<m THEN RAISE EXCEPTION 'Saldo insuficiente en la cuenta de detracciones. Disponible: %, pago: %.',disp,m; END IF;
 INSERT INTO public.movimientos_detracciones(banco_id,tipo,concepto,periodo,monto,fecha,numero_operacion,notas,creado_por)
 VALUES(_banco,_tipo,trim(_concepto),NULLIF(trim(_periodo),''),m,_fecha,trim(_operacion),COALESCE(_notas,''),auth.uid()) RETURNING id INTO nid;
 IF _tipo='ingreso' THEN UPDATE public.banco_saldos SET saldo=saldo+m,ingresos=ingresos+m WHERE banco_id=_banco;
 ELSE UPDATE public.banco_saldos SET saldo=saldo-m,egresos=egresos+m WHERE banco_id=_banco; END IF;
 RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.registrar_movimiento_detraccion(uuid,text,text,text,numeric,date,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_detraccion(uuid,text,text,text,numeric,date,text,text) TO authenticated;
DROP POLICY IF EXISTS "bancos visibles" ON public.bancos;
CREATE POLICY "bancos visibles admin gerente" ON public.bancos FOR SELECT TO authenticated USING (public.is_admin_o_gerente(auth.uid()));
REVOKE ALL ON public.bancos FROM anon;

CREATE OR REPLACE FUNCTION public.proteger_banco()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'gerente'::app_role) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Solo la Gerencia puede eliminar cuentas bancarias';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.saldo_inicial IS DISTINCT FROM OLD.saldo_inicial
       OR NEW.fecha_saldo_inicial IS DISTINCT FROM OLD.fecha_saldo_inicial
       OR NEW.numero_cuenta IS DISTINCT FROM OLD.numero_cuenta
       OR NEW.cci IS DISTINCT FROM OLD.cci) THEN
      RAISE EXCEPTION 'Solo la Gerencia puede modificar el saldo inicial, número de cuenta o CCI';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.saldo_inicial <> 0 THEN
      RAISE EXCEPTION 'Solo la Gerencia puede registrar un saldo inicial distinto de cero';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_proteger_banco ON public.bancos;
CREATE TRIGGER trg_proteger_banco BEFORE INSERT OR UPDATE OR DELETE ON public.bancos
FOR EACH ROW EXECUTE FUNCTION public.proteger_banco();
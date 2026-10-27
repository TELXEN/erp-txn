import { supabase } from "@/integrations/supabase/client";

/** Devuelve la venta a «Pendiente de Pago»; el trigger de saldos revierte el ingreso en el banco. */
export function cambiosAnularCobro(v: { detraccion_estado?: string | null; retencion_estado?: string | null }) {
  return {
    estado: "Pendiente de Pago",
    fecha_pago: null,
    banco_id: null,
    numero_operacion: "",
    ...(v.detraccion_estado === "Depositada"
      ? { detraccion_estado: "Pendiente", detraccion_fecha: null, detraccion_constancia: "", banco_detraccion_id: null }
      : {}),
    ...(v.retencion_estado === "Depositada"
      ? { retencion_estado: "", retencion_fecha: null, retencion_constancia: "", monto_retencion: 0, banco_detraccion_id: null }
      : {}),
  };
}

export async function anularCobroVenta(id: string): Promise<string | null> {
  const { data, error } = await supabase.from("ventas").select("detraccion_estado,retencion_estado").eq("id", id).single();
  if (error) return error.message;
  const { error: e2 } = await supabase.from("ventas").update(cambiosAnularCobro(data) as never).eq("id", id);
  return e2 ? e2.message : null;
}

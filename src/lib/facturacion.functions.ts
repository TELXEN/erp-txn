import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({ codigo: z.string().max(40), descripcion: z.string().min(1).max(500), unidad_sunat: z.string().min(1).max(8), cantidad: z.number().positive(), valor_unitario: z.number().nonnegative(), descuento: z.number().nonnegative(), afectacion_igv: z.enum(["10", "20", "30"]), subtotal: z.number().nonnegative(), igv: z.number().nonnegative(), total: z.number().nonnegative() });
const cuotaSchema = z.object({ numero: z.number().int().positive(), fecha_vencimiento: z.string().date(), monto: z.number().positive() });
const inputSchema = z.object({
  tipo_comprobante: z.enum(["01", "03", "07", "08"]), serie: z.string().min(4).max(4), preliquidacion_id: z.string().uuid().nullable(), proyecto_id: z.string().uuid().nullable(), cliente_id: z.string().uuid().nullable(), comprobante_referencia_id: z.string().uuid().nullable(), motivo_nota_codigo: z.string().max(8), motivo_nota_descripcion: z.string().max(300), fecha_emision: z.string().date(), fecha_vencimiento: z.string().date().nullable(), moneda: z.enum(["PEN", "USD"]), tipo_cambio: z.number().positive(), operacion_tipo: z.enum(["gravada", "exonerada", "inafecta"]), valor_venta: z.number().nonnegative(), total_descuentos: z.number().nonnegative(), igv: z.number().nonnegative(), total: z.number().nonnegative(), total_soles: z.number().nonnegative(), total_letras: z.string().max(500), condicion_pago: z.enum(["Contado", "Crédito"]), dias_credito: z.number().int().nonnegative(), tipo_tributario: z.enum(["detraccion", "retencion", "ninguno"]), codigo_spot: z.string().max(8), pct_detraccion: z.number().min(0).max(100), monto_detraccion: z.number().nonnegative(), monto_retencion: z.number().nonnegative(), orden_compra: z.string().max(160), observacion: z.string().max(1000), emitir: z.boolean(), items: z.array(itemSchema).min(1), cuotas: z.array(cuotaSchema).max(24),
});

export const crearComprobanteElectronico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: authError } = await context.supabase.rpc("is_admin_o_gerente", { _user_id: context.userId });
    if (authError) throw new Error(authError.message);
    if (!autorizado) throw new Error("No autorizado para emitir comprobantes.");
    if (data.tipo_comprobante === "01" && !data.cliente_id) throw new Error("La factura requiere un cliente con RUC.");
    if ((data.tipo_comprobante === "07" || data.tipo_comprobante === "08") && !data.comprobante_referencia_id) throw new Error("La nota requiere un comprobante de referencia.");
    if (Math.abs(data.items.reduce((s, i) => s + i.total, 0) - data.total) > 0.05) throw new Error("Los totales del comprobante no coinciden con sus ítems.");
    if (data.condicion_pago === "Crédito" && Math.abs(data.cuotas.reduce((s, c) => s + c.monto, 0) - data.total) > 0.05) throw new Error("Las cuotas deben sumar el total del comprobante.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reservado, error: numeroError } = await supabaseAdmin.rpc("siguiente_numero_comprobante", { _tipo: data.tipo_comprobante, _serie: data.serie.toUpperCase() });
    if (numeroError) throw new Error(numeroError.message);
    const filaNumero = reservado?.[0];
    if (!filaNumero) throw new Error("No se pudo reservar el número del comprobante.");
    const estadoFiscal = data.emitir ? "Emitido - Pendiente SUNAT" : "Borrador";
    const qrPayload = data.emitir ? JSON.stringify({ ruc: "", tipo: data.tipo_comprobante, numero: filaNumero.numero, fecha: data.fecha_emision, igv: data.igv, total: data.total }) : "";
    const payloadFiscal = { version: "1.0", proveedor: null, documento: { tipo: data.tipo_comprobante, serie: data.serie.toUpperCase(), correlativo: filaNumero.correlativo }, moneda: data.moneda, operacion: data.operacion_tipo, totales: { valorVenta: data.valor_venta, igv: data.igv, total: data.total }, items: data.items };
    const { data: comprobante, error: comprobanteError } = await supabaseAdmin.from("comprobantes_electronicos").insert({ ...data, items: undefined, cuotas: undefined, emitir: undefined, correlativo: filaNumero.correlativo, numero: filaNumero.numero, estado_fiscal: estadoFiscal, detraccion_estado: data.monto_detraccion > 0 ? "Pendiente" : "No aplica", qr_payload: qrPayload, payload_fiscal: payloadFiscal, creado_por: context.userId } as never).select("id, numero").single();
    if (comprobanteError || !comprobante) throw new Error(comprobanteError?.message ?? "No se pudo guardar el comprobante.");
    const comprobanteId = (comprobante as { id: string; numero: string }).id;
    const { error: itemsError } = await supabaseAdmin.from("comprobante_items").insert(data.items.map((item, orden) => ({ ...item, comprobante_id: comprobanteId, orden })) as never);
    if (itemsError) { await supabaseAdmin.from("comprobantes_electronicos").delete().eq("id", comprobanteId); throw new Error(itemsError.message); }
    if (data.cuotas.length) {
      const { error: cuotasError } = await supabaseAdmin.from("comprobante_cuotas").insert(data.cuotas.map((cuota) => ({ ...cuota, comprobante_id: comprobanteId })) as never);
      if (cuotasError) { await supabaseAdmin.from("comprobantes_electronicos").delete().eq("id", comprobanteId); throw new Error(cuotasError.message); }
    }
    if (data.emitir && ["01", "03"].includes(data.tipo_comprobante)) {
      const concepto = data.items.map((i) => i.descripcion).join(" · ").slice(0, 160);
      const { error: ventaError } = await supabaseAdmin.from("ventas").insert({ comprobante_electronico_id: comprobanteId, preliquidacion_id: data.preliquidacion_id, proyecto_id: data.proyecto_id, cliente_id: data.cliente_id, concepto, monto: data.valor_venta, moneda: data.moneda, tipo_cambio: data.tipo_cambio, monto_soles: data.valor_venta * data.tipo_cambio, numero_factura: filaNumero.numero, fecha_pago: null, estado: "Pendiente de Pago", fecha_emision: data.fecha_emision, condicion_pago: data.condicion_pago, dias_credito: data.dias_credito, fecha_vencimiento: data.fecha_vencimiento, igv: data.igv, total: data.total, pct_detraccion: data.pct_detraccion, monto_detraccion: data.monto_detraccion / data.tipo_cambio, detraccion_estado: data.monto_detraccion > 0 ? "Pendiente" : "No aplica", detraccion_constancia: "", tipo_tributario: data.tipo_tributario, monto_retencion: data.monto_retencion, rubro: data.proyecto_id ? "Proyectos / Obras" : "Servicios" } as never);
      if (ventaError) throw new Error(ventaError.message);
    }
    if (data.preliquidacion_id && data.emitir) await supabaseAdmin.from("preliquidaciones").update({ estado: "Facturada" } as never).eq("id", data.preliquidacion_id);
    return { id: comprobanteId, numero: (comprobante as { id: string; numero: string }).numero };
  });

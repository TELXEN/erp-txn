import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({ codigo: z.string().max(40), descripcion: z.string().min(1).max(500), unidad_sunat: z.string().min(1).max(8), cantidad: z.number().positive(), valor_unitario: z.number().nonnegative(), descuento: z.number().nonnegative(), afectacion_igv: z.enum(["10", "20", "30"]), subtotal: z.number().nonnegative(), igv: z.number().nonnegative(), total: z.number().nonnegative() });
const cuotaSchema = z.object({ numero: z.number().int().positive(), fecha_vencimiento: z.string().date(), monto: z.number().positive() });
const docRelSchema = z.object({ tipo: z.string().max(4), serie: z.string().max(8), numero: z.string().max(20), fecha: z.string().max(10), importe: z.number().nonnegative() });
const inputSchema = z.object({
  tipo_comprobante: z.enum(["01", "03", "07", "08", "09", "20", "40", "RA"]), serie: z.string().min(4).max(4), correlativo_inicial: z.number().int().positive().nullable(), preliquidacion_id: z.string().uuid().nullable(), proyecto_id: z.string().uuid().nullable(), cliente_id: z.string().uuid().nullable(), comprobante_referencia_id: z.string().uuid().nullable(), motivo_nota_codigo: z.string().max(8), motivo_nota_descripcion: z.string().max(300), fecha_emision: z.string().date(), fecha_vencimiento: z.string().date().nullable(), moneda: z.enum(["PEN", "USD"]), tipo_cambio: z.number().positive(), operacion_tipo: z.enum(["gravada", "exonerada", "inafecta"]), valor_venta: z.number().nonnegative(), total_descuentos: z.number().nonnegative(), igv: z.number().nonnegative(), total: z.number().nonnegative(), total_soles: z.number().nonnegative(), total_letras: z.string().max(500), condicion_pago: z.enum(["Contado", "Crédito"]), dias_credito: z.number().int().nonnegative(), tipo_tributario: z.enum(["detraccion", "retencion", "ninguno"]), codigo_spot: z.string().max(8), pct_detraccion: z.number().min(0).max(100), monto_detraccion: z.number().nonnegative(), monto_retencion: z.number().nonnegative(), orden_compra: z.string().max(160), observacion: z.string().max(1000), emitir: z.boolean(), items: z.array(itemSchema).default([]), cuotas: z.preprocess((v) => (Array.isArray(v) ? v.filter((c) => Number((c as { monto?: unknown })?.monto) > 0) : []), z.array(cuotaSchema).max(24)),
  cliente_numero_documento: z.string().max(20).default(""), cliente_razon_social: z.string().max(200).default(""), cliente_direccion: z.string().max(300).default(""), cliente_ciudad: z.string().max(120).default(""), cliente_estado_sunat: z.string().max(40).default(""), cliente_condicion_sunat: z.string().max(40).default(""),
  guia_remision_numero: z.string().max(40).default(""), igv_tasa: z.number().min(0).max(100).default(18), anticipo_tipo: z.enum(["ninguno", "anticipo", "deduccion"]).default("ninguno"), anticipo_documento: z.string().max(40).default(""), anticipo_monto: z.number().nonnegative().default(0),
  isc: z.number().nonnegative().default(0), icbper: z.number().nonnegative().default(0), otros_cargos: z.number().nonnegative().default(0), otros_tributos: z.number().nonnegative().default(0), redondeo: z.number().min(-1).max(1).default(0),
  datos_guia: z.record(z.string(), z.string()).default({}), datos_regimen: z.record(z.string(), z.string()).default({}), documentos_relacionados: z.array(docRelSchema).max(200).default([]), motivo_baja: z.string().max(300).default(""),
});


export const crearComprobanteElectronico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: authError } = await context.supabase.rpc("is_admin_o_gerente", { _user_id: context.userId });
    if (authError) throw new Error(authError.message);
    if (!autorizado) throw new Error("No autorizado para emitir comprobantes.");
    const conImportes = ["01", "03", "07", "08"].includes(data.tipo_comprobante);
    const rucDigitado = data.cliente_numero_documento.trim();
    if (!data.cliente_id && /^\d{8}$|^\d{11}$/.test(rucDigitado) && data.cliente_razon_social.trim()) {
      const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
      const { data: existente } = await admin.from("terceros").select("id").eq("numero_documento", rucDigitado).maybeSingle();
      if (existente) data.cliente_id = (existente as { id: string }).id;
      else {
        const { data: nuevo, error: nuevoError } = await admin.from("terceros").insert({ razon_social: data.cliente_razon_social.trim(), numero_documento: rucDigitado, tipo_documento: rucDigitado.length === 11 ? "RUC" : "DNI", direccion: data.cliente_direccion.trim(), es_cliente: true } as never).select("id").single();
        if (nuevoError || !nuevo) throw new Error(nuevoError?.message ?? "No se pudo registrar el cliente.");
        data.cliente_id = (nuevo as { id: string }).id;
      }
    }
    if (data.tipo_comprobante === "01" && (!data.cliente_id || !/^\d{11}$/.test(rucDigitado || "00000000000"))) throw new Error("La factura requiere un cliente con RUC de 11 dígitos y razón social.");
    if ((data.tipo_comprobante === "07" || data.tipo_comprobante === "08") && !data.comprobante_referencia_id) throw new Error("La nota requiere un comprobante de referencia.");
    if (["20", "40", "RA"].includes(data.tipo_comprobante) && !data.documentos_relacionados.length) throw new Error("Agrega al menos un comprobante relacionado.");
    if (["01", "03", "07", "08", "09"].includes(data.tipo_comprobante) && !data.items.length) throw new Error("Agrega al menos un concepto.");
    if (conImportes && Math.abs(data.items.reduce((s, i) => s + i.total, 0) - data.total) > 0.05) throw new Error("Los totales del comprobante no coinciden con sus ítems.");

    if (data.condicion_pago === "Crédito" && data.cuotas.length) {
      const suma = data.cuotas.reduce((s, c) => s + c.monto, 0);
      const descuentoRegimen = data.tipo_tributario === "detraccion" ? data.monto_detraccion / (data.moneda === "USD" ? data.tipo_cambio || 1 : 1) : data.tipo_tributario === "retencion" ? data.monto_retencion / (data.moneda === "USD" ? data.tipo_cambio || 1 : 1) : 0;
      const neto = data.total - descuentoRegimen;
      if (Math.abs(suma - data.total) > 0.05 && Math.abs(suma - neto) > 0.05) throw new Error("Las cuotas deben sumar el neto a pagar del comprobante.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const serieFinal = data.serie.toUpperCase();
    let filaNumero: { correlativo: number; numero: string };
    if (data.correlativo_inicial) {
      // El usuario definió el correlativo de inicio: se usa tal cual y la serie continúa desde ahí.
      filaNumero = { correlativo: data.correlativo_inicial, numero: `${serieFinal}-${String(data.correlativo_inicial).padStart(8, "0")}` };
      const { data: serieRow } = await supabaseAdmin.from("series_comprobante").select("id, correlativo_actual").eq("tipo_comprobante", data.tipo_comprobante).eq("serie", serieFinal).maybeSingle();
      if (serieRow) {
        const fila = serieRow as { id: string; correlativo_actual: number };
        if (data.correlativo_inicial > fila.correlativo_actual) await supabaseAdmin.from("series_comprobante").update({ correlativo_actual: data.correlativo_inicial } as never).eq("id", fila.id);
      } else {
        await supabaseAdmin.from("series_comprobante").insert({ tipo_comprobante: data.tipo_comprobante, serie: serieFinal, correlativo_actual: data.correlativo_inicial, activo: true } as never);
      }
    } else {
      const { data: reservado, error: numeroError } = await supabaseAdmin.rpc("siguiente_numero_comprobante", { _tipo: data.tipo_comprobante, _serie: serieFinal });
      if (numeroError) throw new Error(numeroError.message);
      const reservadoFila = reservado?.[0];
      if (!reservadoFila) throw new Error("No se pudo reservar el número del comprobante.");
      filaNumero = reservadoFila;
    }
    const estadoFiscal = data.emitir ? "Emitido - Pendiente SUNAT" : "Borrador";
    const qrPayload = data.emitir ? JSON.stringify({ ruc: "", tipo: data.tipo_comprobante, numero: filaNumero.numero, fecha: data.fecha_emision, igv: data.igv, total: data.total }) : "";
    const payloadFiscal = { version: "1.0", proveedor: null, documento: { tipo: data.tipo_comprobante, serie: data.serie.toUpperCase(), correlativo: filaNumero.correlativo }, moneda: data.moneda, operacion: data.operacion_tipo, totales: { valorVenta: data.valor_venta, igv: data.igv, total: data.total }, items: data.items };
    const { data: comprobante, error: comprobanteError } = await supabaseAdmin.from("comprobantes_electronicos").insert({ ...data, items: undefined, cuotas: undefined, emitir: undefined, correlativo_inicial: undefined, correlativo: filaNumero.correlativo, numero: filaNumero.numero, estado_fiscal: estadoFiscal, detraccion_estado: data.monto_detraccion > 0 ? "Pendiente" : "No aplica", qr_payload: qrPayload, payload_fiscal: payloadFiscal, creado_por: context.userId } as never).select("id, numero").single();
    if (comprobanteError || !comprobante) throw new Error(comprobanteError?.message ?? "No se pudo guardar el comprobante.");
    const comprobanteId = (comprobante as { id: string; numero: string }).id;
    if (data.items.length) {
      const { error: itemsError } = await supabaseAdmin.from("comprobante_items").insert(data.items.map((item, orden) => ({ ...item, comprobante_id: comprobanteId, orden })) as never);
      if (itemsError) { await supabaseAdmin.from("comprobantes_electronicos").delete().eq("id", comprobanteId); throw new Error(itemsError.message); }
    }

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

const editarBorradorSchema = inputSchema.omit({ emitir: true }).extend({ id: z.string().uuid() });

export const actualizarBorradorComprobante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => editarBorradorSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: authError } = await context.supabase.rpc("is_admin_o_gerente", { _user_id: context.userId });
    if (authError) throw new Error(authError.message);
    if (!autorizado) throw new Error("No autorizado para editar comprobantes.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: actual, error: actualError } = await supabaseAdmin
      .from("comprobantes_electronicos")
      .select("id, estado_fiscal, tipo_comprobante, serie, correlativo, numero")
      .eq("id", data.id)
      .single();
    if (actualError || !actual) throw new Error("No se encontró el comprobante.");
    if (actual.estado_fiscal !== "Borrador") throw new Error("Solo se pueden editar comprobantes en borrador.");

    const { id, items, cuotas, tipo_comprobante: _tipo, serie: _serie, correlativo_inicial: _corr, ...campos } = data;
    const payloadFiscal = {
      version: "1.0",
      proveedor: null,
      documento: { tipo: actual.tipo_comprobante, serie: actual.serie, correlativo: actual.correlativo },
      moneda: data.moneda,
      operacion: data.operacion_tipo,
      totales: { valorVenta: data.valor_venta, igv: data.igv, total: data.total },
      items,
    };
    const { error: updateError } = await supabaseAdmin
      .from("comprobantes_electronicos")
      .update({ ...campos, payload_fiscal: payloadFiscal, detraccion_estado: data.monto_detraccion > 0 ? "Pendiente" : "No aplica" } as never)
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    const { error: borrarItemsError } = await supabaseAdmin.from("comprobante_items").delete().eq("comprobante_id", id);
    if (borrarItemsError) throw new Error(borrarItemsError.message);
    if (items.length) {
      const { error: itemsError } = await supabaseAdmin.from("comprobante_items").insert(items.map((item, orden) => ({ ...item, comprobante_id: id, orden })) as never);
      if (itemsError) throw new Error(itemsError.message);
    }


    const { error: borrarCuotasError } = await supabaseAdmin.from("comprobante_cuotas").delete().eq("comprobante_id", id);
    if (borrarCuotasError) throw new Error(borrarCuotasError.message);
    if (cuotas.length) {
      const { error: cuotasError } = await supabaseAdmin.from("comprobante_cuotas").insert(cuotas.map((cuota) => ({ ...cuota, comprobante_id: id })) as never);
      if (cuotasError) throw new Error(cuotasError.message);
    }
    return { id, numero: actual.numero };
  });

export const eliminarBorradorComprobante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: authError } = await context.supabase.rpc("is_admin_o_gerente", { _user_id: context.userId });
    if (authError) throw new Error(authError.message);
    if (!autorizado) throw new Error("No autorizado para eliminar comprobantes.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: actual, error: actualError } = await supabaseAdmin
      .from("comprobantes_electronicos")
      .select("estado_fiscal")
      .eq("id", data.id)
      .single();
    if (actualError || !actual) throw new Error("No se encontró el comprobante.");
    if (actual.estado_fiscal !== "Borrador") throw new Error("Solo se pueden eliminar comprobantes en borrador.");

    const { error } = await supabaseAdmin.from("comprobantes_electronicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

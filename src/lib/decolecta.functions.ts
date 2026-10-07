import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://api.decolecta.com/v1";

async function obtenerToken(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as never as { from: (t: string) => any }).from("integraciones_credenciales").select("api_key").eq("proveedor", "decolecta").maybeSingle();
  return (data?.api_key as string | undefined) || process.env["DECOLECTA_API_KEY"] || "";
}

async function exigirGestor(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin_o_gerente", { _user_id: context.userId });
  if (!data) throw new Error("Solo Gerencia o Administración pueden configurar Decolecta.");
}

async function probarToken(token: string) {
  try {
    const res = await fetch(`${BASE}/sunat/ruc?numero=20100070970`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return { ok: false, mensaje: "La clave no es válida o no tiene permisos." };
    if (!res.ok) return { ok: false, mensaje: `Decolecta respondió con un error (${res.status}).` };
    return { ok: true, mensaje: "Conexión exitosa con Decolecta." };
  } catch {
    return { ok: false, mensaje: "No se pudo conectar con Decolecta." };
  }
}

export const estadoDecolecta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirGestor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as never as { from: (t: string) => any }).from("integraciones_credenciales").select("api_key,updated_at").eq("proveedor", "decolecta").maybeSingle();
    const k = (data?.api_key as string | undefined) ?? "";
    return { configurado: Boolean(k || process.env["DECOLECTA_API_KEY"]), terminacion: k ? k.slice(-4) : "", actualizado: (data?.updated_at as string | undefined) ?? "" };
  });

export const guardarDecolecta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ apiKey: z.string().trim().min(10, "La clave parece incompleta.").max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirGestor(context);
    const prueba = await probarToken(data.apiKey);
    if (!prueba.ok) return prueba;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as never as { from: (t: string) => any }).from("integraciones_credenciales").upsert({ proveedor: "decolecta", api_key: data.apiKey, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) return { ok: false, mensaje: "No se pudo guardar la clave." };
    return { ok: true, mensaje: "Clave verificada y guardada." };
  });

export const probarDecolecta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirGestor(context);
    const t = await obtenerToken();
    if (!t) return { ok: false, mensaje: "Aún no hay clave configurada." };
    return probarToken(t);
  });

export type ResultadoDocumento = {
  configurado: boolean;
  encontrado: boolean;
  tipoDocumento: "RUC" | "DNI";
  numero: string;
  razonSocial: string;
  direccion: string;
  estado: string;
  condicion: string;
  mensaje: string;
};

/** Consulta RUC (SUNAT) o DNI (RENIEC) a través de Decolecta. Sin token devuelve configurado:false y el usuario digita los datos. */
export const consultarDocumentoSunat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ numero: z.string().regex(/^(\d{8}|\d{11})$/, "Ingresa 8 dígitos (DNI) u 11 dígitos (RUC).") }).parse(data))
  .handler(async ({ data }): Promise<ResultadoDocumento> => {
    const esRuc = data.numero.length === 11;
    const vacio: ResultadoDocumento = { configurado: true, encontrado: false, tipoDocumento: esRuc ? "RUC" : "DNI", numero: data.numero, razonSocial: "", direccion: "", estado: "", condicion: "", mensaje: "" };
    const token = await obtenerToken();
    if (!token) return { ...vacio, configurado: false, mensaje: "La consulta automática aún no está activada. Escribe los datos del cliente manualmente." };
    try {
      const url = esRuc ? `${BASE}/sunat/ruc/full?numero=${data.numero}` : `${BASE}/reniec/dni?numero=${data.numero}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Referer: "https://telxen.app" } });
      if (res.status === 404) return { ...vacio, mensaje: "No se encontró el documento en los registros oficiales." };
      if (!res.ok) return { ...vacio, mensaje: `El servicio de consulta respondió con un error (${res.status}).` };
      const j = (await res.json()) as Record<string, unknown>;
      const txt = (k: string) => (typeof j[k] === "string" ? (j[k] as string) : "");
      const nombre = esRuc
        ? txt("razon_social") || txt("nombre_o_razon_social")
        : [txt("first_name"), txt("first_last_name"), txt("second_last_name")].filter(Boolean).join(" ") || txt("full_name");
      const direccion = [txt("direccion") || txt("address"), txt("distrito"), txt("provincia"), txt("departamento")].filter(Boolean).join(" - ");
      return { ...vacio, encontrado: Boolean(nombre), razonSocial: nombre.toUpperCase(), direccion: direccion.toUpperCase(), estado: (txt("estado") || txt("status")).toUpperCase(), condicion: (txt("condicion") || txt("condition")).toUpperCase(), mensaje: nombre ? "" : "El servicio no devolvió datos para ese número." };
    } catch {
      return { ...vacio, mensaje: "No se pudo conectar con el servicio de consulta." };
    }
  });

export type ResultadoTipoCambio = { configurado: boolean; encontrado: boolean; fecha: string; compra: number; venta: number; fuente: string; mensaje: string };

/** Tipo de cambio oficial del día. Usa la caché local y consulta Decolecta solo cuando falta. */
export const consultarTipoCambio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ fecha: z.string().date() }).parse(data))
  .handler(async ({ data, context }): Promise<ResultadoTipoCambio> => {
    const base: ResultadoTipoCambio = { configurado: true, encontrado: false, fecha: data.fecha, compra: 0, venta: 0, fuente: "", mensaje: "" };
    const { data: cache } = await context.supabase.from("tipo_cambio_diario").select("compra,venta,fuente").eq("fecha", data.fecha).maybeSingle();
    if (cache) return { ...base, encontrado: true, compra: Number(cache.compra), venta: Number(cache.venta), fuente: cache.fuente };
    const token = await obtenerToken();
    if (!token) return { ...base, configurado: false, mensaje: "El tipo de cambio automático aún no está activado. Escríbelo manualmente." };
    try {
      const res = await fetch(`${BASE}/tipo-cambio/sunat?date=${data.fecha}`, { headers: { Authorization: `Bearer ${token}`, Referer: "https://telxen.app" } });
      if (!res.ok) return { ...base, mensaje: `El servicio de tipo de cambio respondió con un error (${res.status}).` };
      const j = (await res.json()) as { compra?: number; venta?: number; buy_price?: number; sell_price?: number };
      const compra = Number(j.compra ?? j.buy_price ?? 0);
      const venta = Number(j.venta ?? j.sell_price ?? 0);
      if (!(venta > 0)) return { ...base, mensaje: "El servicio no devolvió el tipo de cambio de esa fecha." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("tipo_cambio_diario").upsert({ fecha: data.fecha, compra: compra || venta, venta, fuente: "decolecta" } as never);
      return { ...base, encontrado: true, compra: compra || venta, venta, fuente: "decolecta" };
    } catch {
      return { ...base, mensaje: "No se pudo conectar con el servicio de tipo de cambio." };
    }
  });

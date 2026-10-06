import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const esquema = z.object({
  ruc: z.string().trim().regex(/^\d{11}$/, "RUC de 11 dígitos"),
  client_id: z.string().trim().max(200),
  usuario_sol: z.string().trim().max(50),
  client_secret: z.string().max(500).optional(),
  clave_sol: z.string().max(100).optional(),
});

export const guardarConfigSire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => esquema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: esGerente } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "gerente" });
    if (!esGerente) throw new Error("Solo el Gerente puede configurar SIRE");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cred } = await supabaseAdmin.from("sire_credenciales").select("id, client_secret, clave_sol").limit(1).maybeSingle();
    const secret = data.client_secret?.trim() ? data.client_secret : cred?.client_secret ?? null;
    const clave = data.clave_sol?.trim() ? data.clave_sol : cred?.clave_sol ?? null;
    if (cred) await supabaseAdmin.from("sire_credenciales").update({ client_secret: secret, clave_sol: clave, updated_at: new Date().toISOString() }).eq("id", cred.id);
    else await supabaseAdmin.from("sire_credenciales").insert({ client_secret: secret, clave_sol: clave });

    const fila = { ruc: data.ruc, client_id: data.client_id, usuario_sol: data.usuario_sol, tiene_secret: !!secret, tiene_clave: !!clave };
    const { data: cfg } = await supabaseAdmin.from("sire_config").select("id").limit(1).maybeSingle();
    const r = cfg
      ? await supabaseAdmin.from("sire_config").update(fila).eq("id", cfg.id)
      : await supabaseAdmin.from("sire_config").insert(fila);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin_o_gerente", { _user_id: context.userId });
  if (!data) throw new Error("Sin permiso para el SIRE");
}

export const validarConexionSire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: esGerente } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "gerente" });
    if (!esGerente) return { ok: false, mensaje: "Solo el Gerente puede validar la conexión" };
    const s = await import("./sire-sunat.server");
    try {
      await s.obtenerToken(await s.cargarCredenciales());
      return { ok: true, mensaje: "Conexión con SUNAT exitosa: credenciales válidas para el SIRE" };
    } catch (e) {
      return { ok: false, mensaje: e instanceof Error ? e.message : "Error de conexión" };
    }
  });

const libroSchema = z.object({ libro: z.enum(["RVIE", "RCE"]), periodo: z.string().regex(/^\d{4}-\d{2}$/) });

/** Solicita (o retoma) la propuesta en SUNAT; espera hasta ~45 s y devuelve los ítems o el ticket pendiente. */
export const sincronizarSire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => libroSchema.extend({ ticket: z.string().nullish() }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const s = await import("./sire-sunat.server");
    const per = data.periodo.replace("-", "");
    try {
      const token = await s.obtenerToken(await s.cargarCredenciales());
      const ticket = data.ticket || (await s.solicitarPropuesta(token, data.libro, per));
      for (let i = 0; i < 9; i++) {
        const st = await s.consultarTicket(token, per, ticket);
        if (st.error) return { estado: "error" as const, mensaje: `SUNAT no pudo generar la propuesta: ${st.estado}` };
        if (st.terminado && st.archivo) {
          const txt = await s.descargarArchivo(token, data.libro, per, ticket, st.codProceso, st.archivo);
          return { estado: "listo" as const, ticket, items: s.parsearTxt(txt) };
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      return { estado: "pendiente" as const, ticket, mensaje: "SUNAT sigue procesando la propuesta. Vuelve a sincronizar en un momento." };
    } catch (e) {
      if (e instanceof s.SunatError) return { estado: "error" as const, mensaje: e.message };
      console.error(e);
      return { estado: "error" as const, mensaje: "Error inesperado al consultar SUNAT" };
    }
  });

export const aceptarSire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => libroSchema.parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const s = await import("./sire-sunat.server");
    try {
      const token = await s.obtenerToken(await s.cargarCredenciales());
      await s.aceptarPropuesta(token, data.libro, data.periodo.replace("-", ""));
      return { ok: true, mensaje: `Propuesta ${data.libro} aceptada en SUNAT` };
    } catch (e) {
      return { ok: false, mensaje: e instanceof Error ? e.message : "Error al aceptar" };
    }
  });

const docSchema = z.object({
  ruc: z.string().regex(/^\d{8,11}$/), razon: z.string().max(300), tipo: z.string().max(4),
  serie: z.string().max(10), numero: z.string().max(12), fecha: z.string().max(10),
  moneda: z.string().max(3), tipo_cambio: z.number(), base: z.number(), igv: z.number(), total: z.number(),
});

/** Descarga XML/PDF/CDR de hasta 10 comprobantes recibidos, los archiva y extrae sus ítems. */
export const descargarComprobantesSire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ periodo: z.string().regex(/^\d{4}-\d{2}$/), docs: z.array(docSchema).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const s = await import("./sire-sunat.server");
    const c = await import("./sire-cpe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let token: string;
    try { token = await s.obtenerToken(await s.cargarCredenciales(), c.SCOPE_CPE); }
    catch (e) { return { error: e instanceof Error ? e.message : "Error de credenciales", resultados: [] }; }

    const resultados: { clave: string; ok: boolean; error?: string }[] = [];
    for (const d of data.docs) {
      const clave = `${d.ruc}-${d.tipo}-${d.serie}-${d.numero}`;
      const base = `${data.periodo}/${clave}`;
      const fila: Record<string, any> & { xml_path?: string | null; pdf_path?: string | null; cdr_path?: string | null; estado_descarga?: string; error?: string | null } = {
        periodo: data.periodo, ruc_emisor: d.ruc, razon_emisor: d.razon, tipo: d.tipo, serie: d.serie, numero: d.numero,
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? d.fecha : null, moneda: d.moneda || "PEN", tipo_cambio: d.tipo_cambio || 1,
        base: d.base, igv: d.igv, total: d.total,
      };
      try {
        const subir = async (a: Awaited<ReturnType<typeof c.descargarCpe>>, suf: string) => {
          if (!a) return null;
          const path = `${base}${suf}.${a.ext}`;
          const { error } = await supabaseAdmin.storage.from("comprobantes-compra").upload(path, a.bytes, { contentType: a.mime, upsert: true });
          if (error) throw new Error(error.message);
          return path;
        };
        let motivo: string | null = null;
        const bajar = (t: "01" | "02" | "03") => c.descargarCpe(token, d.ruc, d.tipo, d.serie, d.numero, t)
          .catch((e) => { if (t !== "03") motivo ??= e instanceof Error ? e.message : "No disponible en SUNAT"; return null; });
        const xml = await bajar("02");
        const pdf = await bajar("01");
        const cdr = await bajar("03");
        fila.xml_path = await subir(xml, "");
        fila.pdf_path = await subir(pdf, "");
        fila.cdr_path = await subir(cdr, "-cdr");
        fila.estado_descarga = xml ? "Descargado" : "No disponible";
        fila.error = xml ? (cdr ? null : "CDR no disponible") : (motivo ?? "No disponible en SUNAT; puedes registrarla con los datos de la propuesta");
        const { data: row, error } = await supabaseAdmin.from("comprobantes_recibidos")
          .upsert(fila as any, { onConflict: "ruc_emisor,tipo,serie,numero" }).select("id").single();
        if (error) throw new Error(error.message);
        const txt = xml ? c.xmlDe(xml) : null;
        if (txt) {
          const u = c.parsearUbl(txt);
          if (!c.coincide(u, d.ruc, d.serie, d.numero)) {
            fila.error = `El XML de SUNAT no coincide (${u.emisorRuc} ${u.serie}-${u.numero})`;
          } else {
            await supabaseAdmin.from("comprobantes_recibidos_items").delete().eq("comprobante_id", row.id);
            if (u.items.length) await supabaseAdmin.from("comprobantes_recibidos_items").insert(u.items.map((it, i) => ({ ...it, origen: "sunat", orden: i + 1, comprobante_id: row.id })));
          }
        }
        resultados.push({ clave, ok: !!xml, error: (fila.error as string) ?? undefined });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al descargar";
        await supabaseAdmin.from("comprobantes_recibidos").upsert({ ...fila, estado_descarga: "Error", error: msg } as any, { onConflict: "ruc_emisor,tipo,serie,numero" });
        resultados.push({ clave, ok: false, error: msg });
      }
    }
    return { error: null, resultados };
  });

export const rucEmpresaSire = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("empresa_config").select("ruc").limit(1).maybeSingle();
    return data?.ruc ?? "";
  });

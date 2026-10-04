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

export const rucEmpresaSire = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("empresa_config").select("ruc").limit(1).maybeSingle();
    return data?.ruc ?? "";
  });

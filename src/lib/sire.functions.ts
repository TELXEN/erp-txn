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

export const validarConexionSire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: esGerente } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "gerente" });
    if (!esGerente) return { ok: false, mensaje: "Solo el Gerente puede validar la conexión" };
    const { data: cfg } = await context.supabase.from("sire_config").select("*").limit(1).maybeSingle();
    await new Promise((r) => setTimeout(r, 1200));
    if (!cfg) return { ok: false, mensaje: "Guarda primero las credenciales" };
    const faltan = [!/^\d{11}$/.test(cfg.ruc) && "RUC", !cfg.client_id && "Client ID", !cfg.usuario_sol && "Usuario SOL", !cfg.tiene_secret && "Client Secret", !cfg.tiene_clave && "Clave SOL"].filter(Boolean);
    if (faltan.length) return { ok: false, mensaje: `Faltan: ${faltan.join(", ")}` };
    return { ok: true, mensaje: "Conexión simulada con SUNAT exitosa (modo prueba)" };
  });

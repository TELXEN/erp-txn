import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Genera el siguiente código de obra o cotización; solo Administrador o Gerente. */
export const reservarCodigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tipo: z.enum(["proyecto", "cotizacion"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: e1 } = await context.supabase.rpc("is_admin_o_gerente", {
      _user_id: context.userId,
    });
    if (e1) throw new Error(e1.message);
    if (!autorizado) throw new Error("No autorizado para generar códigos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fn = data.tipo === "proyecto" ? "siguiente_codigo_proyecto" : "siguiente_codigo_cotizacion";
    const { data: codigo, error } = await supabaseAdmin.rpc(fn);
    if (error) throw new Error(error.message);
    return String(codigo);
  });

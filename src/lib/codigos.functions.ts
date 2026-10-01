import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Genera el siguiente código de obra o cotización; solo Administrador o Gerente. */
export const reservarCodigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tipo: z.enum(["proyecto", "cotizacion", "preliquidacion"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: e1 } = await context.supabase.rpc("is_admin_o_gerente", {
      _user_id: context.userId,
    });
    if (e1) throw new Error(e1.message);
    if (!autorizado) throw new Error("No autorizado para generar códigos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fn =
      data.tipo === "proyecto"
        ? "siguiente_codigo_proyecto"
        : data.tipo === "preliquidacion"
          ? "siguiente_codigo_preliquidacion"
          : "siguiente_codigo_cotizacion";
    const { data: codigo, error } = await supabaseAdmin.rpc(fn as "siguiente_codigo_cotizacion");
    if (error) throw new Error(error.message);
    return String(codigo);
  });

/** Genera el siguiente código de insumo (dígito de tipo + correlativo); solo Administrador o Gerente. */
export const reservarCodigoInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tipo: z.enum(["MO", "MAT", "EQ", "HT", "SC"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: autorizado, error: e1 } = await context.supabase.rpc("is_admin_o_gerente", {
      _user_id: context.userId,
    });
    if (e1) throw new Error(e1.message);
    if (!autorizado) throw new Error("No autorizado para generar códigos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: codigo, error } = await supabaseAdmin.rpc("siguiente_codigo_insumo" as "siguiente_codigo_cotizacion", {
      _tipo: data.tipo,
    } as never);
    if (error) throw new Error(error.message);
    return String(codigo);
  });

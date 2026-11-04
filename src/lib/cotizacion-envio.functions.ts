import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { snapshotEnvio } from "@/lib/cotizacion-comercial";

/** El navegador solicita la consulta diaria; el servidor verifica la caché y guarda el envío atómicamente. */
export const enviarCotizacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: cot, error: lectura } = await context.supabase.from("cotizaciones").select("estado").eq("id", data.id).single();
    if (lectura || !cot) throw new Error("No se pudo consultar la cotización.");
    if (cot.estado === "Enviada") return { ok: true };
    const fecha = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: cambio, error: errorCambio } = await context.supabase.from("tipo_cambio_diario").select("fecha,venta").eq("fecha", fecha).maybeSingle();
    if (errorCambio) throw new Error("No se pudo consultar el tipo de cambio del día.");
    const campos = snapshotEnvio(fecha, cambio ? { fecha: cambio.fecha, venta: Number(cambio.venta) } : null);
    const { data: guardada, error } = await context.supabase.from("cotizaciones").update(campos as never).eq("id", data.id).eq("estado", cot.estado).select("id").single();
    if (error || !guardada) throw new Error("No se pudo guardar el envío; actualiza la cotización e inténtalo otra vez.");
    return { ok: true };
  });
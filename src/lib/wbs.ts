import { supabase } from "@/integrations/supabase/client";

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
const db = supabase as unknown as Rpc;

/** Recalcula órdenes (sin huecos) y códigos de especialidades, categorías y partidas maestras. */
export async function recodificarWbs() {
  const { error } = await db.rpc("recodificar_wbs");
  if (error) throw new Error(error.message);
}

/** Mueve un elemento del catálogo WBS una posición arriba (-1) o abajo (+1). */
export async function moverWbs(tabla: "especialidades" | "categorias" | "partidas", id: string, direccion: -1 | 1) {
  const { error } = await db.rpc("mover_item_wbs", { _tabla: tabla, _id: id, _direccion: direccion });
  if (error) throw new Error(error.message);
}

/** Muestra un código de partida de 8 dígitos agrupado: 60302005 → 6.03.02.005 */
export const codigoPartidaLegible = (c?: string | null) =>
  c && /^\d{8}$/.test(c) ? `${c[0]}.${c.slice(1, 3)}.${c.slice(3, 5)}.${c.slice(5)}` : c || "—";

/** Orden mayor a cualquiera existente, para enviar un elemento al final de su grupo. */
export const ORDEN_FINAL = 999999;

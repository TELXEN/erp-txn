import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { totalGG, totalHojaGG, type FilaGG } from "@/lib/gastos-generales-cotizacion";

export { tieneHojaGG, totalHojaGG } from "@/lib/gastos-generales-cotizacion";

const SELECCION = "id, cotizacion_id, nivel, cantidad, tiempo, precio_unitario, tipo";

/** Total de la hoja de gastos generales de una cotización, o null si no tiene hoja. */
export function useTotalGGHoja(cotizacionId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["cotizacion_gg", cotizacionId ?? ""],
    enabled: Boolean(cotizacionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizacion_gastos_generales")
        .select(SELECCION)
        .eq("cotizacion_id", cotizacionId ?? "");
      if (error) throw error;
      return (data ?? []) as FilaGG[];
    },
  });
  return totalHojaGG(data ?? []);
}

/** Totales de gastos generales de varias cotizaciones a la vez (para listas y tarjetas). */
export async function totalesGGDeLista(ids: string[]): Promise<Record<string, number | null>> {
  const res: Record<string, number | null> = {};
  for (const id of ids) res[id] = null;
  if (!ids.length) return res;
  const { data, error } = await supabase
    .from("cotizacion_gastos_generales")
    .select(SELECCION)
    .in("cotizacion_id", ids);
  if (error) throw error;
  const filas = (data ?? []) as FilaGG[];
  for (const id of ids) res[id] = totalHojaGG(filas.filter((f) => f.cotizacion_id === id));
  return res;
}

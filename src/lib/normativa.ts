import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Fila del historial normativo (RMV/UIT por fecha de vigencia). */
export type FilaNormativa = { id: string; vigencia_desde: string; rmv: number; uit: number; base_legal: string; observaciones: string | null };

/** Valores de respaldo si la tabla aún no carga. */
export const NORMATIVA_RESPALDO: FilaNormativa[] = [
  { id: "r1", vigencia_desde: "2025-01-01", rmv: 1130, uit: 5350, base_legal: "", observaciones: null },
  { id: "r2", vigencia_desde: "2026-01-01", rmv: 1130, uit: 5500, base_legal: "", observaciones: null },
  { id: "r3", vigencia_desde: "2026-10-01", rmv: 1230, uit: 5500, base_legal: "", observaciones: null },
];

/** Norma vigente en una fecha (YYYY-MM-DD) o período (YYYY-MM): la más reciente con vigencia_desde <= fecha. */
export function normaEn(lista: FilaNormativa[], fecha: string): FilaNormativa {
  const f = fecha.length === 7 ? `${fecha}-31` : fecha;
  const orden = [...(lista.length ? lista : NORMATIVA_RESPALDO)].sort((a, b) => a.vigencia_desde.localeCompare(b.vigencia_desde));
  return orden.filter((n) => n.vigencia_desde <= f).pop() ?? orden[0]!;
}
/** RMV del período (YYYY-MM). */
export const rmvEn = (lista: FilaNormativa[], periodo: string) => Number(normaEn(lista, periodo).rmv);
/** UIT del año fiscal: la vigente al 1 de enero de ese año. */
export const uitEn = (lista: FilaNormativa[], anio: number) => Number(normaEn(lista, `${anio}-01-01`).uit);
/** Norma que empieza dentro del período (YYYY-MM), para alertar del cambio. */
export const normaNuevaEn = (lista: FilaNormativa[], periodo: string) => lista.find((n) => n.vigencia_desde.slice(0, 7) === periodo);

export const useNormativa = () =>
  useQuery({
    queryKey: ["historial_normativo"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any }).from("historial_normativo").select("*").order("vigencia_desde");
      if (error) throw error;
      return (data ?? []) as FilaNormativa[];
    },
  });

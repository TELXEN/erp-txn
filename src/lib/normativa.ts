import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** RMV: cada decreto rige desde un día exacto. */
export type FilaRmv = { id: string; vigencia_desde: string; monto: number; base_legal: string; observaciones: string | null };
/** UIT: un valor por año fiscal (rige desde el 1 de enero). */
export type FilaUit = { id: string; anio: number; monto: number; base_legal: string; observaciones: string | null };

export const RMV_RESPALDO: FilaRmv[] = [
  { id: "r1", vigencia_desde: "2025-01-01", monto: 1130, base_legal: "", observaciones: null },
  { id: "r2", vigencia_desde: "2026-10-01", monto: 1230, base_legal: "", observaciones: null },
];
export const UIT_RESPALDO: FilaUit[] = [
  { id: "u1", anio: 2025, monto: 5350, base_legal: "", observaciones: null },
  { id: "u2", anio: 2026, monto: 5500, base_legal: "", observaciones: null },
];

/** RMV vigente en una fecha (YYYY-MM-DD) o período (YYYY-MM). */
export function rmvVigente(lista: FilaRmv[], fecha: string): FilaRmv {
  const f = fecha.length === 7 ? `${fecha}-31` : fecha;
  const orden = [...(lista.length ? lista : RMV_RESPALDO)].sort((a, b) => a.vigencia_desde.localeCompare(b.vigencia_desde));
  return orden.filter((n) => n.vigencia_desde <= f).pop() ?? orden[0]!;
}
export const rmvEn = (lista: FilaRmv[], periodo: string) => Number(rmvVigente(lista, periodo).monto);
/** UIT del año fiscal: la del año o, si falta, la del último año registrado anterior. */
export function uitVigente(lista: FilaUit[], anio: number): FilaUit {
  const orden = [...(lista.length ? lista : UIT_RESPALDO)].sort((a, b) => a.anio - b.anio);
  return orden.filter((u) => u.anio <= anio).pop() ?? orden[0]!;
}
export const uitEn = (lista: FilaUit[], anio: number) => Number(uitVigente(lista, anio).monto);
/** RMV que empieza dentro del período (YYYY-MM), para alertar del cambio. */
export const rmvNuevaEn = (lista: FilaRmv[], periodo: string) => lista.find((n) => n.vigencia_desde.slice(0, 7) === periodo);

const db = supabase as unknown as { from: (t: string) => any };
export const useRmv = () =>
  useQuery({
    queryKey: ["normativa_rmv"],
    queryFn: async () => {
      const { data, error } = await db.from("normativa_rmv").select("*").order("vigencia_desde");
      if (error) throw error;
      return (data ?? []) as FilaRmv[];
    },
  });
export const useUit = () =>
  useQuery({
    queryKey: ["normativa_uit"],
    queryFn: async () => {
      const { data, error } = await db.from("normativa_uit").select("*").order("anio");
      if (error) throw error;
      return (data ?? []) as FilaUit[];
    },
  });

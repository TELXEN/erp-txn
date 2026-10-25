import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const REGIMENES_EMPRESA = ["General", "MYPE Pequeña", "MYPE Micro", "Agrario"] as const;
export type RegimenEmpresa = { id?: string; regimen: string; fecha_inicio: string; remype_numero?: string | null; remype_certificado?: string | null; notas?: string | null };

/** Rango de protección: un trabajador nunca puede quedar en un régimen menor al de la empresa cuando ingresó. */
export const rangoRegimen = (r: string) => (r === "MYPE Micro" ? 0 : r === "MYPE Pequeña" ? 1 : 2);

/** Régimen de la empresa vigente en una fecha; sin historial previo, General. */
export function regimenVigente(historial: RegimenEmpresa[], fecha: string): string {
  return [...historial].filter((h) => h.fecha_inicio <= fecha).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0]?.regimen ?? "General";
}

/** Devuelve el motivo si el régimen elegido es menor que el de la empresa a la fecha de ingreso (misma regla que el trigger). */
export function errorRegimenTrabajador(historial: RegimenEmpresa[], fechaIngreso: string | null, regimen: string): string | null {
  if (!fechaIngreso) return null;
  const empresa = regimenVigente(historial, fechaIngreso);
  return rangoRegimen(regimen) < rangoRegimen(empresa)
    ? `Ingresó con la empresa en régimen ${empresa}; no puede pasar a ${regimen}. El cambio de régimen de la empresa solo aplica a quienes ingresen desde su fecha de inicio.`
    : null;
}

export function useRegimenesEmpresa() {
  return useQuery({
    queryKey: ["regimenes_empresa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regimenes_empresa").select("*").order("fecha_inicio");
      if (error) throw error;
      return (data ?? []) as RegimenEmpresa[];
    },
  });
}

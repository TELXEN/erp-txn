import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Dígito fijo de cada tipo de insumo en el código modular (EE T SS NNN). */
export const DIGITO_TIPO_INSUMO = {
  materiales: "1",
  mano_obra: "2",
  equipos_herramientas: "3",
  subcontratos: "4",
} as const;

export const NOMBRE_TIPO_INSUMO: Record<keyof typeof DIGITO_TIPO_INSUMO, string> = {
  materiales: "Materiales",
  mano_obra: "Mano de Obra",
  equipos_herramientas: "Equipos / Herramientas",
  subcontratos: "Subcontratos",
};

/** Arma el código de 8 dígitos sin separadores: EE + T + SS + NNN. */
export function armarCodigoInsumo(especialidad: string, tipo: keyof typeof DIGITO_TIPO_INSUMO, subfamilia: string, correlativo: number) {
  if (!/^\d{2}$/.test(especialidad) || !/^\d{2}$/.test(subfamilia)) throw new Error("Especialidad y subfamilia usan 2 dígitos");
  if (!Number.isInteger(correlativo) || correlativo < 1 || correlativo > 999) throw new Error("Correlativo fuera de 001–999");
  return `${especialidad}${DIGITO_TIPO_INSUMO[tipo]}${subfamilia}${String(correlativo).padStart(3, "0")}`;
}

export type Subfamilia = { id: string; especialidad_id: string; bloque: string; codigo: string; nombre: string; activo: boolean };

export const useSubfamilias = () =>
  useQuery({
    queryKey: ["subfamilias_insumo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subfamilias_insumo").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as Subfamilia[];
    },
  });

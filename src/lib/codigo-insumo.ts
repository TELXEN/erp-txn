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

/** Arma el código de 8 dígitos: T + EE + SS + NNN. Solo materiales usan subfamilia; los demás llevan 00. */
export function armarCodigoInsumo(tipo: keyof typeof DIGITO_TIPO_INSUMO, especialidad: string, subfamilia: string | null, correlativo: number) {
  if (!/^\d{2}$/.test(especialidad)) throw new Error("La especialidad usa 2 dígitos");
  const ss = tipo === "materiales" ? subfamilia : "00";
  if (!ss || !/^\d{2}$/.test(ss)) throw new Error("El material necesita una subfamilia de 2 dígitos");
  if (!Number.isInteger(correlativo) || correlativo < 1 || correlativo > 999) throw new Error("Correlativo fuera de 001–999");
  return `${DIGITO_TIPO_INSUMO[tipo]}${especialidad}${ss}${String(correlativo).padStart(3, "0")}`;
}

export type Subfamilia = { id: string; especialidad_id: string; bloque: string; codigo: string; nombre: string; activo: boolean; descripcion?: string | null };

export const useSubfamilias = () =>
  useQuery({
    queryKey: ["subfamilias_insumo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subfamilias_insumo").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as Subfamilia[];
    },
  });

/** Reserva el siguiente código T+EE+SS+NNN. La función de la base es la única que numera:
 *  valida que quien llama sea personal de la empresa y que la subfamilia pertenezca a la especialidad. */
export async function codigoInsumoModular(a: {
  especialidad: string;
  tipo: string;
  subfamilia?: string | null;
  categoria?: string | null;
}): Promise<string> {
  const rpc = supabase as unknown as {
    rpc: (f: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("siguiente_codigo_insumo_modular", {
    _especialidad: a.especialidad,
    _tipo: a.tipo,
    _subfamilia: a.subfamilia || null,
    _categoria: a.categoria ?? null,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CodificacionDocumento = {
  id: string;
  orden: number;
  codigo: string;
  digitos: number;
  correlativo_actual: number;
  nombre: string;
  es_sistema: boolean;
};

export const useCodificacionDocumentos = () =>
  useQuery({
    queryKey: ["codificacion_documentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("codificacion_documentos" as never)
        .select("*")
        .order("orden")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CodificacionDocumento[];
    },
  });

export function useCodificacionDocumento(nombre: string) {
  const q = useCodificacionDocumentos();
  return { ...q, data: q.data?.find((d) => d.nombre === nombre) ?? null };
}

/** Siguiente código sin consumir el correlativo: CÓDIGO + correlativo con relleno. */
export function previsualizarCodigoDocumento(
  cfg: Partial<Pick<CodificacionDocumento, "codigo" | "digitos" | "correlativo_actual">>,
  correlativo?: number,
) {
  const digitos = Math.max(Number(cfg.digitos ?? 3) || 1, 1);
  const numero = correlativo ?? Number(cfg.correlativo_actual ?? 0) + 1;
  return `${cfg.codigo ?? ""}${String(numero).padStart(digitos, "0")}`;
}

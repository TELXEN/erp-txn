import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CodificacionConfig = {
  id: string;
  prefijo: string;
  incluir_anio: boolean;
  anio_dos_digitos: boolean;
  separador: string;
  tipo_letra: string;
  digitos: number;
  correlativo_actual: number;
};

export function useCodificacion() {
  return useQuery({
    queryKey: ["codificacion_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("codificacion_config")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CodificacionConfig | null;
    },
  });
}

/** Vista previa del siguiente código sin consumir el correlativo. Ej.: TXN26-P001 */
export function previsualizarCodigo(cfg: Partial<CodificacionConfig>, correlativo?: number) {
  const prefijo = (cfg.prefijo ?? "TXN").trim().toUpperCase();
  const separador = cfg.separador ?? "-";
  const digitos = Math.max(Number(cfg.digitos ?? 3) || 1, 1);
  const numero = correlativo ?? Number(cfg.correlativo_actual ?? 0) + 1;
  const anioCompleto = String(new Date().getFullYear());
  const anio =
    cfg.incluir_anio === false ? "" : cfg.anio_dos_digitos === false ? anioCompleto : anioCompleto.slice(-2);
  const letra = (cfg.tipo_letra ?? "P").trim().toUpperCase();
  return `${prefijo}${anio}${separador}${letra}${String(numero).padStart(digitos, "0")}`;
}


/** Reserva y devuelve el siguiente código correlativo de proyecto. */
export async function generarCodigoProyecto(): Promise<string> {
  const { reservarCodigo } = await import("./codigos.functions");
  return reservarCodigo({ data: { tipo: "proyecto" } });
}

/** Texto de proyecto con código delante, para listas desplegables. */
export const etiquetaProyecto = (p: { codigo?: string | null; nombre: string }) =>
  p.codigo ? `[${p.codigo}] ${p.nombre}` : p.nombre;

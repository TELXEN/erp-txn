import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CodificacionPreliquidacionConfig = {
  id: string;
  prefijo: string;
  incluir_anio: boolean;
  anio_dos_digitos: boolean;
  separador: string;
  tipo_letra: string;
  digitos: number;
  correlativo_actual: number;
};

export const useCodificacionPreliquidacion = () =>
  useQuery({
    queryKey: ["codificacion_preliquidacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("codificacion_preliquidacion")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CodificacionPreliquidacionConfig | null;
    },
  });

/** Vista previa del siguiente código de preliquidación sin consumir el correlativo. Ej.: TXN26-PL001 */
export function previsualizarCodigoPreliquidacion(
  cfg: Partial<CodificacionPreliquidacionConfig>,
  correlativo?: number,
) {
  const prefijo = (cfg.prefijo ?? "TXN").trim().toUpperCase();
  const separador = cfg.separador ?? "-";
  const digitos = Math.max(Number(cfg.digitos ?? 3) || 1, 1);
  const numero = correlativo ?? Number(cfg.correlativo_actual ?? 0) + 1;
  const anioCompleto = String(new Date().getFullYear());
  const anio =
    cfg.incluir_anio === false ? "" : cfg.anio_dos_digitos === false ? anioCompleto : anioCompleto.slice(-2);
  const letra = (cfg.tipo_letra ?? "PL").trim().toUpperCase();
  return `${prefijo}${anio}${separador}${letra}${String(numero).padStart(digitos, "0")}`;
}

import { previsualizarCodigoDocumento, useCodificacionDocumento } from "@/lib/codificacion-documentos";

export const useCodificacionPreliquidacion = () => useCodificacionDocumento("PRELIQUIDACIONES");

/** Vista previa del siguiente código de preliquidación (CÓDIGO + correlativo). */
export const previsualizarCodigoPreliquidacion = previsualizarCodigoDocumento;

import { previsualizarCodigoDocumento, useCodificacionDocumento } from "@/lib/codificacion-documentos";

export const useCodificacion = () => useCodificacionDocumento("PROYECTOS");

/** Vista previa del siguiente código de proyecto (CÓDIGO + correlativo). */
export const previsualizarCodigo = previsualizarCodigoDocumento;


/** Reserva y devuelve el siguiente código correlativo de proyecto. */
export async function generarCodigoProyecto(): Promise<string> {
  const { reservarCodigo } = await import("./codigos.functions");
  return reservarCodigo({ data: { tipo: "proyecto" } });
}

/** Texto de proyecto con código delante, para listas desplegables. */
export const etiquetaProyecto = (p: { codigo?: string | null; nombre: string }) =>
  p.codigo ? `[${p.codigo}] ${p.nombre}` : p.nombre;

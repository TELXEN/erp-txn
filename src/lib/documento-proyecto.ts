export const TIPOS_DOCUMENTO_PROYECTO = ["Orden de Compra", "Orden de Servicio", "Contrato"] as const;
export type DocumentoProyecto = { documento_tipo?: string | null; documento_numero?: string | null };

/** Copia solo el número, sin mezclarlo con el concepto comercial. */
export function numeroDocumentoProyecto(proyecto?: DocumentoProyecto | null): string {
  return proyecto?.documento_tipo ? (proyecto.documento_numero ?? "").trim() : "";
}
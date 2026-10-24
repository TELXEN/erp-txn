// Suspensión de retención de 4ta categoría: vale solo para su año y desde
// dos días después de su fecha. Un único criterio para todos los recibos.
export type DatosSuspension = {
  suspension_cuarta?: boolean | null;
  suspension_cuarta_fecha?: string | null;
  suspension_cuarta_anio?: number | null;
};

export const DIAS_ANTICIPACION_SUSPENSION = 2;

const dia = (iso: string) => Math.round(new Date(iso.slice(0, 10) + "T00:00:00Z").getTime() / 86400000);

/** true si la suspensión exime de retención al recibo emitido en `fechaRecibo` (YYYY-MM-DD). */
export function suspensionVigente(t: DatosSuspension | null | undefined, fechaRecibo: string) {
  if (!t?.suspension_cuarta || !t.suspension_cuarta_fecha || !t.suspension_cuarta_anio || !fechaRecibo) return false;
  if (Number(fechaRecibo.slice(0, 4)) !== Number(t.suspension_cuarta_anio)) return false;
  return dia(fechaRecibo) - dia(t.suspension_cuarta_fecha) >= DIAS_ANTICIPACION_SUSPENSION;
}

export type EstadoSuspension = "vigente" | "vencida" | "sin_fecha" | "ninguna";

export function estadoSuspension(t: DatosSuspension | null | undefined, anioActual: number): EstadoSuspension {
  if (!t?.suspension_cuarta) return "ninguna";
  if (!t.suspension_cuarta_fecha || !t.suspension_cuarta_anio) return "sin_fecha";
  return Number(t.suspension_cuarta_anio) >= anioActual ? "vigente" : "vencida";
}

/** Motivo legible cuando hay suspensión marcada pero no aplica a este recibo. */
export function avisoSuspension(t: DatosSuspension | null | undefined, fechaRecibo: string) {
  if (!t?.suspension_cuarta || suspensionVigente(t, fechaRecibo)) return "";
  if (!t.suspension_cuarta_fecha || !t.suspension_cuarta_anio) return "Suspensión de 4ta sin fecha registrada: se aplica retención 8%.";
  if (Number(fechaRecibo.slice(0, 4)) !== Number(t.suspension_cuarta_anio))
    return `Suspensión de ${t.suspension_cuarta_anio} no vigente para ${fechaRecibo.slice(0, 4)}: se aplica retención 8%.`;
  return `La suspensión debe tener al menos ${DIAS_ANTICIPACION_SUSPENSION} días de anticipación al recibo: se aplica retención 8%.`;
}

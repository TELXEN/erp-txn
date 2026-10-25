/** Días pagables del personal Staff en un mes comercial de 30 días, según ingreso y cese dentro del mes. */
export function diasStaffMes(fechaIngreso: string | null, fechaCese: string | null, anio: number, mes: number): number {
  const clave = `${anio}-${String(mes).padStart(2, "0")}`;
  if (fechaIngreso && fechaIngreso.slice(0, 7) > clave) return 0;
  if (fechaCese && fechaCese.slice(0, 7) < clave) return 0;
  const inicio = fechaIngreso && fechaIngreso.slice(0, 7) === clave ? Number(fechaIngreso.slice(8, 10)) : 1;
  const fin = fechaCese && fechaCese.slice(0, 7) === clave ? Math.min(30, Number(fechaCese.slice(8, 10))) : 30;
  return Math.max(0, fin - Math.min(inicio, 31) + 1);
}

const dmy = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

/** Nota que explica los días de la boleta Staff; null cuando es mes completo. */
export function motivoDiasStaff(fechaIngreso: string | null, fechaCese: string | null, anio: number, mes: number): string | null {
  const clave = `${anio}-${String(mes).padStart(2, "0")}`;
  const partes: string[] = [];
  if (fechaIngreso?.slice(0, 7) === clave && fechaIngreso.slice(8, 10) !== "01") partes.push(`Ingreso ${dmy(fechaIngreso)}`);
  if (fechaCese?.slice(0, 7) === clave && Number(fechaCese.slice(8, 10)) < 30) partes.push(`Cese ${dmy(fechaCese)}`);
  return partes.length ? `${partes.join(" · ")} · ${diasStaffMes(fechaIngreso, fechaCese, anio, mes)} días` : null;
}

export const MOTIVO_MANUAL = "Ajuste manual";

export const CATEGORIAS_EPP = ["Cabeza", "Ojos y rostro", "Auditiva", "Respiratoria", "Manos", "Pies", "Cuerpo", "Altura", "Otros"];
export const CRITICIDADES = ["Alta", "Media", "Baja"];
export const MOTIVOS_ENTREGA = ["Dotación inicial", "Reposición por desgaste", "Reposición por pérdida", "Renovación por vida útil", "Visita / temporal"];

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function fechaCorta(f: string | null | undefined): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

/** Estado de una entrega: devuelta, vencida, por renovar (≤30 días) o vigente. */
export function estadoEntrega(e: { fecha_devolucion: string | null; fecha_renovacion: string | null }, hoy: string): "Devuelto" | "Vencido" | "Por renovar" | "Vigente" {
  if (e.fecha_devolucion) return "Devuelto";
  if (!e.fecha_renovacion) return "Vigente";
  if (e.fecha_renovacion < hoy) return "Vencido";
  if (e.fecha_renovacion <= sumarDias(hoy, 30)) return "Por renovar";
  return "Vigente";
}

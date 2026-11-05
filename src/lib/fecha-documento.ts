import { format, isValid, parse, parseISO } from "date-fns";

export function mostrarFechaDocumento(iso: string) {
  if (!iso) return "";
  const fecha = parseISO(iso);
  return isValid(fecha) ? format(fecha, "dd/MM/yyyy") : "";
}
export function leerFechaDocumento(texto: string): string | null {
  if (!texto.trim()) return "";
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return null;
  const fecha = parse(texto, "dd/MM/yyyy", new Date(2000, 0, 1));
  return isValid(fecha) && format(fecha, "dd/MM/yyyy") === texto ? format(fecha, "yyyy-MM-dd") : null;
}
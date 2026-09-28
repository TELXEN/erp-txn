import type { Database } from "@/integrations/supabase/types";

export type TipoComprobante = "01" | "03" | "07" | "08";
export type OperacionTipo = "gravada" | "exonerada" | "inafecta";
export type EstadoFiscal = "Borrador" | "Emitido - Pendiente SUNAT" | "Aceptado con CDR" | "Observado" | "Rechazado" | "Anulado con Nota de Crédito";
export type TipoTributarioCpe = "detraccion" | "retencion" | "ninguno";
export type Comprobante = Database["public"]["Tables"]["comprobantes_electronicos"]["Row"];
export type ComprobanteItem = Database["public"]["Tables"]["comprobante_items"]["Row"];
export type ComprobanteCuota = Database["public"]["Tables"]["comprobante_cuotas"]["Row"];

export const TIPOS_COMPROBANTE: Record<TipoComprobante, string> = {
  "01": "Factura electrónica",
  "03": "Boleta de venta electrónica",
  "07": "Nota de crédito electrónica",
  "08": "Nota de débito electrónica",
};

export const UNIDADES_SUNAT = [
  ["NIU", "Unidad"], ["ZZ", "Servicio"], ["MTR", "Metro"], ["MTK", "Metro cuadrado"],
  ["MTQ", "Metro cúbico"], ["KGM", "Kilogramo"], ["HUR", "Hora"], ["DAY", "Día"],
] as const;

export const CODIGOS_SPOT = [
  ["", "No aplica"], ["037", "037 · Contratos de construcción"],
  ["022", "022 · Otros servicios empresariales"], ["019", "019 · Arrendamiento de bienes"],
] as const;

export type ItemEditor = { codigo: string; descripcion: string; unidad_sunat: string; cantidad: string; valor_unitario: string; descuento: string };
export const itemComprobanteVacio = (): ItemEditor => ({ codigo: "", descripcion: "", unidad_sunat: "ZZ", cantidad: "1", valor_unitario: "", descuento: "0" });

export function calcularItem(item: ItemEditor, operacion: OperacionTipo) {
  const cantidad = Math.max(0, Number(item.cantidad || 0));
  const valorUnitario = Math.max(0, Number(item.valor_unitario || 0));
  const descuento = Math.max(0, Number(item.descuento || 0));
  const subtotal = Math.max(0, cantidad * valorUnitario - descuento);
  const igv = operacion === "gravada" ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  return { cantidad, valorUnitario, descuento, subtotal, igv, total: subtotal + igv };
}

export function calcularComprobante(items: ItemEditor[], operacion: OperacionTipo, tc: number, tipoTributario: TipoTributarioCpe, pct: number) {
  const filas = items.map((i) => calcularItem(i, operacion));
  const valorVenta = filas.reduce((s, i) => s + i.subtotal, 0);
  const descuentos = items.reduce((s, i) => s + Math.max(0, Number(i.descuento || 0)), 0);
  const igv = filas.reduce((s, i) => s + i.igv, 0);
  const total = valorVenta + igv;
  const totalPen = total * (tc > 0 ? tc : 1);
  const aplica = tipoTributario !== "ninguno" && pct > 0 && totalPen > 700;
  const montoDetraccion = aplica && tipoTributario === "detraccion" ? Math.floor((totalPen * pct) / 100 + 0.5) : 0;
  const montoRetencion = aplica && tipoTributario === "retencion" ? Number(((totalPen * pct) / 100).toFixed(2)) : 0;
  return { valorVenta, descuentos, igv, total, totalPen, montoDetraccion, montoRetencion };
}

const UNIDADES = ["CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
function tramo(n: number): string {
  if (n === 100) return "CIEN";
  if (n < 30) return UNIDADES[n] ?? "";
  if (n < 100) return `${DECENAS[Math.floor(n / 10)]}${n % 10 ? ` Y ${UNIDADES[n % 10]}` : ""}`;
  return `${CENTENAS[Math.floor(n / 100)]} ${tramo(n % 100)}`.trim();
}
function enteroLetras(n: number): string {
  if (n < 1000) return tramo(n);
  if (n < 1_000_000) return `${Math.floor(n / 1000) === 1 ? "MIL" : `${tramo(Math.floor(n / 1000))} MIL`} ${tramo(n % 1000)}`.trim();
  const millones = Math.floor(n / 1_000_000);
  return `${millones === 1 ? "UN MILLÓN" : `${enteroLetras(millones)} MILLONES`} ${enteroLetras(n % 1_000_000)}`.trim();
}
export function montoEnLetras(monto: number, moneda: "PEN" | "USD") {
  const entero = Math.floor(Math.max(0, monto));
  const centimos = Math.round((monto - entero) * 100).toString().padStart(2, "0");
  return `SON: ${enteroLetras(entero)} CON ${centimos}/100 ${moneda === "USD" ? "DÓLARES AMERICANOS" : "SOLES"}`;
}

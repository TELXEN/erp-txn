import type { Database } from "@/integrations/supabase/types";

export type TipoComprobante = "01" | "03" | "07" | "08" | "09" | "20" | "40" | "RA";
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
  "09": "Guía de remisión remitente",
  "20": "Comprobante de retención",
  "40": "Comprobante de percepción",
  "RA": "Comunicación de baja",
};

export const SERIE_DEFECTO: Record<TipoComprobante, string> = { "01": "F001", "03": "B001", "07": "FC01", "08": "FD01", "09": "T001", "20": "R001", "40": "P001", "RA": "RA01" };

/** Pestañas del módulo, en el orden en que se muestran. */
export const PESTANAS_CPE: { tipo: TipoComprobante; etiqueta: string; corto: string }[] = [
  { tipo: "01", etiqueta: "Facturas", corto: "FACTURA ELECTRÓNICA" },
  { tipo: "03", etiqueta: "Boletas", corto: "BOLETA DE VENTA ELECTRÓNICA" },
  { tipo: "07", etiqueta: "Notas de crédito", corto: "NOTA DE CRÉDITO ELECTRÓNICA" },
  { tipo: "08", etiqueta: "Notas de débito", corto: "NOTA DE DÉBITO ELECTRÓNICA" },
  { tipo: "09", etiqueta: "Guías de remisión", corto: "GUÍA DE REMISIÓN REMITENTE" },
  { tipo: "20", etiqueta: "Retenciones", corto: "COMPROBANTE DE RETENCIÓN" },
  { tipo: "40", etiqueta: "Percepciones", corto: "COMPROBANTE DE PERCEPCIÓN" },
  { tipo: "RA", etiqueta: "Bajas / anulaciones", corto: "COMUNICACIÓN DE BAJA" },
];

/** Documentos con conceptos valorizados (tabla de ítems). */
export const usaItems = (t: TipoComprobante) => ["01", "03", "07", "08", "09"].includes(t);
/** Documentos que listan comprobantes relacionados. */
export const usaRelacionados = (t: TipoComprobante) => ["20", "40", "RA"].includes(t);
/** Documentos con importes, IGV y régimen tributario. */
export const usaImportes = (t: TipoComprobante) => ["01", "03", "07", "08"].includes(t);

export const MOTIVOS_NOTA_CREDITO = [
  ["01", "01 · Anulación de la operación"], ["02", "02 · Anulación por error en el RUC"], ["03", "03 · Corrección por error en la descripción"],
  ["04", "04 · Descuento global"], ["05", "05 · Descuento por ítem"], ["06", "06 · Devolución total"], ["07", "07 · Devolución por ítem"],
  ["08", "08 · Bonificación"], ["09", "09 · Disminución en el valor"], ["10", "10 · Otros conceptos"],
] as const;

export const MOTIVOS_NOTA_DEBITO = [
  ["01", "01 · Intereses por mora"], ["02", "02 · Aumento en el valor"], ["03", "03 · Penalidades / otros conceptos"],
] as const;

export const MOTIVOS_TRASLADO = [
  ["01", "01 · Venta"], ["02", "02 · Compra"], ["04", "04 · Traslado entre establecimientos de la empresa"],
  ["08", "08 · Importación"], ["09", "09 · Exportación"], ["13", "13 · Otros (obra, devolución, servicio)"],
  ["14", "14 · Venta sujeta a confirmación del comprador"], ["18", "18 · Traslado emisor itinerante"],
] as const;

export const MODALIDADES_TRASLADO = [["02", "02 · Transporte privado"], ["01", "01 · Transporte público"]] as const;

export const TASAS_RETENCION = [["3", "3% · Régimen general"], ["6", "6% · Tasa anterior"]] as const;
export const TASAS_PERCEPCION = [["2", "2% · Venta interna"], ["1", "1% · Combustible"], ["0.5", "0.5% · Agente de percepción"]] as const;

export const MOTIVOS_BAJA = [
  ["01", "01 · Error en los datos del receptor"], ["02", "02 · Error en la descripción o importes"],
  ["03", "03 · Operación no realizada"], ["04", "04 · Duplicidad del comprobante"], ["05", "05 · Otros"],
] as const;

export const TIPOS_DOC_RELACIONADO = [["01", "Factura"], ["03", "Boleta"], ["07", "Nota de crédito"], ["08", "Nota de débito"]] as const;

export type DocRelacionado = { tipo: string; serie: string; numero: string; fecha: string; importe: string };
export const docRelacionadoVacio = (): DocRelacionado => ({ tipo: "01", serie: "", numero: "", fecha: "", importe: "" });

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

/** Cuota editable de una venta al crédito. */
export type CuotaEditor = { fecha: string; monto: string };
export const cuotaVacia = (fecha = ""): CuotaEditor => ({ fecha, monto: "" });
/** Reparte el total en n cuotas iguales, ajustando la última por redondeo. */
export function repartirCuotas(total: number, fechas: string[]): CuotaEditor[] {
  const n = Math.max(1, fechas.length);
  const base = Math.floor((total / n) * 100) / 100;
  return fechas.map((fecha, i) => ({ fecha, monto: (i === n - 1 ? Number((total - base * (n - 1)).toFixed(2)) : base).toFixed(2) }));
}

/** Tasas de IGV permitidas: general 18% y especial 10% + 0.5% (Ley 31556). */
export const TASAS_IGV = [["18", "18% · Tasa general"], ["10.5", "10.5% · Tasa especial"]] as const;
export type AnticipoTipo = "ninguno" | "anticipo" | "deduccion";

export function calcularItem(item: ItemEditor, operacion: OperacionTipo, tasaIgv = 18) {
  const cantidad = Math.max(0, Number(item.cantidad || 0));
  const valorUnitario = Math.max(0, Number(item.valor_unitario || 0));
  const descuento = Math.max(0, Number(item.descuento || 0));
  const subtotal = Math.max(0, cantidad * valorUnitario - descuento);
  const igv = operacion === "gravada" ? Math.round((subtotal * tasaIgv) / 100 * 100) / 100 : 0;
  return { cantidad, valorUnitario, descuento, subtotal, igv, total: subtotal + igv };
}

export function calcularComprobante(items: ItemEditor[], operacion: OperacionTipo, tc: number, tipoTributario: TipoTributarioCpe, pct: number, tasaIgv = 18, anticipoDeducido = 0) {
  const filas = items.map((i) => calcularItem(i, operacion, tasaIgv));
  const valorVenta = filas.reduce((s, i) => s + i.subtotal, 0);
  const descuentos = items.reduce((s, i) => s + Math.max(0, Number(i.descuento || 0)), 0);
  const igv = filas.reduce((s, i) => s + i.igv, 0);
  const anticipo = Math.max(0, Math.min(anticipoDeducido, valorVenta + igv));
  const total = Number((valorVenta + igv - anticipo).toFixed(2));
  const totalPen = total * (tc > 0 ? tc : 1);
  const aplica = tipoTributario !== "ninguno" && pct > 0 && totalPen > 700;
  const montoDetraccion = aplica && tipoTributario === "detraccion" ? Math.floor((totalPen * pct) / 100 + 0.5) : 0;
  const montoRetencion = aplica && tipoTributario === "retencion" ? Number(((totalPen * pct) / 100).toFixed(2)) : 0;
  return { valorVenta, descuentos, igv, anticipo, total, totalPen, montoDetraccion, montoRetencion };
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

/** Cálculos comerciales de la preliquidación, compartidos por edición, vista previa y PDF. */

export const IGV = 0.18;
export const UMBRAL_DETRACCION = 700;

export type TipoTributario = "detraccion" | "retencion" | "ninguno";

/** Regímenes SUNAT disponibles al emitir. El % es editable. */
export const REGIMENES: { valor: TipoTributario; pct: string; etiqueta: string }[] = [
  { valor: "detraccion", pct: "12", etiqueta: "Detracción 12% — Servicios (SPOT)" },
  { valor: "detraccion", pct: "4", etiqueta: "Detracción 4% — Contratos de construcción" },
  { valor: "retencion", pct: "3", etiqueta: "Retención 3% — Venta de bienes" },
  { valor: "ninguno", pct: "0", etiqueta: "Sin detracción ni retención" },
];

/**
 * Neto, IGV, total y el descuento del régimen tributario.
 * La detracción se calcula SIEMPRE en soles y redondeada al entero más cercano (SPOT).
 * La retención de IGV (3%) se calcula en soles con dos decimales.
 */
export function calcularMontos(neto: number, pctDet: number, tc: number, tipo: TipoTributario = "detraccion") {
  const igv = Math.round(neto * IGV * 100) / 100;
  const total = neto + igv;
  const tipoCambio = tc > 0 ? tc : 1;
  const totalPen = total * tipoCambio;
  const aplica = tipo !== "ninguno" && pctDet > 0 && totalPen > UMBRAL_DETRACCION;
  const brutoPen = aplica ? (totalPen * pctDet) / 100 : 0;
  // SPOT: fracción < 0.5 se elimina; fracción >= 0.5 sube a la unidad entera superior.
  const detraccionPen = tipo === "detraccion" ? Math.floor(brutoPen + 0.5) : 0;
  // Retención IGV 3%: estrictamente dos decimales.
  const retencionPen = tipo === "retencion" ? Number(brutoPen.toFixed(2)) : 0;

  const descuentoPen = detraccionPen + retencionPen;
  const detraccion = descuentoPen / tipoCambio;
  return {
    neto,
    igv,
    total,
    tipo,
    aplica,
    detraccion,
    detraccionPen,
    retencionPen,
    descuentoPen,
    cobrar: total - detraccion,
  };
}

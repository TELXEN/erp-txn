/** Renta de 5ta categoría (Perú) — procedimiento mensual de retención (art. 40 Reglamento LIR). */

/** UIT por año fiscal. */
export const UIT_POR_ANIO: Record<number, number> = { 2025: 5350, 2026: 5500 };
export const uitDe = (anio: number): number => UIT_POR_ANIO[anio] ?? (anio > 2026 ? 5500 : 5350);

const TRAMOS: [number, number][] = [[5, 0.08], [20, 0.14], [35, 0.17], [45, 0.2], [Infinity, 0.3]];
const r2 = (n: number) => Math.round(n * 100) / 100;

export function impuestoAnual(rentaNeta: number, uit: number) {
  let resto = Math.max(0, rentaNeta), previo = 0, imp = 0;
  for (const [hasta, tasa] of TRAMOS) {
    const tope = hasta * uit - previo * uit;
    const base = Math.min(resto, tope);
    imp += base * tasa;
    resto -= base;
    previo = hasta;
    if (resto <= 0) break;
  }
  return r2(imp);
}

export type EntradaQuinta = {
  mes: number; // 1-12
  sueldoMes: number; // remuneración computable del mes
  pagadoAnterior: number; // remuneraciones de meses anteriores del año
  retenidoAnterior: number; // renta 5ta retenida en meses anteriores
  uit: number;
  eps: boolean;
  /** Remuneración contractual de los meses que faltan (por defecto sueldoMes). */
  remFutura?: number;
  /** Gratificaciones de julio/diciembre (básico + asignación del mes). En julio ya pasado, null = no corresponde. */
  gratiJulio?: number | null;
  gratiDic?: number;
};

export type DetalleQuinta = {
  proyectada: number; deduccion: number; rentaNeta: number; impuesto: number;
  retenidoAnterior: number; divisor: number; retencion: number;
};

export function calcularRentaQuinta(e: EntradaQuinta): DetalleQuinta {
  const bonif = e.eps ? 0.0675 : 0.09;
  const futura = e.remFutura ?? e.sueldoMes;
  const conBono = (g: number) => g + r2(g * bonif);
  const julio = e.gratiJulio === undefined ? (e.mes <= 7 ? futura : 0) : (e.gratiJulio ?? 0);
  const gratis = conBono(julio) + conBono(e.gratiDic ?? futura);
  const proyectada = r2(e.pagadoAnterior + e.sueldoMes + futura * (12 - e.mes) + gratis);
  const deduccion = 7 * e.uit;
  const rentaNeta = r2(Math.max(0, proyectada - deduccion));
  const impuesto = impuestoAnual(rentaNeta, e.uit);
  const m = e.mes;
  let divisor: number, base: number;
  if (m <= 3) { divisor = 12; base = impuesto; }
  else if (m === 4) { divisor = 9; base = impuesto - e.retenidoAnterior; }
  else if (m <= 7) { divisor = 8; base = impuesto - e.retenidoAnterior; }
  else if (m === 8) { divisor = 5; base = impuesto - e.retenidoAnterior; }
  else if (m <= 11) { divisor = 4; base = impuesto - e.retenidoAnterior; }
  else { divisor = 1; base = impuesto - e.retenidoAnterior; }
  const retencion = r2(Math.max(0, base / divisor));
  return { proyectada, deduccion, rentaNeta, impuesto, retenidoAnterior: e.retenidoAnterior, divisor, retencion };
}

export type MesReal = { mes: number; ingresos: number; retenido: number };

/**
 * Completa meses anteriores del año: usa boletas reales donde existan y, para los meses
 * sin boleta desde la fecha de ingreso, estima el sueldo contractual y su retención simulada.
 */
export function acumuladoAnterior(p: {
  anio: number; mes: number; fechaIngreso: string | null | undefined; sueldoContractual: (mes: number) => number;
  reales: MesReal[]; uit: number; eps: boolean;
}) {
  let pagado = 0, retenido = 0, estimados = 0;
  const ing = p.fechaIngreso ? new Date(p.fechaIngreso + "T00:00:00") : null;
  const desde = !ing || ing.getFullYear() < p.anio ? 1 : ing.getFullYear() > p.anio ? 13 : ing.getMonth() + 1;
  for (let m = 1; m < p.mes; m++) {
    const reales = p.reales.filter((x) => x.mes === m);
    if (reales.length) {
      pagado += reales.reduce((s, x) => s + x.ingresos, 0);
      retenido += reales.reduce((s, x) => s + x.retenido, 0);
    } else if (m >= desde && p.sueldoContractual(m) > 0) {
      const sm = p.sueldoContractual(m);
      const d = calcularRentaQuinta({ mes: m, sueldoMes: sm, remFutura: sm, gratiJulio: m <= 7 || desde <= 7 ? p.sueldoContractual(7) : null, gratiDic: p.sueldoContractual(12), pagadoAnterior: pagado, retenidoAnterior: retenido, uit: p.uit, eps: p.eps });
      pagado += sm;
      retenido += d.retencion;
      estimados++;
    }
  }
  return { pagado: r2(pagado), retenido: r2(retenido), estimados, desde };
}

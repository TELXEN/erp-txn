/** Renta de 5ta categoría (Perú) — procedimiento mensual de retención (art. 40 Reglamento LIR). */

/** UIT por año fiscal. */
export const UIT_POR_ANIO: Record<number, number> = { 2025: 5350, 2026: 5500 };
export const uitDe = (anio: number) => UIT_POR_ANIO[anio] ?? UIT_POR_ANIO[Math.max(...Object.keys(UIT_POR_ANIO).map(Number))];

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
};

export type DetalleQuinta = {
  proyectada: number; deduccion: number; rentaNeta: number; impuesto: number;
  retenidoAnterior: number; divisor: number; retencion: number;
};

export function calcularRentaQuinta(e: EntradaQuinta): DetalleQuinta {
  const bonif = e.eps ? 0.0675 : 0.09;
  const gratis = (e.mes <= 7 ? 2 : 1) * e.sueldoMes * (1 + bonif);
  const proyectada = r2(e.pagadoAnterior + e.sueldoMes * (13 - e.mes) + gratis);
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

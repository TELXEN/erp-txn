/** Redondeo decimal exacto (evita 1.005 → 1.00 por punto flotante). */
export function redondear(x: number, dec: number): number {
  const n = Number(x) || 0;
  const s = Math.sign(n) || 1;
  return s * Number(Math.round(Number(`${Math.abs(n)}e${dec}`)) + `e-${dec}`);
}
export const r2 = (x: number) => redondear(x, 2);
export const r4 = (x: number) => redondear(x, 4);
/** Suma exacta en céntimos. */
export const sumar2 = (xs: number[]) => xs.reduce((s, x) => s + Math.round(r2(x) * 100), 0) / 100;

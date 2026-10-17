import { r2 } from "@/lib/decimal";
export function distribuirCapital(capital: number, cuotas: number) {
  if (!Number.isFinite(capital) || capital <= 0 || !Number.isInteger(cuotas) || cuotas < 1 || cuotas > 120 || capital / cuotas < 0.01) throw new Error("Capital o cuotas inválidos");
  const centimos = Math.round(r2(capital) * 100), parte = Math.floor(centimos / cuotas);
  return Array.from({ length: cuotas }, (_, i) => (i === cuotas - 1 ? centimos - parte * (cuotas - 1) : parte) / 100);
}
export function saldoTrasPago(saldo: number, pago: number) {
  const resultado = r2(saldo - pago);
  return { resultado, insuficiente: resultado < 0, faltante: r2(Math.max(0, -resultado)) };
}
export function resumirDeuda(capital: number, cuotas: { capital: number; interes: number; comision: number; fecha_pago: string | null }[]) {
  return {
    capitalPendiente: r2(capital - cuotas.filter((c) => c.fecha_pago).reduce((s, c) => s + Number(c.capital), 0)),
    cargosPendientes: r2(cuotas.filter((c) => !c.fecha_pago).reduce((s, c) => s + Number(c.interes) + Number(c.comision), 0)),
  };
}

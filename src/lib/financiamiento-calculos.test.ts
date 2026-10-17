import { describe, expect, it } from "vitest";
import { distribuirCapital, resumirDeuda, saldoTrasPago } from "./financiamiento-calculos";
describe("Financiamiento y fondos", () => {
  it("bloquea un pago superior al saldo disponible", () => expect(saldoTrasPago(700, 701)).toEqual({ resultado: -1, insuficiente: true, faltante: 1 }));
  it("permite usar exactamente el saldo disponible", () => expect(saldoTrasPago(700, 700)).toEqual({ resultado: 0, insuficiente: false, faltante: 0 }));
  it("conserva el faltante histórico hasta recibir financiamiento", () => { expect(saldoTrasPago(-100, 1).insuficiente).toBe(true); expect(saldoTrasPago(-100 + 1000, 700).resultado).toBe(200); });
  it("distribuye capital sin perder céntimos", () => expect(distribuirCapital(1000, 3)).toEqual([333.33, 333.33, 333.34]));
  it("separa devolución de capital de intereses y comisiones", () => expect(resumirDeuda(1000, [{ capital: 500, interes: 50, comision: 10, fecha_pago: "2026-10-17" }, { capital: 500, interes: 50, comision: 10, fecha_pago: null }])).toEqual({ capitalPendiente: 500, cargosPendientes: 60 }));
});

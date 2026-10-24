import { describe, expect, it } from "vitest";
import { calcularRentaQuinta, impuestoAnual, uitDe } from "./renta-quinta";

describe("renta de quinta", () => {
  it("UIT 2026 es 5500", () => expect(uitDe(2026)).toBe(5500));
  it("no retiene bajo 7 UIT", () => {
    expect(calcularRentaQuinta({ mes: 1, sueldoMes: 2500, pagadoAnterior: 0, retenidoAnterior: 0, uit: 5500, eps: false }).retencion).toBe(0);
  });
  it("tramos: 5 UIT al 8% y resto al 14%", () => {
    expect(impuestoAnual(6 * 5500, 5500)).toBe(5 * 5500 * 0.08 + 5500 * 0.14);
  });
  it("enero divide entre 12 con 14 sueldos y bonificación 9%", () => {
    const d = calcularRentaQuinta({ mes: 1, sueldoMes: 5000, pagadoAnterior: 0, retenidoAnterior: 0, uit: 5500, eps: false });
    expect(d.proyectada).toBe(70900);
    expect(d.rentaNeta).toBe(32400);
    expect(d.retencion).toBe(240.5);
  });
  it("diciembre retiene el saldo", () => {
    const d = calcularRentaQuinta({ mes: 12, sueldoMes: 5000, pagadoAnterior: 60900, retenidoAnterior: 2000, uit: 5500, eps: false });
    expect(d.divisor).toBe(1);
    expect(d.retencion).toBe(r(d.impuesto - 2000));
  });
});
const r = (n: number) => Math.round(n * 100) / 100;

import { acumuladoAnterior } from "./renta-quinta";
describe("meses anteriores por fecha de ingreso", () => {
  const base = { anio: 2026, mes: 10, sueldoContractual: 8000, uit: 5500, eps: false };
  it("ingreso en octubre: sin meses previos", () => {
    expect(acumuladoAnterior({ ...base, fechaIngreso: "2026-10-01", reales: [] })).toEqual({ pagado: 0, retenido: 0, estimados: 0 });
  });
  it("ingreso en enero sin boletas: estima 9 meses", () => {
    const a = acumuladoAnterior({ ...base, fechaIngreso: "2026-01-02", reales: [] });
    expect(a.estimados).toBe(9);
    expect(a.pagado).toBe(72000);
    expect(a.retenido).toBeGreaterThan(0);
  });
  it("mezcla boletas reales y faltantes", () => {
    const a = acumuladoAnterior({ ...base, fechaIngreso: "2026-01-02", reales: [{ mes: 9, ingresos: 7000, retenido: 500 }] });
    expect(a.estimados).toBe(8);
    expect(a.pagado).toBe(64000 + 7000);
  });
});

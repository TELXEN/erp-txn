import { describe, expect, it } from "vitest";
import { cuotasCoincidenConNeto, netoComprobante, repartirCuotas } from "./facturacion";

describe("Neto y cuotas de comprobantes", () => {
  it("resta la detracción al importe total, no depende de las cuotas", () => {
    expect(netoComprobante(27042, 1, "detraccion", 1082, 0)).toBe(25960);
  });
  it("resta la retención al importe total", () => {
    expect(netoComprobante(1000, 1, "retencion", 0, 30)).toBe(970);
  });
  it("una cuota debe ser igual al neto, no al total", () => {
    expect(repartirCuotas(970, ["2026-11-05"])[0]?.monto).toBe("970.00");
    expect(cuotasCoincidenConNeto(970, [970])).toBe(true);
    expect(cuotasCoincidenConNeto(970, [1000])).toBe(false);
  });
  it("varias cuotas juntas suman exactamente el neto", () => {
    expect(cuotasCoincidenConNeto(970, [300, 670])).toBe(true);
    expect(cuotasCoincidenConNeto(970, [300, 670.01])).toBe(false);
    expect(cuotasCoincidenConNeto(970, [300, 700])).toBe(false);
    expect(repartirCuotas(970, ["a", "b", "c"]).map((q) => Number(q.monto))).toEqual([323.33, 323.33, 323.34]);
  });
  it("convierte la deducción en soles a la moneda del comprobante", () => {
    expect(netoComprobante(1000, 3.75, "detraccion", 150, 0)).toBe(960);
  });
  it("sin detracción ni retención el neto es el total", () => {
    expect(netoComprobante(1000, 1, "ninguno", 150, 30)).toBe(1000);
  });
});
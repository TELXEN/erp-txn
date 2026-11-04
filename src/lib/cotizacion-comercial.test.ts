import { describe, expect, it } from "vitest";
import { cierreCotizacion, snapshotEnvio } from "./cotizacion-comercial";

describe("cotización comercial", () => {
  it("sin IGV termina en subtotal CD + GG + utilidad", () => {
    expect(cierreCotizacion(1000, 200, 100, false)).toEqual({ subtotal: 1300, igv: 0, total: 1300, mostrarIgvTotal: false });
  });
  it("con IGV suma 18% al subtotal detallado", () => {
    expect(cierreCotizacion(1000, 200, 100, true)).toEqual({ subtotal: 1300, igv: 234, total: 1534, mostrarIgvTotal: true });
  });
  it("graba el cambio y el día del envío", () => {
    expect(snapshotEnvio("2026-11-03", { fecha: "2026-11-03", venta: 3.42 })).toEqual({ estado: "Enviada", fecha_envio: "2026-11-03", tipo_cambio_fecha: "2026-11-03", tipo_cambio: 3.42 });
  });
  it("nunca graba un cambio anterior como si fuera del día de envío", () => {
    expect(() => snapshotEnvio("2026-11-03", { fecha: "2026-11-02", venta: 3.42 })).toThrow();
    expect(() => snapshotEnvio("2026-11-03", null)).toThrow();
  });
});
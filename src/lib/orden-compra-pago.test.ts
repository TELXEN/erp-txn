import { diasCreditoOrden, vencimientoPagoOrden, describe, expect, it } from "vitest";
import { condicionPagoOrden, detallePagoOrden } from "./orden-compra-pago";

describe("forma y plazo de pago de orden de compra", () => {
  it("contado no conserva un plazo de crédito", () => {
    expect(condicionPagoOrden("Contado", 45)).toBe("Contado");
    expect(detallePagoOrden("Contado")).toEqual({ forma: "Contado", plazo: "—" });
  });
  it("crédito conserva el plazo editable y lo lee en la orden guardada", () => {
    expect(condicionPagoOrden("Crédito", 75)).toBe("Crédito 75 días");
    expect(detallePagoOrden("Crédito 75 días")).toEqual({ forma: "Crédito", plazo: "75 días" });
  });
  it("no admite crédito sin tiempo de pago válido", () => {
    expect(() => condicionPagoOrden("Crédito", 0)).toThrow();
    expect(() => condicionPagoOrden("Crédito", 1.5)).toThrow();
  });

  it("contado vence el día de recepción y crédito suma su plazo", () => {
    expect(diasCreditoOrden("Contado")).toBe(0);
    expect(vencimientoPagoOrden("2026-10-26", "Contado")).toBe("2026-10-26");
    expect(vencimientoPagoOrden("2026-10-26", "Crédito 45 días")).toBe("2026-12-10");
  });
});

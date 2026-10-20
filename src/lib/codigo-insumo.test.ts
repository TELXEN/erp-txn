import { describe, expect, it } from "vitest";
import { armarCodigoInsumo } from "./codigo-insumo";

describe("código modular de insumos", () => {
  it("arma 8 dígitos sin puntos", () => {
    expect(armarCodigoInsumo("40", "materiales", "13", 1)).toBe("40113001");
  });
  it("usa el dígito 1–4 por tipo", () => {
    expect(armarCodigoInsumo("10", "subcontratos", "02", 25)).toBe("10402025");
  });
  it("rechaza correlativo mayor a 999", () => {
    expect(() => armarCodigoInsumo("40", "mano_obra", "01", 1000)).toThrow();
  });
});

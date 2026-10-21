import { describe, expect, it } from "vitest";
import { armarCodigoInsumo } from "./codigo-insumo";

describe("código modular de insumos", () => {
  it("material: tipo + especialidad + subfamilia + correlativo", () => {
    expect(armarCodigoInsumo("materiales", "06", "13", 1)).toBe("10613001");
  });
  it("mano de obra completa la subfamilia con 00", () => {
    expect(armarCodigoInsumo("mano_obra", "06", "13", 1)).toBe("20600001");
  });
  it("subcontratos con 00 y 8 dígitos", () => {
    expect(armarCodigoInsumo("subcontratos", "99", null, 25)).toBe("49900025");
  });
  it("equipos y herramientas usan tipo 3 y subfamilia 00", () => {
    expect(armarCodigoInsumo("equipos_herramientas", "06", "13", 1)).toBe("30600001");
  });
  it("material sin subfamilia se rechaza", () => {
    expect(() => armarCodigoInsumo("materiales", "06", null, 1)).toThrow();
  });
  it("rechaza correlativo mayor a 999", () => {
    expect(() => armarCodigoInsumo("mano_obra", "06", null, 1000)).toThrow();
  });
});

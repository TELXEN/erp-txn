import { describe, it, expect } from "vitest";
import { digitoTipoInsumo } from "./digito-insumo";

describe("primer dígito del código de insumo", () => {
  it("materiales 1", () => expect(digitoTipoInsumo("materiales")).toBe("1"));
  it("mano de obra 2", () => expect(digitoTipoInsumo("mano_obra")).toBe("2"));
  it("equipos 3", () => expect(digitoTipoInsumo("equipos_herramientas", "Equipo")).toBe("3"));
  it("herramientas 4", () => expect(digitoTipoInsumo("equipos_herramientas", "Herramienta")).toBe("4"));
  it("subcontratos 5", () => expect(digitoTipoInsumo("subcontratos")).toBe("5"));
  it("EPP 6", () => expect(digitoTipoInsumo("EPP")).toBe("6"));
  it("herramientas manuales sin código", () => expect(digitoTipoInsumo("HT")).toBeNull());
});

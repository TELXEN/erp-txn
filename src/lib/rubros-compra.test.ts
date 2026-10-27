import { describe, expect, it } from "vitest";
import { imputaGastosGenerales, tipoFichaRubro, validarRubroUnico } from "./rubros-compra";

describe("rubros de compra", () => {
  it("exige elegir el rubro antes de cargar artículos", () => {
    expect(validarRubroUnico("", [])).not.toBe("");
  });
  it("no permite mezclar EPP con materiales", () => {
    expect(validarRubroUnico("EPP", [{ rubro: "EPP" }, { rubro: "MAT" }])).toBe("No se pueden mezclar rubros en un mismo documento.");
  });
  it("acepta un documento homogéneo", () => {
    expect(validarRubroUnico("HE", [{ rubro: "HE" }, { rubro: "HE" }])).toBe("");
  });
  it("EPP, equipos y herramientas van a gastos generales; materiales no", () => {
    expect(imputaGastosGenerales("EPP")).toBe(true);
    expect(imputaGastosGenerales("HE")).toBe(true);
    expect(imputaGastosGenerales("MAT")).toBe(false);
  });
  it("la ficha de almacén del EPP nunca es Material", () => {
    expect(tipoFichaRubro("EPP")).toBe("EPP");
    expect(tipoFichaRubro("MAT")).toBe("MAT");
    expect(tipoFichaRubro("EQ")).toBe("EQ");
    expect(tipoFichaRubro("HE")).toBe("EQ");
  });
});

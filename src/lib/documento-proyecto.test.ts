import { describe, expect, it } from "vitest";
import { numeroDocumentoProyecto } from "./documento-proyecto";

describe("documento comercial del proyecto", () => {
  it.each([
    ["Orden de Compra", "OC-0154"],
    ["Orden de Servicio", "OS-0200"],
    ["Contrato", "CT-2026-01"],
  ])("carga el número de %s en la preliquidación", (documento_tipo, documento_numero) => {
    expect(numeroDocumentoProyecto({ documento_tipo, documento_numero })).toBe(documento_numero);
  });
  it("permite un documento sin número", () => {
    expect(numeroDocumentoProyecto({ documento_tipo: "Contrato", documento_numero: "" })).toBe("");
  });
  it("no carga un número cuando no corresponde documento", () => {
    expect(numeroDocumentoProyecto({ documento_tipo: "", documento_numero: "OC-0154" })).toBe("");
    expect(numeroDocumentoProyecto(null)).toBe("");
  });
});
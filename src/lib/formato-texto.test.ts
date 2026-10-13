import { describe, expect, it } from "vitest";
import { formatearTexto } from "./formato-texto";

describe("formatearTexto", () => {
  it("oración con siglas", () => {
    expect(formatearTexto("CABLE ULTRA FLEXIBLE DE COBRE 12 AWG MARCA INDECO", "oracion")).toBe(
      "Cable ultra flexible de cobre 12 AWG marca indeco",
    );
    expect(formatearTexto("TUBO PVC SAP IP65", "oracion")).toBe("Tubo PVC sap IP65");
  });
  it("partida", () => {
    expect(formatearTexto("EXCAVACIÓN MANUAL PARA CIMENTACIÓN EN TERRENO SEMIDURO", "oracion")).toBe(
      "Excavación manual para cimentación en terreno semiduro",
    );
  });
  it("título", () => {
    expect(formatearTexto("INSTALACIONES ELÉCTRICAS Y MECÁNICAS", "titulo")).toBe("Instalaciones Eléctricas y Mecánicas");
  });
  it("cargo", () => {
    expect(formatearTexto("GERENTE DE PROYECTOS Senior", "cargo")).toBe("Gerente de proyectos senior");
  });
  it("unidad", () => {
    expect(formatearTexto("M2", "unidad")).toBe("m²");
    expect(formatearTexto("KW", "unidad")).toBe("kW");
  });
});

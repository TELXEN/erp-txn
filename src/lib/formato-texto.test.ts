import { describe, expect, it } from "vitest";
import { claveNombre, formatearSiGritado, formatearTexto, ordenarPorNombre } from "./formato-texto";

describe("formatearTexto", () => {
  it("marcas: primera letra mayúscula sin alterar el resto", () => {
    expect(formatearTexto("indeco", "marca")).toBe("Indeco");
    expect(formatearTexto("iPhone", "marca")).toBe("IPhone");
    expect(formatearSiGritado("INDECO", "marca")).toBe("INDECO");
    expect(formatearSiGritado("Schneider Electric", "marca")).toBe("Schneider Electric");
    expect(formatearSiGritado("  marca miXta  ", "marca")).toBe("Marca miXta");
  });
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
  it("mayúsculas (especialidades)", () => {
    expect(formatearTexto("Instalaciones auxiliares (HVAC y contra incendio)", "mayusculas")).toBe(
      "INSTALACIONES AUXILIARES (HVAC Y CONTRA INCENDIO)",
    );
    // FormatoGlobal usa formatearSiGritado al salir del campo: también sube lo escrito en minúscula.
    expect(formatearSiGritado("estructuras metálicas", "mayusculas")).toBe("ESTRUCTURAS METÁLICAS");
  });
  it("unidad", () => {
    expect(formatearTexto("M2", "unidad")).toBe("m²");
    expect(formatearTexto("KW", "unidad")).toBe("kW");
  });
});

describe("Title Case Industrial (títulos de partidas)", () => {
  it("capitaliza palabras clave y deja conectores en minúscula", () => {
    expect(formatearTexto("centro de control de motores", "titulo")).toBe("Centro de Control de Motores");
    expect(formatearTexto("MEDIA TENSIÓN PARA LA CHANCADORA PRIMARIA", "titulo")).toBe("Media Tensión para la Chancadora Primaria");
  });
  it("capitaliza el conector si inicia la frase", () => {
    expect(formatearTexto("de la obra", "titulo")).toBe("De la Obra");
  });
});

describe("ordenarPorNombre (A→Z automático)", () => {
  it("ordena alfabéticamente sin importar mayúsculas ni tildes", () => {
    const titles = [
      { nombre: "transporte de materiales" },
      { nombre: "OBRAS PRELIMINARES" },
      { nombre: "Área de campamento" },
      { nombre: "mecánicos" },
    ];
    expect(ordenarPorNombre(titles).map((t) => t.nombre)).toEqual([
      "Área de campamento",
      "mecánicos",
      "OBRAS PRELIMINARES",
      "transporte de materiales",
    ]);
  });
  it("mantiene la ñ como letra del alfabeto español (después de la N)", () => {
    const titles = [{ nombre: "ÑUÑ" }, { nombre: "OBRAS" }, { nombre: "NUDO" }];
    expect(ordenarPorNombre(titles).map((t) => t.nombre)).toEqual(["NUDO", "ÑUÑ", "OBRAS"]);
  });
  it("no altera el listado original", () => {
    const titles = [{ nombre: "ZETA" }, { nombre: "ALFA" }];
    ordenarPorNombre(titles);
    expect(titles.map((t) => t.nombre)).toEqual(["ZETA", "ALFA"]);
  });
});

describe("claveNombre (nombres repetidos)", () => {
  it("trata como iguales las variantes por mayúsculas, tildes o espacios", () => {
    expect(claveNombre("obras   civiles")).toBe(claveNombre("OBRAS CIVILES"));
    expect(claveNombre("  estructuras metálicas ")).toBe(claveNombre("ESTRUCTURAS METÁLICAS"));
    expect(claveNombre("diseño y construcción")).toBe(claveNombre("DISEÑO Y CONSTRUCCIÓN"));
  });
  it("mantiene distintos los nombres que sí son distintos", () => {
    expect(claveNombre("Estructuras Metálicas")).not.toBe(claveNombre("Estructuras de Concreto"));
    expect(claveNombre("Piping")).not.toBe(claveNombre("Piping de Procesos y Utilidades"));
  });
});

import { describe, expect, it } from "vitest";
import { TIPOS_OCULTOS, tiposVisibles } from "./apu";

/**
 * Regla: los tipos internos del APU (Herramientas manuales) nunca se ofrecen
 * para elegir. En el desdoblamiento de APU solo se ve «Equipos y Herramientas»,
 * que ya incluye la fila automática de herramientas manuales.
 */
describe("tipos visibles para requerimientos", () => {
  const claves = () => tiposVisibles().map(([k]) => k);

  it("excluye Herramientas manuales (HT) de la lista seleccionable", () => {
    expect(TIPOS_OCULTOS.has("HT")).toBe(true);
    expect(claves()).not.toContain("HT");
  });

  it("mantiene los cuatro tipos que sí se piden", () => {
    expect(claves()).toEqual(["MO", "MAT", "EQ", "SC"]);
  });

  it("muestra las herramientas dentro de Equipos y Herramientas", () => {
    const eq = tiposVisibles().find(([k]) => k === "EQ");
    expect(eq?.[1]).toBe("Equipos y Herramientas");
  });
});

import { describe, expect, it } from "vitest";
import { perteneceCatalogo } from "./catalogo-inventario";
describe("Catálogo de inventario", () => {
  it("separa equipos de herramientas sin duplicarlos", () => {
    expect(perteneceCatalogo("Equipo", "Equipo")).toBe(true);
    expect(perteneceCatalogo("Equipo", "Herramienta")).toBe(false);
    expect(perteneceCatalogo("Herramienta", "Herramienta")).toBe(true);
    expect(perteneceCatalogo("Herramienta", "Equipo")).toBe(false);
  });
  it("conserva los registros antiguos pendientes de clasificación", () => {
    expect(perteneceCatalogo(null, "Equipo")).toBe(true);
    expect(perteneceCatalogo(null, "Herramienta")).toBe(false);
  });
});
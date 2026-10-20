import { describe, expect, it } from "vitest";
import { validarEspecialidad } from "./especialidad-form";

const lista = [{ id: "1", codigo: "06", nombre: "ELÉCTRICA", activo: true }];
describe("Especialidades con códigos explícitos", () => {
  it("permite el código 99 de GENERALES", () => {
    expect(validarEspecialidad("99", "GENERALES", lista)).toBe("");
  });
  it("no admite códigos fuera de dos dígitos 01–99", () => {
    for (const codigo of ["00", "1", "100", "A1"]) expect(validarEspecialidad(codigo, "CIVIL", lista)).not.toBe("");
  });
  it("rechaza nombres repetidos sin contar tildes ni espacios", () => {
    expect(validarEspecialidad("07", "  electrica ", lista)).toBe("La especialidad «ELECTRICA» ya existe.");
  });
  it("rechaza un código ocupado", () => {
    expect(validarEspecialidad("06", "CIVIL", lista)).toBe("El código 06 ya existe.");
  });
  it("permite editar la misma especialidad", () => {
    expect(validarEspecialidad("06", "ELÉCTRICA", lista, "1")).toBe("");
  });
});
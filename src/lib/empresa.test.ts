import { describe, expect, it } from "vitest";
import { firmanteLaboral } from "./empresa";

describe("firmanteLaboral", () => {
  it("firma RR. HH. cuando está registrado", () => {
    expect(firmanteLaboral({ gerente_nombre: "Ana Pérez", rrhh_nombre: "Luis Rojas", rrhh_dni: "12345678" })).toEqual({ nombre: "Luis Rojas", documento: "DNI 12345678", cargo: "Jefe de Recursos Humanos" });
  });
  it("sin RR. HH. firma el gerente", () => {
    expect(firmanteLaboral({ gerente_nombre: "Ana Pérez", gerente_dni: "87654321", rrhh_nombre: " " }).cargo).toBe("Gerente General");
  });
});

import { describe, expect, it } from "vitest";
import { buscarInsumoDuplicado } from "./insumo-duplicado";

const filas = [
  { id: "1", descripcion: "Cable unipolar 2x14", estado: "activo" },
  { id: "2", descripcion: "CABLE UNIPOLAR  2X14", estado: "inactivo" },
  { id: "3", descripcion: "Capataz", estado: "activo" },
];

describe("duplicado de insumo", () => {
  it("detecta repetido ignorando mayúsculas, tildes y espacios", () => {
    expect(buscarInsumoDuplicado(filas, "cable unipolar 2x14")?.id).toBe("1");
  });
  it("detecta también el repetido inactivo", () => {
    expect(buscarInsumoDuplicado(filas, "Cable Unipolar 2x14 ", "1", true)?.id).toBe("2");
  });
  it("ignora la propia fila al editar", () => {
    expect(buscarInsumoDuplicado(filas, "CAPATAZ", "3")).toBeNull();
  });
  it("devuelve null cuando no existe", () => {
    expect(buscarInsumoDuplicado(filas, "Tornillo 1/2")).toBeNull();
  });
});

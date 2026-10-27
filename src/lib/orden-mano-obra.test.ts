import { expect, it } from "vitest";
import { compararManoObra } from "./orden-mano-obra";

it("ordena Capataz, Operario, Oficial, Peón e Instrumentista sin depender de su especialidad", () => {
  const filas = ["Instrumentista", "Peón", "Oficial", "Operario", "Capataz"].map(nombre => ({ nombre }));
  expect(filas.sort(compararManoObra).map(f => f.nombre)).toEqual(["Capataz", "Operario", "Oficial", "Peón", "Instrumentista"]);
});
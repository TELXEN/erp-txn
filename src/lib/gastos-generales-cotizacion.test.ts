import { describe, expect, it } from "vitest";
import { moverGG, numerarGG, pctGG, subtotalGG, totalGG, type FilaGG } from "./gastos-generales-cotizacion";

const f = (id: string, nivel: FilaGG["nivel"], cantidad = 0, tiempo = 1, pu = 0): FilaGG =>
  ({ id, cotizacion_id: "c", orden: 0, nivel, descripcion: id, unidad: "mes", cantidad, tiempo, precio_unitario: pu });

describe("gastos generales de cotización", () => {
  it("% GG = total GG / costo directo × 100", () => {
    expect(pctGG(1500, 10000)).toBe(15);
  });
  it("% GG se ajusta a dos decimales", () => {
    expect(pctGG(30000, 141680)).toBe(21.17);
    expect(pctGG(1500, 10000)).toBe(15);
  });
  it("sin costo directo el % es 0", () => {
    expect(pctGG(1500, 0)).toBe(0);
  });
  it("parcial = cantidad × tiempo × precio, solo ítems suman", () => {
    const filas = [f("b", "bloque"), f("g", "grupo"), f("i1", "item", 2, 3, 100), f("i2", "item", 1, 1, 50)];
    expect(totalGG(filas)).toBe(650);
    expect(subtotalGG(filas, 1)).toBe(650);
  });
  it("numera por posición", () => {
    const filas = [f("b1", "bloque"), f("g1", "grupo"), f("i1", "item"), f("g2", "grupo"), f("i2", "item"), f("b2", "bloque"), f("g3", "grupo")];
    const n = numerarGG(filas);
    expect([n.get("i1"), n.get("i2"), n.get("g3")]).toEqual(["1.1.1", "1.2.1", "2.1"]);
  });
  it("mover grupo arrastra sus ítems", () => {
    const filas = [f("g1", "grupo"), f("i1", "item"), f("g2", "grupo"), f("i2", "item")];
    expect(moverGG(filas, 2, -1)!.map((x) => x.id)).toEqual(["g2", "i2", "g1", "i1"]);
  });
});

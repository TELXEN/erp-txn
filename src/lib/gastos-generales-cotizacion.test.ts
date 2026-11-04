import { describe, expect, it } from "vitest";
import { gastosGeneralesDe, moverGG, numerarGG, parcialGG, pctGG, resumenPresupuesto, subtotalGG, totalGG, totalHojaGG, type FilaGG } from "./gastos-generales-cotizacion";

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
  it("sin ítems no hay hoja: el % se lleva a mano", () => {
    expect(totalHojaGG([])).toBe(null);
    expect(totalHojaGG([f("b", "bloque"), f("g", "grupo")])).toBe(null);
    expect(totalHojaGG([f("b", "bloque"), f("g", "grupo"), f("i", "item", 1, 1, 1200)])).toBe(1200);
  });
  it("con hoja, el importe de gastos generales es el de la hoja, no costo directo × %", () => {
    // TXN26-C010: hoja 1200, costo directo 3631.07 → % 33.05; 3631.07 × 33.05 % daría 1200.07.
    expect(pctGG(1200, 3631.07)).toBe(33.05);
    expect(gastosGeneralesDe(1200, 3631.07, 33.05)).toBe(1200);
  });
  it("sin hoja, gastos generales = costo directo × %", () => {
    expect(gastosGeneralesDe(null, 3631.07, 33.05)).toBe(1200.07);
    expect(gastosGeneralesDe(undefined, 10000, 15)).toBe(1500);
    expect(gastosGeneralesDe(0, 10000, 15)).toBe(0);
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

describe("gastos fijos y variables", () => {
  it("fijo ignora el tiempo", () => {
    expect(parcialGG({ cantidad: 1, tiempo: 6, precio_unitario: 500, tipo: "fijo" })).toBe(500);
  });
  it("variable multiplica por el tiempo", () => {
    expect(parcialGG({ cantidad: 0.5, tiempo: 6, precio_unitario: 1000, tipo: "variable" })).toBe(3000);
  });
  it("resumen: CD 10,000 + GG 3,000, utilidad 10%, IGV 18%", () => {
    expect(resumenPresupuesto(10000, 1000, 2000, 10, 18)).toEqual({ subtotal: 13000, utilidad: 1300, venta: 14300, igv: 2574, total: 16874 });
  });
});

import { describe, expect, it } from "vitest";
import { cantidadPermitida, estadoTrasOrden, mejoresPrecios, saldoRecepcion } from "./requerimientos-flujo";

describe("flujo de requerimientos", () => {
  it("no permite pedir más que el saldo del APU", () => {
    expect(cantidadPermitida(2000, 1000)).toBe(1000);
    expect(cantidadPermitida(-5, 1000)).toBe(0);
  });
  it("elige el proveedor con menor precio por ítem", () => {
    const m = mejoresPrecios([
      { solicitudId: "A", requerimientoItemId: "cable", precio: 5.2 },
      { solicitudId: "B", requerimientoItemId: "cable", precio: 4.8 },
      { solicitudId: "C", requerimientoItemId: "cable", precio: 0 },
    ]);
    expect(m.get("cable")).toBe("B");
  });
  it("queda En cotización mientras falte ordenar algún ítem", () => {
    const items = [{ id: "a", cantidad: 10 }, { id: "b", cantidad: 5 }];
    expect(estadoTrasOrden(items, (id) => (id === "a" ? 10 : 0))).toBe("En cotización");
    expect(estadoTrasOrden(items, (id) => (id === "a" ? 10 : 5))).toBe("Orden emitida");
  });
  it("saldo por recibir en obra", () => {
    expect(saldoRecepcion(1000, 400)).toBe(600);
    expect(saldoRecepcion(10, 12)).toBe(0);
  });
});

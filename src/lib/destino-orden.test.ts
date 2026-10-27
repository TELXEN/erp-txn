import { describe, expect, it } from "vitest";
import { destinoOrden } from "./almacenes";

const alm = [{ id: "c", proyecto_id: null }, { id: "o2", proyecto_id: "P002" }];
describe("destinoOrden", () => {
  it("sin destino elegido entrega en la obra de la orden", () => expect(destinoOrden({ proyecto_id: "P001" }, alm)).toBe("P001"));
  it("destino Almacén Central entrega en el Central", () => expect(destinoOrden({ proyecto_id: "P001", almacen_destino_id: "c" }, alm)).toBeNull());
  it("destino otra obra entrega en esa obra", () => expect(destinoOrden({ proyecto_id: "P001", almacen_destino_id: "o2" }, alm)).toBe("P002"));
});

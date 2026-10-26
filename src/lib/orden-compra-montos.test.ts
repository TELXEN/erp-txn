import { describe, expect, it } from "vitest";
import { montosOrdenCompra } from "./orden-compra-montos";

describe("IGV documental en órdenes de materiales", () => {
  it("suma IGV 18% y total a los materiales", () => {
    expect(montosOrdenCompra([{ tipo: "MAT", cantidad: 1000, precio_unitario: 2 }])).toEqual({ subtotal: 2000, igv: 360, total: 2360, materiales: true });
  });
  it("no añade el IGV de materiales a servicios", () => {
    expect(montosOrdenCompra([{ tipo: "SC", cantidad: 1, precio_unitario: 100 }])).toEqual({ subtotal: 100, igv: 0, total: 100, materiales: false });
  });
  it("en órdenes mixtas grava solamente la base de materiales y redondea a céntimos", () => {
    expect(montosOrdenCompra([{ tipo: "MAT", cantidad: 1, precio_unitario: 2 }, { tipo: "SC", cantidad: 1, precio_unitario: 10 }])).toEqual({ subtotal: 12, igv: 0.36, total: 12.36, materiales: true });
  });
});
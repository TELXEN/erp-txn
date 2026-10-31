import { describe, expect, it } from "vitest";
import { ordenarCategorias } from "./orden-categorias";

describe("categorías de insumos A–Z", () => {
  it("ordena por nombre, sin dar prioridad al código ni a las tildes", () => {
    const categorias = [
      { nombre: "Seguridad Eléctrica e Industrial", codigo: "11" },
      { nombre: "Iluminación", codigo: "04" },
      { nombre: "Áreas Clasificadas, Antiexplosión y Materiales Eléctricos Asociados", codigo: "08" },
      { nombre: "Accesorios para Celdas", codigo: "17" },
      { nombre: "Cables y Conductores", codigo: "10" },
    ];
    expect(ordenarCategorias(categorias).map((c) => c.codigo)).toEqual(["17", "08", "10", "04", "11"]);
    expect(categorias[0]?.codigo).toBe("11");
  });

  it("sitúa una categoría nueva automáticamente entre las existentes", () => {
    const actuales = ordenarCategorias([{ nombre: "Zanjas" }, { nombre: "Accesorios" }]);
    expect(ordenarCategorias([...actuales, { nombre: "Cables y Conductores" }]).map((c) => c.nombre))
      .toEqual(["Accesorios", "Cables y Conductores", "Zanjas"]);
  });
});
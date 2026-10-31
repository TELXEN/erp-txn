import { describe, expect, it } from "vitest";
import { numerarCategorias, ordenarCategorias } from "./orden-categorias";

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

describe("numeración alfabética por especialidad", () => {
  const categorias = [
    { id: "z", especialidad_id: "electrica", nombre: "Zanjas", codigo: "01" },
    { id: "a", especialidad_id: "electrica", nombre: "Accesorios", codigo: "09" },
    { id: "i", especialidad_id: "instrumentacion", nombre: "Instrumentos", codigo: "04" },
  ];
  it("asigna 01 a la primera y el último correlativo a la última, reiniciando por especialidad", () => {
    expect(numerarCategorias(categorias).map((c) => [c.id, c.codigo, c.orden]))
      .toEqual([["a", "01", 1], ["i", "01", 1], ["z", "02", 2]]);
    expect(categorias[0]?.codigo).toBe("01");
  });
  it("renumera al añadir una categoría intermedia", () => {
    expect(numerarCategorias([...categorias, { id: "c", especialidad_id: "electrica", nombre: "Cables" }])
      .filter((c) => c.especialidad_id === "electrica").map((c) => c.codigo)).toEqual(["01", "02", "03"]);
  });
  it("renumera al cambiar el nombre conservando la identidad", () => {
    expect(numerarCategorias(categorias.map((c) => c.id === "z" ? { ...c, nombre: "Abrazaderas" } : c))
      .filter((c) => c.especialidad_id === "electrica").map((c) => [c.id, c.codigo])).toEqual([["z", "01"], ["a", "02"]]);
  });
  it("cierra los huecos al eliminar", () => {
    expect(numerarCategorias(categorias.filter((c) => c.id !== "a"))
      .filter((c) => c.especialidad_id === "electrica").map((c) => [c.id, c.codigo])).toEqual([["z", "01"]]);
  });
});
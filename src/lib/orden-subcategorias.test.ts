import { describe, expect, it } from "vitest";
import { numerarSubcategorias } from "./orden-subcategorias";

const categorias = [{ id: "a", codigo: "01" }, { id: "sistemas", codigo: "17" }];
const fila = (id: string, categoria_id: string, codigo: string, especialidad_id = "electrica", nombre = id) => ({ id, categoria_id, codigo, especialidad_id, nombre });
describe("correlativo de subcategorías", () => {
  it("inicia en 01 dentro de cada categoría", () => {
    expect(numerarSubcategorias([fila("tierra", "sistemas", "50"), fila("a1", "a", "80"), fila("a2", "a", "81")], categorias)
      .map((s) => [s.id, s.codigo])).toEqual([["a1", "01"], ["a2", "02"], ["tierra", "01"]]);
  });
  it("renumera sin huecos al agregar o quitar", () => {
    expect(numerarSubcategorias([fila("a2", "a", "02"), fila("a3", "a", "09")], categorias).map((s) => s.codigo)).toEqual(["01", "02"]);
  });
  it("ordena de A a Z sin distinguir tildes ni mayúsculas aunque los códigos tengan otro orden", () => {
    expect(numerarSubcategorias([fila("z", "a", "01", "electrica", "Zócalos"), fila("b", "a", "02", "electrica", "bornes"), fila("a", "a", "03", "electrica", "Áisladores")], categorias).map((s) => [s.id, s.codigo])).toEqual([["a", "01"], ["b", "02"], ["z", "03"]]);
  });
  it("inicia una secuencia independiente en cada especialidad", () => {
    expect(numerarSubcategorias([fila("a", "a", "20"), fila("b", "a", "05", "instrumentacion")], categorias).map((s) => s.codigo)).toEqual(["01", "01"]);
  });
});
import { describe, expect, it } from "vitest";
import { numerarSubcategorias } from "./orden-subcategorias";

const categorias = [{ id: "a", codigo: "01" }, { id: "sistemas", codigo: "17" }];
const fila = (id: string, categoria_id: string, codigo: string, especialidad_id = "electrica") => ({ id, categoria_id, codigo, especialidad_id });
describe("correlativo de subcategorías", () => {
  it("inicia en 01 y continúa hasta Sistemas de Puesta a Tierra sin reiniciar por grupo", () => {
    expect(numerarSubcategorias([fila("tierra", "sistemas", "50"), fila("a1", "a", "80"), fila("a2", "a", "81")], categorias)
      .map((s) => [s.id, s.codigo])).toEqual([["a1", "01"], ["a2", "02"], ["tierra", "03"]]);
  });
  it("renumera sin huecos al agregar o quitar", () => {
    expect(numerarSubcategorias([fila("a2", "a", "02"), fila("tierra", "sistemas", "09")], categorias).map((s) => s.codigo)).toEqual(["01", "02"]);
  });
  it("mantiene el orden indicado por las flechas dentro del grupo", () => {
    expect(numerarSubcategorias([fila("primera", "a", "02"), fila("segunda", "a", "01")], categorias).map((s) => s.id)).toEqual(["segunda", "primera"]);
  });
  it("inicia una secuencia independiente en cada especialidad", () => {
    expect(numerarSubcategorias([fila("a", "a", "20"), fila("b", "a", "05", "instrumentacion")], categorias).map((s) => s.codigo)).toEqual(["01", "01"]);
  });
});
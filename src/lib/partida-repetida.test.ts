import { describe, expect, it } from "vitest";
import { partidaRepetida } from "./niveles-cotizacion";
import { claveNombre } from "./formato-texto";

const f = (id: string, nivel: string, nombre: string, apu: string | null = null) => ({ id, nivel, tipo: nivel === "partida" ? "partida" : "grupo", nombre, partida_apu_id: apu, orden: 0 }) as never;

describe("partidaRepetida", () => {
  const filas = [f("t1", "titulo", "Obras"), f("p1", "partida", "Excavación"), f("t2", "titulo", "Otros"), f("p2", "partida", "Relleno")];
  it("detecta la misma partida en el mismo título", () => {
    expect((partidaRepetida(filas, 2, claveNombre("EXCAVACION"), null, claveNombre) as unknown as { id: string } | null)?.id).toBe("p1");
  });
  it("no la cuenta si está en otro título", () => {
    expect(partidaRepetida(filas, 4, claveNombre("Excavación"), null, claveNombre)).toBeNull();
  });
});

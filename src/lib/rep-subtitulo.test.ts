import { describe, expect, it } from "vitest";
import { moverBloqueNivel } from "./src/lib/niveles-cotizacion";
const f = (id: string, nivel: string, orden: number) => ({ id, nivel, orden });
describe("repro subtitulo", () => {
  it("dos subtítulos en el mismo título", () => {
    const filas = [
      f("e1","especialidad",1), f("t1","titulo",2),
      f("s1","subtitulo",3), f("p1","partida",4),
      f("s2","subtitulo",5), f("p2","partida",6),
    ];
    expect(moverBloqueNivel(filas, "s2", "subir")).not.toBeNull();
    expect(moverBloqueNivel(filas, "s1", "bajar")).not.toBeNull();
  });
  it("único subtítulo (sin hermanos)", () => {
    const filas = [f("e1","especialidad",1), f("t1","titulo",2), f("s1","subtitulo",3), f("p1","partida",4)];
    console.log("subir:", moverBloqueNivel(filas, "s1", "subir"));
    console.log("bajar:", moverBloqueNivel(filas, "s1", "bajar"));
  });
  it("subtítulo con partidas, otro subtítulo después en mismo título", () => {
    const filas = [
      f("e1","especialidad",1), f("t1","titulo",2),
      f("s1","subtitulo",3), f("p1","partida",4), f("p2","partida",5),
      f("s2","subtitulo",6), f("p3","partida",7),
    ];
    expect(moverBloqueNivel(filas, "s1", "bajar")).not.toBeNull();
  });
});

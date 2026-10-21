import { describe, expect, it } from "vitest";
import { formatearNivel, moverBloqueNivel, numerarNiveles } from "./niveles-cotizacion";

const f = (id: string, nivel: string, orden: number) => ({ id, nivel, orden });

describe("mover filas de cotización", () => {
  for (const nivel of ["especialidad", "titulo", "subtitulo", "partida"]) {
    it(`sube y baja ${nivel} con su contenido y renumera`, () => {
      const hijos = nivel === "partida" ? [] : [f("h1", "partida", 2)];
      const hijos2 = nivel === "partida" ? [] : [f("h2", "partida", 4)];
      const filas = [f("a", nivel, 1), ...hijos, f("b", nivel, 3), ...hijos2];
      const bajada = moverBloqueNivel(filas, "a", "bajar");
      expect(bajada?.map((fila) => fila.id)).toEqual(["b", ...hijos2.map((h) => h.id), "a", ...hijos.map((h) => h.id)]);
      expect(bajada?.map((fila) => fila.orden)).toEqual(filas.map((_, i) => i + 1));
      expect(numerarNiveles(bajada ?? []).codigos.get("b")).toBe("1.0");
      expect(moverBloqueNivel(bajada ?? [], "a", "subir")?.map((fila) => fila.id)).toEqual(filas.map((fila) => fila.id));
    });
  }
  it("no cruza encabezados ni permite mover fuera de los límites", () => {
    const filas = [f("e1", "especialidad", 1), f("p1", "partida", 2), f("e2", "especialidad", 3), f("p2", "partida", 4)];
    expect(moverBloqueNivel(filas, "p1", "bajar")).toBeNull();
    expect(moverBloqueNivel(filas, "p2", "subir")).toBeNull();
    expect(moverBloqueNivel(filas, "e1", "subir")).toBeNull();
    expect(moverBloqueNivel(filas, "e2", "bajar")).toBeNull();
    expect(moverBloqueNivel(filas, "missing", "subir")).toBeNull();
  });
});

describe("numeración de la cotización", () => {
  it("especialidad > título > subtítulo > partida", () => {
    const { codigos } = numerarNiveles([
      f("e1", "especialidad", 1), f("t1", "titulo", 2), f("s1", "subtitulo", 3), f("p1", "partida", 4),
      f("e2", "especialidad", 5), f("t2", "titulo", 6), f("s2", "subtitulo", 7), f("p2", "partida", 8),
    ]);
    expect([...codigos.values()]).toEqual(["1.0", "1.1", "1.1.1", "1.1.1.1", "2.0", "2.1", "2.1.1", "2.1.1.1"]);
  });
  it("sin subtítulo la partida tiene un nivel menos", () => {
    const { codigos } = numerarNiveles([f("e", "especialidad", 1), f("t", "titulo", 2), f("p", "partida", 3), f("p2", "partida", 4)]);
    expect(codigos.get("p")).toBe("1.1.1");
    expect(codigos.get("p2")).toBe("1.1.2");
  });
  it("si empieza por títulos, el título es 1.0", () => {
    const { codigos } = numerarNiveles([f("t", "titulo", 1), f("p", "partida", 2), f("t2", "titulo", 3)]);
    expect(codigos.get("t")).toBe("1.0");
    expect(codigos.get("p")).toBe("1.1");
    expect(codigos.get("t2")).toBe("2.0");
  });
});

describe("formato por nivel", () => {
  it("especialidad y título en mayúsculas", () => {
    expect(formatearNivel("eléctrica", "especialidad")).toBe("ELÉCTRICA");
    expect(formatearNivel("tableros y celdas", "titulo")).toBe("TABLEROS Y CELDAS");
  });
  it("subtítulo con conectores en minúscula", () => {
    expect(formatearNivel("METODOLOGÍA DE LA INVESTIGACIÓN", "subtitulo")).toBe("Metodología de la Investigación");
  });
  it("partida solo con la primera letra en mayúscula", () => {
    expect(formatearNivel("INSTALACIÓN DE TABLERO GENERAL", "partida")).toBe("Instalación de tablero general");
  });
});

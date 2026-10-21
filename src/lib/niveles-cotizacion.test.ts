import { describe, expect, it } from "vitest";
import { formatearNivel, moverBloqueNivel, numerarNiveles, posicionInsercion } from "./niveles-cotizacion";

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
  it("permite cruzar encabezados sin salir de los límites", () => {
    const filas = [f("e1", "especialidad", 1), f("p1", "partida", 2), f("e2", "especialidad", 3), f("p2", "partida", 4)];
    expect(moverBloqueNivel(filas, "p1", "bajar")?.map((fila) => fila.id)).toEqual(["e1", "e2", "p1", "p2"]);
    expect(moverBloqueNivel(filas, "p2", "subir")?.map((fila) => fila.id)).toEqual(["e1", "p1", "p2", "e2"]);
    expect(moverBloqueNivel(filas, "p1", "subir")).toBeNull();
    expect(moverBloqueNivel(filas, "e1", "subir")).toBeNull();
    expect(moverBloqueNivel(filas, "e2", "bajar")).toBeNull();
    expect(moverBloqueNivel(filas, "missing", "subir")).toBeNull();
  });
  it("subir la partida 2.1 la convierte en 1.3 al final del título anterior", () => {
    const filas = [f("t1", "titulo", 1), f("p1", "partida", 2), f("p2", "partida", 3), f("t2", "titulo", 4), f("p3", "partida", 5)];
    expect(numerarNiveles(filas).codigos.get("p3")).toBe("2.1");
    const movidas = moverBloqueNivel(filas, "p3", "subir") ?? [];
    expect(movidas.map((fila) => fila.id)).toEqual(["t1", "p1", "p2", "p3", "t2"]);
    expect(numerarNiveles(movidas).codigos.get("p3")).toBe("1.3");
    expect(moverBloqueNivel(movidas, "p3", "bajar")?.map((fila) => fila.id)).toEqual(filas.map((fila) => fila.id));
  });
  it("título no cruza a otra especialidad y se mueve con sus partidas", () => {
    const filas = [f("g1", "especialidad", 1), f("a", "titulo", 2), f("p1", "partida", 3), f("a2", "titulo", 4), f("p4", "partida", 5), f("g2", "especialidad", 6), f("b", "titulo", 7), f("p2", "partida", 8)];
    expect(moverBloqueNivel(filas, "b", "subir")).toBeNull();
    expect(moverBloqueNivel(filas, "a2", "bajar")).toBeNull();
    expect(moverBloqueNivel(filas, "a", "bajar")?.map((fila) => fila.id)).toEqual(["g1", "a2", "p4", "a", "p1", "g2", "b", "p2"]);
  });
  it("subtítulo cruza el título contiguo para cambiar de grupo y se mueve con sus partidas", () => {
    const filas = [f("g1", "titulo", 1), f("a", "subtitulo", 2), f("p1", "partida", 3), f("a2", "subtitulo", 4), f("p4", "partida", 5), f("g2", "titulo", 6), f("b", "subtitulo", 7), f("p2", "partida", 8)];
    const subida = moverBloqueNivel(filas, "b", "subir") ?? [];
    expect(subida.map((fila) => fila.id)).toEqual(["g1", "a", "p1", "a2", "p4", "b", "p2", "g2"]);
    expect(numerarNiveles(subida).codigos.get("b")).toBe("1.3");
    const bajada = moverBloqueNivel(filas, "a2", "bajar") ?? [];
    expect(bajada.map((fila) => fila.id)).toEqual(["g1", "a", "p1", "g2", "b", "p2", "a2", "p4"]);
    expect(numerarNiveles(bajada).codigos.get("a2")).toBe("2.1");
    expect(moverBloqueNivel(filas, "a", "bajar")?.map((fila) => fila.id)).toEqual(["g1", "a2", "p4", "a", "p1", "g2", "b", "p2"]);
  });
  it("subtítulo único intercambia con el bloque hermano contiguo y cruza títulos", () => {
    const filas = [f("t1", "titulo", 1), f("p1", "partida", 2), f("s1", "subtitulo", 3), f("p2", "partida", 4), f("t2", "titulo", 5), f("p3", "partida", 6)];
    expect(moverBloqueNivel(filas, "s1", "subir")?.map((fila) => fila.id)).toEqual(["t1", "s1", "p2", "p1", "t2", "p3"]);
    const bajada = moverBloqueNivel(filas, "s1", "bajar") ?? [];
    expect(bajada.map((fila) => fila.id)).toEqual(["t1", "p1", "t2", "s1", "p2", "p3"]);
    expect(numerarNiveles(bajada).codigos.get("s1")).toBe("2.1");
    const ultimo = [f("t1", "titulo", 1), f("p1", "partida", 2), f("s1", "subtitulo", 3), f("p2", "partida", 4)];
    expect(moverBloqueNivel(ultimo, "s1", "subir")?.map((fila) => fila.id)).toEqual(["t1", "s1", "p2", "p1"]);
    expect(moverBloqueNivel(ultimo, "s1", "bajar")).toBeNull();
  });
  it("título único intercambia con la partida contigua dentro de su especialidad", () => {
    const filas = [f("e1", "especialidad", 1), f("p1", "partida", 2), f("t1", "titulo", 3), f("p2", "partida", 4)];
    expect(moverBloqueNivel(filas, "t1", "subir")?.map((fila) => fila.id)).toEqual(["e1", "t1", "p2", "p1"]);
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

describe("posición de filas nuevas", () => {
  const filas = [f("e1", "especialidad", 1), f("t1", "titulo", 2), f("p1", "partida", 3), f("p2", "partida", 4), f("e2", "especialidad", 5), f("t2", "titulo", 6), f("p3", "partida", 7)];
  it("especialidad nueva va al final de la hoja", () => {
    expect(posicionInsercion(filas, "especialidad", "p1")).toBe(7);
  });
  it("título nuevo desde una partida intermedia va al final de su especialidad", () => {
    expect(posicionInsercion(filas, "titulo", "p1")).toBe(4);
  });
  it("sin especialidades el título va al final de la hoja", () => {
    const sin = [f("t1", "titulo", 1), f("p1", "partida", 2), f("t2", "titulo", 3), f("p2", "partida", 4)];
    expect(posicionInsercion(sin, "titulo", "p1")).toBe(4);
  });
  it("partida nueva entra tras la fila seleccionada", () => {
    expect(posicionInsercion(filas, "partida", "p1")).toBe(3);
  });
});

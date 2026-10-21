import { describe, expect, it } from "vitest";
import { formatearNivel, numerarNiveles } from "./niveles-cotizacion";

const f = (id: string, nivel: string, orden: number) => ({ id, nivel, orden });

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

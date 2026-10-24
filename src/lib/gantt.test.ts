import { describe, expect, it } from "vitest";
import { calcularCpm, estadoAvance } from "./gantt";

describe("ruta crítica", () => {
  it("cadena simple: todas críticas y fin = suma de duraciones", () => {
    const r = calcularCpm(
      [{ id: "a", inicio: 0, duracion: 5 }, { id: "b", inicio: 0, duracion: 3 }],
      [{ predecesora_id: "a", sucesora_id: "b", tipo: "FS", desfase_dias: 0 }],
    );
    expect(r.fin).toBe(8);
    expect([...r.criticas].sort()).toEqual(["a", "b"]);
  });
  it("ramas paralelas: la corta tiene holgura", () => {
    const r = calcularCpm(
      [{ id: "a", inicio: 0, duracion: 10 }, { id: "b", inicio: 0, duracion: 4 }, { id: "c", inicio: 0, duracion: 2 }],
      [
        { predecesora_id: "a", sucesora_id: "c", tipo: "FS", desfase_dias: 0 },
        { predecesora_id: "b", sucesora_id: "c", tipo: "FS", desfase_dias: 0 },
      ],
    );
    expect(r.holgura.b).toBe(6);
    expect(r.criticas.has("b")).toBe(false);
    expect(r.criticas.has("a")).toBe(true);
  });
  it("desfase desplaza la sucesora", () => {
    const r = calcularCpm(
      [{ id: "a", inicio: 0, duracion: 5 }, { id: "b", inicio: 0, duracion: 3 }],
      [{ predecesora_id: "a", sucesora_id: "b", tipo: "FS", desfase_dias: 2 }],
    );
    expect(r.es.b).toBe(7);
  });
  it("rechaza ciclos", () => {
    expect(() =>
      calcularCpm(
        [{ id: "a", inicio: 0, duracion: 1 }, { id: "b", inicio: 0, duracion: 1 }],
        [
          { predecesora_id: "a", sucesora_id: "b", tipo: "FS", desfase_dias: 0 },
          { predecesora_id: "b", sucesora_id: "a", tipo: "FS", desfase_dias: 0 },
        ],
      ),
    ).toThrow();
  });
  it("estado de avance", () => {
    expect(estadoAvance(50, 50)).toBe("ok");
    expect(estadoAvance(45, 50)).toBe("alerta");
    expect(estadoAvance(30, 50)).toBe("atraso");
  });
});

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
    expect(r.holgura["b"]).toBe(6);
    expect(r.criticas.has("b")).toBe(false);
    expect(r.criticas.has("a")).toBe(true);
  });
  it("desfase desplaza la sucesora", () => {
    const r = calcularCpm(
      [{ id: "a", inicio: 0, duracion: 5 }, { id: "b", inicio: 0, duracion: 3 }],
      [{ predecesora_id: "a", sucesora_id: "b", tipo: "FS", desfase_dias: 2 }],
    );
    expect(r.es["b"]).toBe(7);
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

import { cabeceras, diaSemana, feriadosPeru, aDia, letraNumerosDias, letraSemana, pasoLetrasSemana, pasoNumerosDias, escalaCalendario } from "./gantt";
describe("calendario", () => {
  it("feriados de Perú incluyen Fiestas Patrias y Viernes Santo 2026 (3 abr)", () => {
    const f = feriadosPeru(2026);
    expect(f.get(aDia("2026-07-28"))).toBe("Fiestas Patrias");
    expect(f.get(aDia("2026-04-03"))).toBe("Viernes Santo");
  });
  it("día de semana: 24/10/2026 es sábado", () => {
    expect(diaSemana(aDia("2026-10-24"))).toBe(6);
  });
  it("cabecera por semanas corta en lunes y agrupa por mes", () => {
    const c = cabeceras(aDia("2026-10-01"), aDia("2026-11-10"), "semana");
    expect(c.superior.map((s) => s.etiqueta)).toEqual(["Oct 2026", "Nov 2026"]);
    expect(diaSemana(c.inferior[1]!.inicio)).toBe(1);
  });
});

describe("letra de los números de día", () => {
  it("obra de un mes o menos: 10 px", () => {
    expect(letraNumerosDias(22, true)).toBe(10);
    expect(letraNumerosDias(31, true)).toBe(10);
  });
  it("obra de más de un mes: 9 px", () => {
    expect(letraNumerosDias(32, true)).toBe(9);
    expect(letraNumerosDias(85, true)).toBe(9);
  });
  it("obra de más de cuatro meses: 8 px", () => {
    expect(letraNumerosDias(121, true)).toBe(8);
  });
  it("fuera de la vista por días se conserva 10 px", () => {
    expect(letraNumerosDias(85, false)).toBe(10);
  });
  it("días angostos: se numera cada tantos días", () => {
    expect(pasoNumerosDias(30, 10)).toBe(1);
    expect(pasoNumerosDias(8, 9)).toBe(2);
    expect(pasoNumerosDias(3, 8)).toBe(5);
  });
});

describe("navegación del calendario", () => {
  it("hasta un mes ajusta el calendario sin activar barras", () => {
    expect(escalaCalendario(31, 620, 1)).toEqual({ conBarras: false, px: 20 });
    expect(escalaCalendario(22, 620, 1).px * 22).toBe(620);
  });
  it("más de un mes activa barras y mantiene una ventana de 31 días", () => {
    expect(escalaCalendario(32, 620, 1)).toEqual({ conBarras: true, px: 20 });
    const larga = escalaCalendario(85, 620, 1);
    expect(larga.conBarras).toBe(true);
    expect(larga.px * 85).toBe(1700);
  });
});

describe("letra del día de la semana", () => {
  it("usa L M M J V S D según el día real", () => {
    expect(letraSemana(aDia("2026-10-24"))).toBe("S"); // sábado
    expect(letraSemana(aDia("2026-10-25"))).toBe("D"); // domingo
    expect(letraSemana(aDia("2026-10-26"))).toBe("L"); // lunes
    expect(letraSemana(aDia("2026-10-27"))).toBe("M"); // martes
    expect(letraSemana(aDia("2026-10-28"))).toBe("M"); // miércoles
    expect(letraSemana(aDia("2026-10-29"))).toBe("J"); // jueves
    expect(letraSemana(aDia("2026-10-30"))).toBe("V"); // viernes
  });
  it("admite columnas más angostas que los números", () => {
    expect(pasoLetrasSemana(30, 9)).toBe(1);
    expect(pasoLetrasSemana(8, 9)).toBe(2);
    expect(pasoLetrasSemana(3, 8)).toBe(3);
    expect(pasoLetrasSemana(0, 9)).toBe(1);
    expect(pasoLetrasSemana(8, 9)).toBeLessThan(pasoNumerosDias(8, 9));
  });
});

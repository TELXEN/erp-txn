import { describe, expect, it } from "vitest";
import { paginarCotizacion } from "./paginacion-cotizacion";

const opciones = { alto: (f: { h: number; grupo?: boolean }) => f.h, encabezado: (f: { grupo?: boolean }) => Boolean(f.grupo), primera: 590, siguientes: 770, cierre: 297 };
describe("paginación medida de cotizaciones", () => {
  it("mantiene los grupos finales en la primera hoja cuando caben con el cierre", () => {
    const filas = [28, 27, 27, 29, 25, 27, 27, 27, 28, 29].map((h, i) => ({ h, grupo: [0, 3, 4, 8, 9].includes(i) }));
    expect(paginarCotizacion(filas, opciones)).toEqual([filas]);
  });
  it("mantiene el encabezado con la primera partida", () => {
    const filas = [{ h: 560 }, { h: 28, grupo: true }, { h: 27 }];
    expect(paginarCotizacion(filas, { ...opciones, cierre: 0 })).toEqual([[filas[0]], [filas[1], filas[2]]]);
  });
  it("no mueve todo un grupo para hacer espacio al cierre", () => {
    const filas = [{ h: 28, grupo: true }, { h: 150 }, { h: 150 }, { h: 150 }];
    expect(paginarCotizacion(filas, opciones)).toEqual([[filas[0], filas[1], filas[2]], [filas[3]]]);
  });
});
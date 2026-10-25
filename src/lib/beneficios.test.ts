import { describe, expect, it } from "vitest";
import { calcCts, periodoCts, periodoCtsAnterior } from "./beneficios";

const t = (fecha_ingreso: string) => ({ id: "x", sueldo_mensual: 3500, asignacion_familiar: false, regimen_laboral: "General", fecha_ingreso });

describe("CTS", () => {
  it("ingreso 02/01/2026: CTS noviembre 2026 = 6 meses", () => {
    const p = periodoCts(2026, "Noviembre");
    const c = calcCts(t("2026-01-02"), p.desde, p.hasta);
    expect([c.meses, c.dias]).toEqual([6, 0]);
  });
  it("ingreso 15/06/2026: 4 meses 16 días", () => {
    const p = periodoCts(2026, "Noviembre");
    const c = calcCts(t("2026-06-15"), p.desde, p.hasta);
    expect([c.meses, c.dias]).toEqual([4, 17]);
  });
  it("ingreso 02/01/2026 tiene derecho a CTS mayo 2026 (3 m 29 d)", () => {
    const a = periodoCtsAnterior(t("2026-01-02"), 2026, "Noviembre");
    expect(a?.periodo).toBe("Mayo");
    expect([a?.meses, a?.dias]).toEqual([3, 29]);
  });
});

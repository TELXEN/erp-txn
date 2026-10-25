import { describe, expect, it } from "vitest";
import { calcCts, calcGrat, periodoCts, periodoCtsAnterior, filasRegularizacionCts, agruparBoletasPorTrabajador } from "./beneficios";

const t = (fecha_ingreso: string) => ({ id: "x", sueldo_mensual: 3500, asignacion_familiar: false, regimen_laboral: "General", fecha_ingreso });

describe("Sustento de gratificación", () => {
  it("conserva base, factor y bonificación para sustentar seis meses de gratificación", () => {
    const g = calcGrat(t("2025-01-01"), "2026-01-01", "2026-06-30");
    expect(g.meses).toBe(6);
    expect(g.detalle).toEqual({ sueldo: 3500, asignacion_familiar: 0, factor_regimen: 1, tasa_bonificacion: 0.09 });
    expect([g.remuneracion_computable, g.monto, g.bonificacion, g.total]).toEqual([3500, 3500, 315, 3815]);
  });
});

describe("CTS", () => {
  it("agrupa dos boletas del mismo trabajador sin mezclarlas con otro trabajador", () => {
    const mayo = { id: "mayo", trabajador_id: "eder", periodo: "Mayo", total: 1397.20 };
    const otro = { id: "otro", trabajador_id: "otro", periodo: "Noviembre", total: 500 };
    const noviembre = { id: "noviembre", trabajador_id: "eder", periodo: "Noviembre", total: 2113.42 };
    expect(agruparBoletasPorTrabajador([mayo, otro, noviembre])).toEqual([[mayo, noviembre], [otro]]);
  });
  it("regularizar noviembre genera dos CTS independientes: mayo y noviembre", () => {
    const filas = filasRegularizacionCts(t("2026-01-02"), 2026, "Noviembre", []);
    expect(filas.map((r) => [r.anio, r.periodo, r.regularizacion, r.meses, r.dias])).toEqual([
      [2026, "Mayo", true, 3, 29], [2026, "Noviembre", false, 6, 0],
    ]);
  });
  it("conserva CTS existentes sin duplicarlas o reescribirlas", () => {
    const existentes = [{ trabajador_id: "x", anio: 2026, periodo: "Mayo" }];
    expect(filasRegularizacionCts(t("2026-01-02"), 2026, "Noviembre", existentes).map((r) => r.periodo)).toEqual(["Noviembre"]);
    expect(filasRegularizacionCts(t("2026-01-02"), 2026, "Noviembre", [...existentes, { trabajador_id: "x", anio: 2026, periodo: "Noviembre" }])).toEqual([]);
  });
  it("ingreso 02/01/2026: CTS noviembre 2026 = 6 meses", () => {
    const p = periodoCts(2026, "Noviembre");
    const c = calcCts(t("2026-01-02"), p.desde, p.hasta);
    expect([c.meses, c.dias]).toEqual([6, 0]);
  });
  it("ingreso 15/06/2026: 4 meses 16 días", () => {
    const p = periodoCts(2026, "Noviembre");
    const c = calcCts(t("2026-06-15"), p.desde, p.hasta);
    expect([c.meses, c.dias]).toEqual([4, 16]);
  });
  it("ingreso 02/01/2026 tiene derecho a CTS mayo 2026 (3 m 29 d)", () => {
    const a = periodoCtsAnterior(t("2026-01-02"), 2026, "Noviembre");
    expect(a?.periodo).toBe("Mayo");
    expect([a?.meses, a?.dias]).toEqual([3, 29]);
  });
});

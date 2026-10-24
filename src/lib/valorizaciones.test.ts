import { describe, expect, it } from "vitest";
import { faltaFirma, limitarMetrado, metradoSugerido, resumenValorizacion } from "./valorizaciones";

describe("valorizaciones", () => {
  it("no permite valorizar más del 100 % contratado", () => {
    expect(limitarMetrado({ metrado_contratado: 100, metrado_anterior: 70 }, 50)).toBe(30);
  });
  it("sugiere el metrado del avance físico menos lo ya valorizado", () => {
    expect(metradoSugerido(200, 60, 80)).toBe(40);
  });
  it("aplica IGV 18 % y deducciones opcionales en 0 % por defecto", () => {
    const r = resumenValorizacion(1000, { pct_gg: 10, pct_utilidad: 10, pct_adelanto: 0, pct_retencion: 0 });
    expect(r.subtotal).toBe(1200);
    expect(r.igv).toBe(216);
    expect(r.neto).toBe(1416);
  });
  it("descuenta amortización de adelanto antes del IGV y retención al final", () => {
    const r = resumenValorizacion(1000, { pct_gg: 0, pct_utilidad: 0, pct_adelanto: 10, pct_retencion: 5 });
    expect(r.base).toBe(900);
    expect(r.total).toBe(1062);
    expect(r.neto).toBe(1017);
  });
  it("exige nombre, cargo y fecha de la firma para aprobar", () => {
    expect(faltaFirma({ firma_nombre: "Ing. Pérez", firma_cargo: "", firma_fecha: "2026-10-24" })).toBe(true);
    expect(faltaFirma({ firma_nombre: "Ing. Pérez", firma_cargo: "Supervisor", firma_fecha: "2026-10-24" })).toBe(false);
  });
});

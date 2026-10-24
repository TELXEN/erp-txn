import { describe, expect, it } from "vitest";
import { puedeRetomar } from "./cotizaciones";

const hoy = new Date("2027-03-10T12:00:00");
const base = { fecha_emision: "2026-11-05", estado: "Enviada" as const, proyecto_id: null };

describe("puedeRetomar", () => {
  it("permite retomar una cotización de un año anterior en espera", () => {
    expect(puedeRetomar(base, hoy)).toBe(true);
  });
  it("no permite retomar una cotización del año actual", () => {
    expect(puedeRetomar({ ...base, fecha_emision: "2027-01-02" }, hoy)).toBe(false);
  });
  it("no permite retomar una cotización aprobada", () => {
    expect(puedeRetomar({ ...base, estado: "Aprobada" }, hoy)).toBe(false);
  });
  it("no permite retomar dos veces", () => {
    expect(puedeRetomar({ ...base, estado: "Retomada" }, hoy)).toBe(false);
  });
  it("no permite retomar una cotización convertida en obra", () => {
    expect(puedeRetomar({ ...base, proyecto_id: "x" }, hoy)).toBe(false);
  });
});

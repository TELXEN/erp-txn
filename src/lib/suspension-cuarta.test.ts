import { describe, expect, it } from "vitest";
import { anioVigencia, estadoSuspension, suspensionVigente } from "./suspension-cuarta";

const t = { suspension_cuarta: true, suspension_cuarta_fecha: "2026-03-10", suspension_cuarta_anio: 2026 };

describe("suspensión de 4ta", () => {
  it("vale desde dos días después de su fecha", () => {
    expect(suspensionVigente(t, "2026-03-12")).toBe(true);
    expect(suspensionVigente(t, "2026-03-11")).toBe(false);
  });
  it("no vale en otro año", () => expect(suspensionVigente(t, "2027-01-15")).toBe(false));
  it("sin fecha no exime", () => expect(suspensionVigente({ suspension_cuarta: true }, "2026-05-01")).toBe(false));
  it("estado anual", () => {
    expect(estadoSuspension(t, 2026)).toBe("vigente");
    expect(estadoSuspension(t, 2027)).toBe("vencida");
  });
});

describe("año de vigencia automático", () => {
  it("se toma del año actual al registrar", () => {
    expect(anioVigencia({ anioGuardado: null, fechaNueva: true, anioActual: 2026 })).toBe(2026);
  });
  it("se renueva al registrar una fecha nueva", () => {
    expect(anioVigencia({ anioGuardado: 2026, fechaNueva: true, anioActual: 2027 })).toBe(2027);
  });
  it("se conserva si solo se editan otros datos", () => {
    expect(anioVigencia({ anioGuardado: 2026, fechaNueva: false, anioActual: 2027 })).toBe(2026);
  });
});

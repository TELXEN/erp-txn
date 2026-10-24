import { describe, expect, it } from "vitest";
import { estadoSuspension, suspensionVigente } from "./suspension-cuarta";

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

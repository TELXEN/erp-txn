import { describe, expect, it } from "vitest";
import { diasStaffMes, motivoDiasStaff } from "./nomina-staff";

describe("Días del personal Staff", () => {
  it("mes completo = 30", () => expect(diasStaffMes("2025-01-01", null, 2026, 10)).toBe(30));
  it("febrero completo = 30", () => expect(diasStaffMes("2025-01-01", null, 2026, 2)).toBe(30));
  it("ingreso el día 10 = 21", () => expect(diasStaffMes("2026-10-10", null, 2026, 10)).toBe(21));
  it("cese el día 20 = 20", () => expect(diasStaffMes("2025-01-01", "2026-10-20", 2026, 10)).toBe(20));
  it("del 5 al 20 = 16", () => expect(diasStaffMes("2026-10-05", "2026-10-20", 2026, 10)).toBe(16));
  it("cese el 31 = 30", () => expect(diasStaffMes("2025-01-01", "2026-10-31", 2026, 10)).toBe(30));
  it("ingreso en el mes siguiente = 0", () => expect(diasStaffMes("2026-11-03", null, 2026, 10)).toBe(0));
  it("nota del ingreso", () => expect(motivoDiasStaff("2026-10-10", null, 2026, 10)).toBe("Ingreso 10/10/2026 · 21 días"));
});

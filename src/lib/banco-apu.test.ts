import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const { siguienteCodigoJerarquico: s } = await import("@/lib/banco-apu");

describe("siguienteCodigoJerarquico", () => {
  it("incrementa el último nivel", () => expect(s(["04.01.01", "04.01.02", "05.01.09"], "04")).toBe("04.01.03"));
  it("compara numéricamente", () => expect(s(["04.01.09", "04.01.10"], "04")).toBe("04.01.11"));
  it("rama vacía", () => expect(s(["05.01.01"], "04")).toBe("04.01.01"));
  it("ignora otras ramas con prefijo parecido", () => expect(s(["040.01.05", "04.01.01"], "04")).toBe("04.01.02"));
});

import { describe, expect, it } from "vitest";
import { rmvEn, uitEn, type FilaRmv, type FilaUit } from "./normativa";

const rmv: FilaRmv[] = [
  { id: "a", vigencia_desde: "2025-01-01", monto: 1130, base_legal: "", observaciones: null },
  { id: "b", vigencia_desde: "2026-10-01", monto: 1230, base_legal: "", observaciones: null },
];
const uit: FilaUit[] = [
  { id: "x", anio: 2025, monto: 5350, base_legal: "", observaciones: null },
  { id: "y", anio: 2026, monto: 5500, base_legal: "", observaciones: null },
];

describe("RMV y UIT independientes", () => {
  it("la RMV cambia en octubre 2026", () => {
    expect(rmvEn(rmv, "2026-09")).toBe(1130);
    expect(rmvEn(rmv, "2026-10")).toBe(1230);
  });
  it("la UIT 2026 no depende de la RMV nueva", () => {
    expect(uitEn(uit, 2026)).toBe(5500);
    expect(uitEn(uit, 2025)).toBe(5350);
  });
});

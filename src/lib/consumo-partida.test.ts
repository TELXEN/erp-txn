import { describe, expect, it } from "vitest";
import { consumidoPorPartida, estadoConsumoPartida } from "./consumo-partida";

describe("consumo por partida", () => {
  it("avisa sobrecosto cuando el consumo supera lo presupuestado, sin bloquear", () => {
    const e = estadoConsumoPartida(1000, 900, 150);
    expect(e.tras).toBe(1050);
    expect(e.exceso).toBe(50);
    expect(e.sobrecosto).toBe(true);
  });
  it("no avisa si queda dentro del presupuesto", () => {
    expect(estadoConsumoPartida(1000, 900, 100).sobrecosto).toBe(false);
  });
  it("suma consumos y vales con partida, ignora transferencias", () => {
    const m = consumidoPorPartida([
      { tipo: "Salida", motivo: "Consumo", partida_id: "p1", cantidad: 10, costo_unitario: 5 },
      { tipo: "Salida", motivo: "Vale de salida", partida_id: "p1", cantidad: 2, costo_unitario: 10 },
      { tipo: "Salida", motivo: "Transferencia", partida_id: "p1", cantidad: 100, costo_unitario: 1 },
    ]);
    expect(m.get("p1")).toBe(70);
  });
});

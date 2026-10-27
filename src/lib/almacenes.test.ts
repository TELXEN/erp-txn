import { describe, expect, it } from "vitest";
import { calcularStock } from "./logistica";
import { almacenDeValor } from "./almacenes";

const base = { insumo_id: "cable", descripcion: "Cable 6mm2", unidad: "m", orden_item_id: null, documento: "", observacion: "", fecha: "2026-10-27" };
describe("almacenes", () => {
  it("transferencia en tránsito no suma al destino hasta recibirla", () => {
    const movs: import("./logistica").Movimiento[] = [
      { ...base, id: "1", tipo: "Ingreso" as const, proyecto_id: null as unknown as string, cantidad: 2000, costo_unitario: 5 },
      { ...base, id: "2", tipo: "Salida" as const, proyecto_id: null as unknown as string, cantidad: 1000, costo_unitario: 5, motivo: "Transferencia" },
      { ...base, id: "3", tipo: "Ingreso" as const, proyecto_id: "obraA", cantidad: 1000, costo_unitario: 5, motivo: "Transferencia", estado: "En tránsito" },
    ];
    const s = calcularStock(movs);
    expect(s.find((x) => x.proyecto_id === null)?.stock).toBe(1000);
    expect(s.find((x) => x.proyecto_id === "obraA")).toBeUndefined();
    movs[2]!.estado = "Recibido";
    expect(calcularStock(movs).find((x) => x.proyecto_id === "obraA")?.stock).toBe(1000);
  });
  it("central se guarda como null", () => {
    expect(almacenDeValor("central")).toBeNull();
    expect(almacenDeValor("abc")).toBe("abc");
  });
});

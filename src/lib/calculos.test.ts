import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const { calcularApu, cantidadComponente, precioVenta } = await import("@/lib/apu");
const { costoPersonalPorProyecto } = await import("@/lib/pagos-rrhh");
const { estructuraOferta } = await import("@/lib/datos");

const comp = (id: string, insumo_id: string, cuadrilla: number, cantidad: number) => ({
  id, partida_maestra_id: "p", insumo_id, cuadrilla, cantidad,
});
const ins = (id: string, tipo: string, precio: number, margen_pct = 0) =>
  ({ id, tipo, codigo: id, nombre: id, unidad: "und", precio, margen_pct, activo: true });

describe("APU", () => {
  it("cantidad con cuadrilla = cuadrilla × jornada ÷ rendimiento", () => {
    expect(cantidadComponente(comp("a", "x", 2, 0), 16, 8)).toBe(1);
  });
  it("cantidad sin cuadrilla = cantidad directa", () => {
    expect(cantidadComponente(comp("a", "x", 0, 3.5), 16, 8)).toBe(3.5);
  });
  it("precio de venta aplica el margen sobre la compra", () => {
    expect(precioVenta({ precio: 100, margen_pct: 15 })).toBeCloseTo(115, 10);
  });
  it("P.U. suma tipos y agrega herramientas manuales como % de MO en EQ", () => {
    const r = calcularApu(
      [comp("c1", "mo", 1, 0), comp("c2", "mat", 0, 2)],
      [ins("mo", "MO", 20), ins("mat", "MAT", 10)] as never,
      8, 8, 5,
    );
    // MO = 1 × 8 ÷ 8 × 20 = 20 ; MAT = 2 × 10 = 20 ; HT = 5% × 20 = 1
    expect(r.tot["MO"]).toBe(20);
    expect(r.tot["MAT"]).toBe(20);
    expect(r.herramientas).toBe(1);
    expect(r.tot["EQ"]).toBe(1);
    expect(r.pu).toBe(41);
  });
});

describe("Oferta", () => {
  it("GG y utilidad se calculan sobre el costo directo", () => {
    const o = estructuraOferta(1000, 10, 8);
    expect(o.ofertado).toBeCloseTo(1180, 10);
  });
});

describe("Costo de personal por obra", () => {
  const indirecto = (id: string) => id === "staff";
  it("reparte la boleta según el tareo del mes", () => {
    const { porProyecto } = costoPersonalPorProyecto(
      [{ trabajador_id: "t1", anio: 2026, mes: 10, monto: 1000, tipo: "boleta" }],
      [
        { trabajador_id: "t1", proyecto_id: "A", fecha: "2026-10-01", costo_soles: 300 },
        { trabajador_id: "t1", proyecto_id: "B", fecha: "2026-10-02", costo_soles: 100 },
      ],
      indirecto,
    );
    expect(porProyecto.get("A")?.mod).toBe(750);
    expect(porProyecto.get("B")?.mod).toBe(250);
  });
  it("sin boleta se estima con el costo del tareo", () => {
    const { porProyecto, estimado, pendientes } = costoPersonalPorProyecto(
      [],
      [{ trabajador_id: "t1", proyecto_id: "A", fecha: "2026-10-01", costo_soles: 200 }],
      indirecto,
    );
    expect(porProyecto.get("A")?.mod).toBe(200);
    expect(estimado).toBe(200);
    expect(pendientes.get("2026-10")?.size).toBe(1);
  });
  it("personal indirecto va a staff (gastos generales)", () => {
    const { porProyecto } = costoPersonalPorProyecto(
      [{ trabajador_id: "staff", anio: 2026, mes: 10, monto: 800, tipo: "honorario" }],
      [{ trabajador_id: "staff", proyecto_id: "A", fecha: "2026-10-08", costo_soles: 200 }],
      indirecto,
    );
    expect(porProyecto.get("A")).toEqual({ mod: 0, honorarios: 0, staff: 800 });
  });
  it("recibo sin tareo va completo a su proyecto", () => {
    const { porProyecto } = costoPersonalPorProyecto(
      [{ trabajador_id: "t2", anio: 2026, mes: 10, monto: 500, tipo: "honorario", proyecto_id: "C" }],
      [],
      indirecto,
    );
    expect(porProyecto.get("C")?.honorarios).toBe(500);
  });
});

import { compraPermitida, limiteCompra } from "./sobrecosto";
describe("candado de compras por avance físico", () => {
  it("límite = presupuesto × (avance + tolerancia)", () => {
    expect(limiteCompra(1000, 10, 15)).toBeCloseTo(1150);
  });
  it("bloquea cuando la compra supera el límite", () => {
    expect(compraPermitida(200, 40, 1000, 10, 15)).toBe(true);
    expect(compraPermitida(200, 60, 1000, 10, 15)).toBe(false);
  });
});

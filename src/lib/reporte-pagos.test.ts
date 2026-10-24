import { describe, expect, it } from "vitest";
import { cuentaSugerida, sinCuenta, totalesPorMoneda } from "./reporte-pagos";

const cuentas = [
  { banco: "BCP", moneda: "PEN", numero_cuenta: "191-1", cci: "002", es_principal: false },
  { banco: "BBVA", moneda: "USD", numero_cuenta: "0011-2", cci: "011", es_principal: true },
  { banco: "BCP", moneda: "PEN", numero_cuenta: "191-9", cci: "002-9", es_principal: true },
  { banco: "BN", moneda: "PEN", numero_cuenta: "00-123", cci: "", es_detraccion: true },
];

describe("reporte de pagos", () => {
  it("sugiere la cuenta principal en la moneda de la deuda", () => {
    expect(cuentaSugerida(cuentas, "PEN")?.numero_cuenta).toBe("191-9");
    expect(cuentaSugerida(cuentas, "USD")?.numero_cuenta).toBe("0011-2");
  });
  it("para detracciones sugiere la cuenta del Banco de la Nación", () => {
    expect(cuentaSugerida(cuentas, "PEN", true)?.banco).toBe("BN");
  });
  it("marca la deuda sin cuenta en su moneda", () => {
    const c = cuentaSugerida([cuentas[0]!], "USD");
    expect(c).toBeNull();
    expect(sinCuenta({ cuenta: c })).toBe(true);
  });
  it("separa los totales en soles y dólares", () => {
    expect(totalesPorMoneda([{ moneda: "PEN", monto: 100 }, { moneda: "USD", monto: 50 }, { moneda: "PEN", monto: 20.5 }])).toEqual({ PEN: 120.5, USD: 50 });
  });
});

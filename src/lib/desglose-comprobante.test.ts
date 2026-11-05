import { describe, expect, it } from "vitest";
import { filasDesglose } from "./desglose-comprobante";
const base = { operacionTipo: "gravada", valorVenta: 23728.81, descuentos: 0, anticipo: 0, isc: 0, icbper: 0, igv: 4271.19, otrosCargos: 0, total: 28000 };
describe("filasDesglose", () => {
  it("ordena las 13 filas con TOTAL al final", () => {
    const f = filasDesglose(base);
    expect(f.map((x) => x.etiqueta)[0]).toBe("OP. GRAVADAS");
    expect(f).toHaveLength(13);
    expect(f[12]).toEqual({ etiqueta: "TOTAL", valor: 28000, total: true });
  });
  it("pone el valor de venta solo en su tipo de operación", () => {
    const f = filasDesglose({ ...base, operacionTipo: "exonerada" });
    expect(f[0].valor).toBe(0);
    expect(f[2].valor).toBe(23728.81);
  });
});

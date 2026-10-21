import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const { siguienteCodigoJerarquico: s, filaRecursoCotizacion, costoReceta } = await import("@/lib/banco-apu");

describe("siguienteCodigoJerarquico", () => {
  it("incrementa el último nivel", () => expect(s(["04.01.01", "04.01.02", "05.01.09"], "04")).toBe("04.01.03"));
  it("compara numéricamente", () => expect(s(["04.01.09", "04.01.10"], "04")).toBe("04.01.11"));
  it("rama vacía", () => expect(s(["05.01.01"], "04")).toBe("04.01.01"));
  it("ignora otras ramas con prefijo parecido", () => expect(s(["040.01.05", "04.01.01"], "04")).toBe("04.01.02"));
});

describe("vinculación de insumos en cotizaciones", () => {
  const capataz = { id: "capataz", codigo: "20600001", descripcion: "Capataz", unidad: "H-H", costo_hora: 25 };
  const recursos = { materiales: [], mano_obra: [capataz], equipos_herramientas: [], subcontratos: [] };
  it("conserva el código del catálogo y el vínculo al insumo seleccionado", () => {
    const fila = filaRecursoCotizacion("mano_obra", capataz, 2, 1);
    expect(fila.mano_obra_id).toBe("capataz");
    expect(fila.codigo).toBe("20600001");
  });
  it("resuelve el código de filas anteriores vinculadas sin código guardado", () => {
    const calc = costoReceta([{ mano_obra_id: "capataz", cantidad_o_cuadrilla: 1 }], recursos, 1);
    expect(calc.filas[0]?.d.codigo).toBe("20600001");
  });
  it("conserva el código histórico guardado aunque cambie el catálogo", () => {
    const fila = filaRecursoCotizacion("mano_obra", capataz, 1, 1);
    const calc = costoReceta([fila], { ...recursos, mano_obra: [{ ...capataz, codigo: "20700001" }] }, 1);
    expect(calc.filas[0]?.d.codigo).toBe("20600001");
  });
  it("un insumo recién creado conserva su nuevo código al incorporarse al APU", () => {
    const fila = filaRecursoCotizacion("materiales", { id: "nuevo", codigo: "10613001", descripcion: "Material nuevo", costo_unitario: 10, unidad: "und" }, 3, 1);
    expect(fila.material_id).toBe("nuevo");
    expect(fila.codigo).toBe("10613001");
  });
});

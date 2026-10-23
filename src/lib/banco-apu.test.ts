import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const { siguienteCodigoJerarquico: s, filaRecursoCotizacion, costoReceta, incidenciaPartidaApu, ordenarPartidasAlfabetico, codigosAlfabetizados, codigoAlfabeticoSugerido } = await import("@/lib/banco-apu");

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

describe("incidencia del APU en el desglose", () => {
  const recursos = { materiales: [], mano_obra: [], equipos_herramientas: [], subcontratos: [] };
  const calculo = costoReceta([
    { mano_obra_id: "mo", descripcion: "Capataz", unidad: "H-H", precio_unitario: 10.4773, cantidad_o_cuadrilla: 1 },
    { equipo_id: "eq", descripcion: "Mezcladora", unidad: "H-M", precio_unitario: 36.3795, cantidad_o_cuadrilla: 1 },
    { material_id: "mat", descripcion: "Cable", unidad: "m", precio_unitario: 12.7328, cantidad_o_cuadrilla: 125 },
  ], recursos, 1, 8);
  it("C006: el 5% de herramientas pertenece a equipos, sin importe sin APU", () => {
    const incidencia = incidenciaPartidaApu(calculo, 1970.65, 1, 5);
    expect(incidencia["EQ"]).toBeCloseTo(295.23, 2);
    expect(incidencia["OTROS"]).toBe(0);
    expect(incidencia["AJUSTE"]).toBe(0);
    expect(Object.values(incidencia).reduce((s, v) => s + v, 0)).toBeCloseTo(1970.65, 2);
  });
  it("una partida realmente sin recursos se registra como sin APU", () => {
    expect(incidenciaPartidaApu({ total: 0, filas: [] }, 100, 2, 5)["OTROS"]).toBe(200);
  });
  it("un precio manual distinto no se confunde con ausencia de APU", () => {
    const incidencia = incidenciaPartidaApu(calculo, 2000.65, 2, 5);
    expect(incidencia["AJUSTE"]).toBe(60);
    expect(incidencia["OTROS"]).toBe(0);
  });
});

describe("partidas del banco guardadas por orden alfabético", () => {
  const p = (id: string, codigo: string, descripcion: string, especialidad = "ELÉCTRICA") => ({ id, codigo_jerarquico: codigo, descripcion, especialidad });
  it("ordena A→Z sin tildes ni mayúsculas", () => {
    const orden = ordenarPartidasAlfabetico([p("1", "06.01.01", "Zanjas"), p("2", "06.01.02", "ángeles"), p("3", "06.01.03", "Banquetas")]);
    expect(orden.map((x) => x.descripcion)).toEqual(["ángeles", "Banquetas", "Zanjas"]);
  });
  it("renumera el correlativo según la letra", () => {
    expect(codigosAlfabetizados([p("1", "06.01.01", "Zanjas"), p("2", "06.01.02", "Alumbrado")]))
      .toEqual([{ id: "2", codigo: "06.01.01" }, { id: "1", codigo: "06.01.02" }]);
  });
  it("no toca los códigos que ya siguen el orden alfabético", () => {
    expect(codigosAlfabetizados([p("1", "06.01.01", "Alumbrado"), p("2", "06.01.02", "Zanjas")])).toEqual([]);
  });
  it("da código a una partida guardada sin código", () => {
    expect(codigosAlfabetizados([p("1", "06.01.01", "Zanjas"), p("2", "", "Alumbrado")], () => "06"))
      .toEqual([{ id: "2", codigo: "06.01.01" }, { id: "1", codigo: "06.01.02" }]);
  });
  it("cada especialidad numera su propia rama", () => {
    const prefijo = (x: { especialidad?: string }) => (x.especialidad === "ILUMINACIÓN" ? "07" : "06");
    expect(codigosAlfabetizados([p("1", "06.01.01", "Zanjas"), p("2", "07.01.01", "Tableros", "ILUMINACIÓN"), p("3", "", "Alumbrado", "ILUMINACIÓN")], prefijo))
      .toEqual([{ id: "3", codigo: "07.01.01" }, { id: "2", codigo: "07.01.02" }]);
  });
  it("sugiere el hueco alfabético de una partida nueva", () => {
    const partidas = [p("1", "06.01.01", "Alumbrado"), p("2", "06.01.02", "Zanjas")];
    expect(codigoAlfabeticoSugerido(partidas, "06", "Transformador")).toBe("06.01.02");
    expect(codigoAlfabeticoSugerido(partidas, "06", "Acometida")).toBe("06.01.01");
  });
});

import { apuDb } from "@/lib/apu";
import { liquidar } from "@/lib/importaciones";

type Imp = {
  id: string; codigo: string; proyecto_id: string | null; proveedor_id: string | null; proveedor_extranjero: string;
  transportista: string; moneda: "USD" | "PEN"; tipo_cambio: number; fecha_liquidacion: string | null;
  flete: number; seguro: number; pct_percepcion: number; gasto_handling: number; gasto_almacenaje: number;
  gasto_honorarios: number; gasto_flete_local: number; gasto_otros: number; integrado: boolean;
};
type Item = { id: string; insumo_id: string | null; descripcion: string; unidad: string; cantidad: number; precio_fob: number; pct_advalorem: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Integra una importación liquidada:
 * - Almacén: ingreso de cada equipo al costo unitario nacionalizado.
 * - Costos Directos (y CxP en Tesorería): proveedor exterior (CIF, en su moneda), Ad-Valorem (SUNAT) y gastos locales.
 * - Gastos Generales (sin obra, y CxP): IGV + IPM + percepción, que son crédito fiscal y no costo de la obra.
 */
export async function integrarImportacion(imp: Imp, items: Item[], proveedorNombre: string, tipoInsumo: (id: string | null) => string | undefined) {
  if (imp.integrado) throw new Error("Esta importación ya fue integrada.");
  if (!imp.proyecto_id) throw new Error("Elige una obra de destino antes de integrar (Almacén y Costos Directos se registran por obra).");
  if (!items.length) throw new Error("La importación no tiene equipos.");
  const fecha = imp.fecha_liquidacion ?? new Date().toISOString().slice(0, 10);
  const locales = Number(imp.gasto_handling) + Number(imp.gasto_almacenaje) + Number(imp.gasto_honorarios) + Number(imp.gasto_flete_local) + Number(imp.gasto_otros);
  const liq = liquidar(
    { moneda: imp.moneda, tipo_cambio: imp.tipo_cambio, flete: imp.flete, seguro: imp.seguro, pct_percepcion: imp.pct_percepcion, gastos_locales: locales },
    items.map((i) => ({ id: i.id, cantidad: i.cantidad, precio_fob: i.precio_fob, pct_advalorem: i.pct_advalorem })),
  );

  // Partida hoja: la que más usa el insumo en su APU; si no, la primera hoja.
  const { data: parts } = await apuDb.from("partidas").select("id,padre_id").eq("proyecto_id", imp.proyecto_id);
  const lista = (parts ?? []) as { id: string; padre_id: string | null }[];
  const hojas = lista.filter((p) => !lista.some((h) => h.padre_id === p.id)).map((p) => p.id);
  if (!hojas.length) throw new Error("La obra de destino no tiene partidas: crea al menos una antes de integrar.");
  const { data: comps } = await apuDb.from("apu_componentes").select("partida_id,insumo_id,cantidad").in("partida_id", hojas);
  const partidaDe = (insumoId: string | null) =>
    ((comps ?? []) as { partida_id: string; insumo_id: string; cantidad: number }[])
      .filter((x) => x.insumo_id === insumoId)
      .sort((a, b) => Number(b.cantidad) - Number(a.cantidad))[0]?.partida_id ?? hojas[0];
  const rubroDe = (id: string | null) => {
    const t = tipoInsumo(id);
    return t === "MAT" ? "Materiales" : t === "SC" ? "Subcontratos" : t === "MO" ? "Servicios" : "Equipos";
  };
  const partidaPrincipal = partidaDe(items[0]!.insumo_id);
  const base = {
    proyecto_id: imp.proyecto_id, comprobante: imp.codigo, fecha, condicion_pago: "Crédito", dias_credito: 0,
    fecha_vencimiento: fecha, estado_pago: "Pendiente", numero_operacion: "",
  };

  // 1) Almacén
  const { error: e1 } = await apuDb.from("movimientos_almacen").insert(
    items.map((i, k) => ({
      fecha, tipo: "Ingreso", proyecto_id: imp.proyecto_id, insumo_id: i.insumo_id, descripcion: i.descripcion,
      unidad: i.unidad, cantidad: Number(i.cantidad), costo_unitario: Math.round((liq.filas[k]?.unitario ?? 0) * 10000) / 10000,
      documento: imp.codigo, observacion: "Ingreso por importación (costo nacionalizado)",
    })),
  );
  if (e1) throw new Error(`Almacén: ${e1.message}`);

  // 2) Costos Directos
  const tc = liq.tc;
  const filas: Record<string, unknown>[] = items.map((i, k) => {
    const f = liq.filas[k]!;
    const cif = f.fob + f.flete + f.seguro;
    return {
      ...base, partida_id: partidaDe(i.insumo_id), rubro: rubroDe(i.insumo_id),
      descripcion: `${i.descripcion} (CIF importación)`, proveedor: proveedorNombre, proveedor_id: imp.proveedor_id,
      cantidad: Number(i.cantidad), precio_unitario: r2(cif / Number(i.cantidad)), monto: r2(cif),
      moneda: imp.moneda, tipo_cambio: tc, monto_soles: r2(f.cifPen),
    };
  });
  if (liq.advalorem > 0)
    filas.push({
      ...base, partida_id: partidaPrincipal, rubro: "Servicios", descripcion: `Ad-Valorem ${imp.codigo}`, proveedor: "SUNAT",
      proveedor_id: null, cantidad: 1, precio_unitario: r2(liq.advalorem), monto: r2(liq.advalorem), moneda: "PEN", tipo_cambio: 1, monto_soles: r2(liq.advalorem),
    });
  if (locales > 0)
    filas.push({
      ...base, partida_id: partidaPrincipal, rubro: "Servicios", descripcion: `Gastos locales de importación ${imp.codigo}`,
      proveedor: imp.transportista || "Courier / agente", proveedor_id: null, cantidad: 1, precio_unitario: r2(locales),
      monto: r2(locales), moneda: "PEN", tipo_cambio: 1, monto_soles: r2(locales),
    });
  const { error: e2 } = await apuDb.from("gastos_directos").insert(filas);
  if (e2) throw new Error(`Costos Directos: ${e2.message}`);

  // 3) Tributos que son crédito fiscal
  const credito = r2(liq.igv + liq.ipm + liq.percepcion);
  if (credito > 0) {
    const { error: e3 } = await apuDb.from("gastos_generales").insert({
      proyecto_id: null, categoria: "Crédito fiscal importación", descripcion: `IGV + IPM + Percepción ${imp.codigo}`,
      proveedor: "SUNAT", proveedor_id: null, monto: credito, moneda: "PEN", tipo_cambio: 1, monto_soles: credito,
      fecha, comprobante: imp.codigo, condicion_pago: "Crédito", dias_credito: 0, fecha_vencimiento: fecha,
      estado_pago: "Pendiente", numero_operacion: "",
    });
    if (e3) throw new Error(`Tributos: ${e3.message}`);
  }

  const { error: e4 } = await apuDb.from("importaciones")
    .update({ integrado: true, fecha_integracion: new Date().toISOString().slice(0, 10), estado: "Liquidado" })
    .eq("id", imp.id);
  if (e4) throw new Error(e4.message);
  return { costo: liq.costo, credito };
}

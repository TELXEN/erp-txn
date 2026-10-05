import { supabase } from "@/integrations/supabase/client";
import type { Item, ItemSunat, Libro, Estado } from "@/lib/sire-tipos";
const r2 = (n: number) => Math.round(n * 100) / 100;

export function rangoPeriodo(p: string) {
  const [y = 2026, m = 1] = p.split("-").map(Number);
  const fin = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { ini: `${p}-01`, fin };
}

export type DocErp = { clave: string; fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string; total: number; igv: number };

export async function cargarErp(libro: Libro, periodo: string): Promise<DocErp[]> {
  const { ini, fin } = rangoPeriodo(periodo);
  if (libro === "RVIE") {
    const { data } = await supabase.from("comprobantes_electronicos")
      .select("tipo_comprobante, serie, numero, fecha_emision, cliente_numero_documento, cliente_razon_social, total_soles, total, igv, estado_fiscal")
      .gte("fecha_emision", ini).lte("fecha_emision", fin).in("tipo_comprobante", ["01", "03", "07", "08"]);
    return (data ?? []).filter((c) => (c.estado_fiscal ?? "").toLowerCase() !== "borrador").map((c) => {
      const sn = c.numero ?? `${c.serie ?? ""}`;
      return { clave: `${c.tipo_comprobante}|${sn}`, fecha: c.fecha_emision, tipo: c.tipo_comprobante, serie_numero: sn, ruc: c.cliente_numero_documento ?? "", razon: c.cliente_razon_social ?? "", total: Number(c.total_soles ?? c.total ?? 0), igv: Number(c.igv ?? 0) };
    });
  }
  const sel = "id, fecha, comprobante, monto_soles, monto, proveedor, terceros:proveedor_id(numero_documento, razon_social)";
  const [gd, gg] = await Promise.all([
    supabase.from("gastos_directos").select(sel).gte("fecha", ini).lte("fecha", fin),
    supabase.from("gastos_generales").select(sel).gte("fecha", ini).lte("fecha", fin),
  ]);
  const filas = [...((gd.data ?? []) as any[]), ...((gg.data ?? []) as any[])].filter((g) => (g.comprobante ?? "").trim());
  const mapa = new Map<string, DocErp>();
  for (const g of filas) {
    const sn = String(g.comprobante).trim().toUpperCase();
    const total = Number(g.monto_soles ?? g.monto ?? 0);
    const prev = mapa.get(sn);
    if (prev) { prev.total = r2(prev.total + total); prev.igv = r2(prev.total - prev.total / 1.18); continue; }
    mapa.set(sn, { clave: `01|${sn}`, fecha: g.fecha, tipo: "01", serie_numero: sn, ruc: g.terceros?.numero_documento ?? "", razon: g.terceros?.razon_social ?? g.proveedor ?? "", total, igv: r2(total - total / 1.18) });
  }
  return [...mapa.values()];
}

/** Concilia la propuesta real de SUNAT contra los documentos del ERP. */
export function conciliar(sunat: ItemSunat[], erp: DocErp[]): Item[] {
  const porSn = new Map(erp.map((d) => [d.serie_numero.toUpperCase(), d]));
  return sunat.map((x) => {
    const d = porSn.get(x.serie_numero.toUpperCase());
    const totalPen = r2(x.moneda === "PEN" ? x.total : x.total * (x.tipo_cambio || 1));
    const estado: Estado = !d ? "faltante" : Math.abs(totalPen - d.total) > 0.01 ? "discrepancia" : "match";
    return {
      clave: x.clave, fecha: x.fecha, tipo: x.tipo, serie_numero: x.serie_numero, ruc: x.ruc, razon: x.razon,
      base: x.base, igv: x.igv, total_sunat: x.total, total_erp: d?.total ?? null, igv_erp: d?.igv ?? null, estado,
      vencimiento: x.vencimiento, no_gravado: x.no_gravado, isc: x.isc, otros: x.otros, moneda: x.moneda, tipo_cambio: x.tipo_cambio, raw: x.raw,
    };
  }).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}


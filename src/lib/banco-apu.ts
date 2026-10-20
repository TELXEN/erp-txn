import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { r2, r4, sumar2 } from "@/lib/decimal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dbBanco = supabase as unknown as { from: (t: string) => any };

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Recurso = any;
export type DetalleApu = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Bancos de recursos del APU: [columna en el detalle, tabla, etiqueta, tipo equivalente del maestro anterior]. */
export const BANCOS_RECURSO = [
  ["material_id", "materiales", "Materiales", "MAT"],
  ["mano_obra_id", "mano_obra", "Mano de Obra", "MO"],
  ["equipo_id", "equipos_herramientas", "Equipos/Herramientas", "EQ"],
  ["subcontrato_id", "subcontratos", "Subcontratos", "SC"],
] as const;

export type BancoTabla = (typeof BANCOS_RECURSO)[number][1];

export const useBancoTabla = (t: BancoTabla | "partidas_apu" | "partida_detalle" | "cotizacion_apu_detalle") =>
  useQuery({
    queryKey: ["banco_apu", t],
    queryFn: async () => {
      let q = dbBanco.from(t).select("*");
      if (t === "partida_detalle" || t === "cotizacion_apu_detalle") q = q.order("orden");
      const { data, error } = await q.order("created_at");
      if (error) throw error;
      return (data ?? []) as Recurso[];
    },
  });

/**
 * Renumera (10, 20, 30…) las filas de detalle APU en el orden dado y devuelve el nuevo orden por id.
 * Solo actualiza las filas cuyo orden cambia.
 */
export async function renumerarApu(tabla: "partida_detalle" | "cotizacion_apu_detalle", filas: { id: string; orden?: number | null }[]) {
  const mapa = new Map<string, number>();
  const cambios: Promise<unknown>[] = [];
  filas.forEach((f, i) => {
    const n = (i + 1) * 10;
    mapa.set(f.id, n);
    if (Number(f.orden) !== n) cambios.push(dbBanco.from(tabla).update({ orden: n }).eq("id", f.id));
  });
  await Promise.all(cambios);
  return mapa;
}

/** Partidas activas del Banco APU. */
export const usePartidasApu = () => {
  const q = useBancoTabla("partidas_apu");
  return { ...q, data: (q.data ?? []).filter((p) => p.estado === "activo") };
};

export type RecursosApu = {
  materiales: Recurso[];
  mano_obra: Recurso[];
  equipos_herramientas: Recurso[];
  subcontratos: Recurso[];
};

export function useRecursosApu(): RecursosApu {
  const { data: materiales = [] } = useBancoTabla("materiales");
  const { data: mano_obra = [] } = useBancoTabla("mano_obra");
  const { data: equipos_herramientas = [] } = useBancoTabla("equipos_herramientas");
  const { data: subcontratos = [] } = useBancoTabla("subcontratos");
  return { materiales, mano_obra, equipos_herramientas, subcontratos };
}

export type FilaCalculo = {
  d: DetalleApu;
  banco: string;
  tipo: string;
  recursoId: string;
  nombre: string;
  und: string;
  cu: number;
  cantidad: number;
  parcial: number;
  esPctMo?: boolean;
};

/**
 * Costo de una receta APU. MO y equipos H-M: parcial = cuadrilla × jornada × CU ÷ rendimiento.
 * Equipos «%»: porcentaje sobre el total de mano de obra. Materiales/subcontratos: cantidad × CU.
 */
export function costoReceta(
  detalles: DetalleApu[],
  recursos: RecursosApu,
  rendimiento: number,
  jornada = 8,
): { total: number; filas: FilaCalculo[] } {
  const rend = Number(rendimiento) || 1;
  const jor = Number(jornada) || 8;
  const filas: FilaCalculo[] = detalles.flatMap((d) => {
    const found = BANCOS_RECURSO.find(([c]) => d[c]);
    if (!found) return [];
    const [col, tabla, etiqueta, tipo] = found;
    const banco = (recursos[tabla as keyof RecursosApu] ?? []).find((x) => x.id === d[col]);
    // Copia fija de la cotización: si existe, manda sobre el banco.
    const fijo = d.precio_unitario !== undefined && d.precio_unitario !== null;
    const r = fijo
      ? { ...banco, descripcion: d.descripcion || banco?.descripcion, unidad: d.unidad || banco?.unidad, costo_hora: Number(d.precio_unitario), costo_unitario: Number(d.precio_unitario) }
      : banco;
    const q = Number(d.cantidad_o_cuadrilla) || 0;
    let cu = 0, parcial = 0, esPctMo = false;
    if (tabla === "mano_obra") {
      cu = Number(r?.costo_hora ?? 0);
      parcial = r2(r4((q * jor) / rend) * cu);
    } else if (tabla === "equipos_herramientas" && r?.unidad === "H-M") {
      cu = Number(r?.costo_unitario ?? 0);
      parcial = r2(r4((q * jor) / rend) * cu);
    } else if (tabla === "equipos_herramientas" && r?.unidad === "%") {
      cu = Number(r?.costo_hora ?? 0);
      esPctMo = true;
    } else {
      cu = Number(r?.costo_unitario ?? 0);
      parcial = r2(q * cu);
    }
    return { d, banco: etiqueta, tipo, recursoId: d[col] as string, nombre: r?.descripcion ?? "(no encontrado)", und: r?.unidad ?? "", cu, cantidad: q, parcial, esPctMo };
  });
  // Fusionar duplicados del mismo recurso (mismo tipo, recurso y precio): una fila con la cantidad sumada.
  const fusion = new Map<string, FilaCalculo>();
  for (const f of filas) {
    const clave = `${f.tipo}:${f.recursoId}:${f.cu}`;
    const ya = fusion.get(clave);
    if (ya) {
      ya.d = { ...ya.d, cantidad_o_cuadrilla: (Number(ya.d.cantidad_o_cuadrilla) || 0) + (Number(f.d.cantidad_o_cuadrilla) || 0) };
      ya.cantidad += f.cantidad;
      ya.parcial += f.parcial;
    } else fusion.set(clave, { ...f });
  }
  const filasU = [...fusion.values()];
  const totalMo = sumar2(filasU.filter((f) => f.tipo === "MO").map((f) => f.parcial));
  for (const f of filasU) if (f.esPctMo) f.parcial = r2((totalMo * f.cu * f.cantidad) / 100);
  return { total: sumar2(filasU.map((f) => f.parcial)), filas: filasU };
}

/** PU calculado de cada partida del banco (mapa id → costo total por unidad). */
export function useCostosPartidasApu() {
  const { data: partidas = [] } = useBancoTabla("partidas_apu");
  const { data: detalle = [] } = useBancoTabla("partida_detalle");
  const recursos = useRecursosApu();
  const mapa = new Map<string, number>();
  for (const p of partidas) {
    const propias = detalle.filter((d) => d.partida_padre_id === p.id);
    mapa.set(p.id, costoReceta(propias, recursos, Number(p.rendimiento_diario) || 1, 8).total);
  }
  return mapa;
}

export type PartidaCatalogo = {
  id: string;
  codigo: string;
  nombre: string;
  especialidad: string;
  categoria: string;
  marca: string;
  unidad: string;
  precio_unitario: number;
  activo: boolean;
  rendimiento: number;
};

/** Catálogo de partidas para cotizaciones: Banco APU con el P.U. calculado desde su receta. */
export function useCatalogoCotizacion(): PartidaCatalogo[] {
  const { data: partidas = [] } = usePartidasApu();
  const costos = useCostosPartidasApu();
  return partidas.map((p) => ({
    id: p.id,
    codigo: p.codigo_jerarquico ?? "",
    nombre: p.descripcion ?? "",
    especialidad: p.especialidad ?? "",
    categoria: "",
    marca: "",
    unidad: p.unidad ?? "und",
    precio_unitario: costos.get(p.id) ?? 0,
    activo: true,
    rendimiento: Number(p.rendimiento_diario ?? 1),
  }));
}

/** Fila de copia fija para cotizacion_apu_detalle. */
export type FilaCopiaApu = {
  material_id: string | null;
  mano_obra_id: string | null;
  equipo_id: string | null;
  subcontrato_id: string | null;
  cantidad_o_cuadrilla: number;
  codigo: string;
  descripcion: string;
  marca: string;
  unidad: string;
  tipo_recurso: string;
  precio_unitario: number;
};

/**
 * Aplana la receta de una partida del banco en filas con precio fijo en la
 * moneda indicada. `factor` convierte PEN → moneda (1 o 1/TC).
 */
export function aplanarReceta(
  partidaId: string,
  detalle: DetalleApu[],
  recursos: RecursosApu,
  factor: number,
): FilaCopiaApu[] {
  const salida: FilaCopiaApu[] = [];
  for (const d of detalle.filter((x) => x.partida_padre_id === partidaId)) {
    const found = BANCOS_RECURSO.find(([c]) => d[c]);
    if (!found) continue;
    const [col, tabla, , tipo] = found;
    const r = (recursos[tabla as keyof RecursosApu] ?? []).find((x) => x.id === d[col]);
    if (!r) continue;
    const q = Number(d.cantidad_o_cuadrilla) || 0;
    const horaria = tabla === "mano_obra" || (tabla === "equipos_herramientas" && r.unidad === "H-M");
    const pct = tabla === "equipos_herramientas" && r.unidad === "%";
    const fila: FilaCopiaApu = {
      material_id: null, mano_obra_id: null, equipo_id: null, subcontrato_id: null,
      [col]: r.id,
      cantidad_o_cuadrilla: q,
      codigo: r.codigo ?? "", descripcion: r.descripcion ?? "", marca: r.marca ?? "", unidad: r.unidad ?? "",
      tipo_recurso: tipo,
      precio_unitario: Math.round((tabla === "mano_obra" ? Number(r.costo_hora) : Number(r.costo_unitario)) * factor * 10000) / 10000,
    } as FilaCopiaApu;
    if (horaria) fila.cantidad_o_cuadrilla = q;
    if (pct) fila.precio_unitario = Number(r.costo_hora);
    salida.push(fila);
  }
  return salida;
}

/** Copia la receta del banco (copia fija) a una partida de cotización y devuelve su P.U. */
export async function copiarRecetaACotizacion(itemId: string, partidaApuId: string, factor: number) {
  const tablas = ["partidas_apu", "partida_detalle", "materiales", "mano_obra", "equipos_herramientas", "subcontratos"];
  const res = await Promise.all(tablas.map((t) => dbBanco.from(t).select("*")));
  const err = res.find((r: { error: unknown }) => r.error);
  if (err) throw err.error;
  const [partidas, detalle, materiales, mano_obra, equipos_herramientas, subcontratos] = res.map((r: { data: Recurso[] }) => r.data ?? []) as Recurso[][] as [Recurso[], Recurso[], Recurso[], Recurso[], Recurso[], Recurso[]];
  const recursos = { materiales, mano_obra, equipos_herramientas, subcontratos };
  const filas = aplanarReceta(partidaApuId, detalle, recursos, factor);
  const p = partidas.find((x: Recurso) => x.id === partidaApuId);
  const rend = Number(p?.rendimiento_diario) || 1;
  const { error: e1 } = await dbBanco.from("cotizacion_apu_detalle").delete().eq("cotizacion_item_id", itemId);
  if (e1) throw e1;
  if (filas.length) {
    const { error: e2 } = await dbBanco.from("cotizacion_apu_detalle").insert(filas.map((f, i) => ({ ...f, cotizacion_item_id: itemId, orden: (i + 1) * 10 })));
    if (e2) throw e2;
  }
  const pu = Math.round(costoReceta(filas, recursos, rend, 8).total * 10000) / 10000;
  return { pu, rendimiento: rend, filas: filas.length };
}

/** Siguiente código jerárquico de una rama: último 04.01.02 → 04.01.03. Sin partidas: NN.01.01. */
export function siguienteCodigoJerarquico(codigos: string[], prefijo: string): string {
  if (!prefijo) return "";
  const nums = (c: string) => c.split(".").map((s) => Number(s) || 0);
  const rama = codigos.filter((c) => c && (c === prefijo || c.startsWith(`${prefijo}.`)) && c !== prefijo);
  if (rama.length === 0) return `${prefijo}.01.01`;
  rama.sort((a, b) => {
    const x = nums(a), y = nums(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
    return 0;
  });
  const partes = rama[rama.length - 1]!.split(".");
  const ult = partes.length - 1;
  partes[ult] = String((Number(partes[ult]) || 0) + 1).padStart(Math.max(2, partes[ult]!.length), "0");
  return partes.join(".");
}

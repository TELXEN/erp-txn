import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await dbBanco.from(t).select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Recurso[];
    },
  });

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
 * Las subpartidas (solo en partida_detalle) se resuelven recursivamente con protección contra ciclos.
 */
export function costoReceta(
  detalles: DetalleApu[],
  recursos: RecursosApu,
  rendimiento: number,
  jornada = 8,
  partidas: Recurso[] = [],
  visitados = new Set<string>(),
  detalleCompleto?: DetalleApu[],
): { total: number; filas: FilaCalculo[] } {
  const rend = Number(rendimiento) || 1;
  const jor = Number(jornada) || 8;
  const filas: FilaCalculo[] = detalles.map((d) => {
    const found = BANCOS_RECURSO.find(([c]) => d[c]);
    if (!found) {
      // Subpartida (solo aplica al detalle del banco).
      const hijoId = d.subpartida_hijo_id as string;
      if (hijoId && !visitados.has(hijoId)) {
        const hijo = partidas.find((p) => p.id === hijoId);
        const detHijo = (detalleCompleto ?? []).filter((x) => x.partida_padre_id === hijoId);
        const sub = costoReceta(
          detHijo, recursos, Number(hijo?.rendimiento_diario) || 1, 8, partidas, new Set(visitados).add(hijoId), detalleCompleto,
        );
        const q = Number(d.cantidad_o_cuadrilla) || 0;
        return { d, banco: "Subpartidas", tipo: "SUB", recursoId: hijoId, nombre: hijo?.descripcion ?? "(no encontrada)", und: hijo?.unidad ?? "", cu: sub.total, cantidad: q, parcial: q * sub.total };
      }
      return { d, banco: "Subpartidas", tipo: "SUB", recursoId: hijoId, nombre: "(ciclo)", und: "", cu: 0, cantidad: 0, parcial: 0 };
    }
    const [col, tabla, etiqueta, tipo] = found;
    const r = (recursos[tabla as keyof RecursosApu] ?? []).find((x) => x.id === d[col]);
    const q = Number(d.cantidad_o_cuadrilla) || 0;
    let cu = 0, parcial = 0, esPctMo = false;
    if (tabla === "mano_obra") {
      cu = Number(r?.costo_hora ?? 0);
      parcial = (q * jor * cu) / rend;
    } else if (tabla === "equipos_herramientas" && r?.unidad === "H-M") {
      cu = Number(r?.costo_unitario ?? 0);
      parcial = (q * jor * cu) / rend;
    } else if (tabla === "equipos_herramientas" && r?.unidad === "%") {
      cu = Number(r?.costo_hora ?? 0);
      esPctMo = true;
    } else {
      cu = Number(r?.costo_unitario ?? 0);
      parcial = q * cu;
    }
    return { d, banco: etiqueta, tipo, recursoId: d[col] as string, nombre: r?.descripcion ?? "(no encontrado)", und: r?.unidad ?? "", cu, cantidad: q, parcial, esPctMo };
  });
  const totalMo = filas.filter((f) => f.tipo === "MO").reduce((s, f) => s + f.parcial, 0);
  for (const f of filas) if (f.esPctMo) f.parcial = (totalMo * f.cu * f.cantidad) / 100;
  return { total: filas.reduce((s, f) => s + f.parcial, 0), filas };
}

/** PU calculado de cada partida del banco (mapa id → costo total por unidad). */
export function useCostosPartidasApu() {
  const { data: partidas = [] } = useBancoTabla("partidas_apu");
  const { data: detalle = [] } = useBancoTabla("partida_detalle");
  const recursos = useRecursosApu();
  const mapa = new Map<string, number>();
  for (const p of partidas) {
    const propias = detalle.filter((d) => d.partida_padre_id === p.id);
    mapa.set(p.id, costoReceta(propias, recursos, Number(p.rendimiento_diario) || 1, 8, partidas, new Set([p.id]), detalle).total);
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoInsumo = "MO" | "MAT" | "EQ" | "HT" | "SC";
export const TIPOS_INSUMO: [TipoInsumo, string][] = [
  ["MO", "Mano de obra"],
  ["MAT", "Materiales"],
  ["EQ", "Equipos y maquinaria"],
  ["HT", "Herramientas menores"],
  ["SC", "Subcontratos / Servicios"],
];
export const nombreTipo = (t: string) => TIPOS_INSUMO.find(([k]) => k === t)?.[1] ?? t;

export type Insumo = {
  id: string;
  tipo: TipoInsumo;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
  margen_pct: number;
  activo: boolean;
};

/** Precio de venta = precio de compra + margen % sobre compra. */
export const precioVenta = (i: Pick<Insumo, "precio" | "margen_pct">) =>
  Number(i.precio) * (1 + Number(i.margen_pct || 0) / 100);

export type ComponenteApu = {
  id: string;
  partida_maestra_id: string;
  insumo_id: string;
  cuadrilla: number;
  cantidad: number;
};

const db = supabase as unknown as { from: (t: string) => any };

export const useInsumos = () =>
  useQuery({
    queryKey: ["insumos"],
    queryFn: async () => {
      const { data, error } = await db.from("insumos").select("*").order("tipo").order("nombre");
      if (error) throw error;
      return (data ?? []) as Insumo[];
    },
  });

export type OrigenApu = "maestra" | "obra" | "cotizacion";
export const ORIGEN_APU: Record<OrigenApu, { columna: string; tabla: string }> = {
  maestra: { columna: "partida_maestra_id", tabla: "partidas_maestras" },
  obra: { columna: "partida_id", tabla: "partidas" },
  cotizacion: { columna: "cotizacion_item_id", tabla: "cotizacion_items" },
};

export const useComponentesApu = (partidaId: string | null, origen: OrigenApu = "maestra") =>
  useQuery({
    queryKey: ["apu_componentes", partidaId],
    enabled: !!partidaId,
    queryFn: async () => {
      const { data, error } = await db
        .from("apu_componentes")
        .select("*")
        .eq(ORIGEN_APU[origen].columna, partidaId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ComponenteApu[];
    },
  });

export const apuDb = db;

/** Cantidad por unidad: con cuadrilla → cuadrilla × jornada / rendimiento; sin cuadrilla → cantidad directa. */
export function cantidadComponente(c: ComponenteApu, rendimiento: number, jornada: number) {
  if (Number(c.cuadrilla) > 0 && Number(rendimiento) > 0)
    return (Number(c.cuadrilla) * Number(jornada)) / Number(rendimiento);
  return Number(c.cantidad);
}

export function calcularApu(
  componentes: ComponenteApu[],
  insumos: Insumo[],
  rendimiento: number,
  jornada: number,
  pctHerramientas: number,
) {
  const tot: Record<TipoInsumo, number> = { MO: 0, MAT: 0, EQ: 0, HT: 0, SC: 0 };
  const filas = componentes.map((c) => {
    const ins = insumos.find((i) => i.id === c.insumo_id);
    const cantidad = cantidadComponente(c, rendimiento, jornada);
    const parcial = cantidad * (ins ? precioVenta(ins) : 0);
    if (ins) tot[ins.tipo] += parcial;
    return { c, ins, cantidad, parcial };
  });
  const herramientas = (tot.MO * Number(pctHerramientas || 0)) / 100;
  tot.EQ += herramientas;
  const pu = Math.round((tot.MO + tot.MAT + tot.EQ + tot.SC) * 100) / 100;
  return { filas, tot, herramientas, pu };
}

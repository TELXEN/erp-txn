import { useQuery } from "@tanstack/react-query";
import { apuDb, cantidadComponente, type ComponenteApu } from "@/lib/apu";
import { dbBanco } from "@/lib/banco-apu";

/** Motivos de salida que cuentan como material consumido en una partida. */
export const MOTIVOS_CONSUMO = ["Consumo", "Vale de salida"];

export type EstadoConsumo = { presupuestado: number; consumido: number; tras: number; exceso: number; sobrecosto: boolean };

/** Compara el material consumido (S/) de una partida con su material presupuestado en el APU. Nunca bloquea: solo avisa. */
export function estadoConsumoPartida(presupuestado: number, consumido: number, nuevo = 0): EstadoConsumo {
  const r = (n: number) => Math.round(n * 100) / 100;
  const tras = r(consumido + nuevo);
  const exceso = r(Math.max(0, tras - presupuestado));
  return { presupuestado: r(presupuestado), consumido: r(consumido), tras, exceso, sobrecosto: exceso > 0 };
}

type Mov = { tipo: string; motivo: string | null; partida_id?: string | null; cantidad: number | string; costo_unitario: number | string };
/** Σ importe de consumos y vales por partida. */
export function consumidoPorPartida(movs: Mov[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of movs) {
    if (x.tipo !== "Salida" || !x.partida_id || !MOTIVOS_CONSUMO.includes(x.motivo ?? "")) continue;
    m.set(x.partida_id, (m.get(x.partida_id) ?? 0) + Number(x.cantidad) * Number(x.costo_unitario));
  }
  return m;
}

type PartidaBase = { id: string; metrado: number | null; rendimiento?: number | null; jornada?: number | null };
/** Material presupuestado (S/) por partida: metrado × Σ cantidad × precio de los materiales de su APU (anterior y Banco APU). */
export function useMaterialPresupuestado(partidas: PartidaBase[], insumos: { id: string; tipo: string; precio: number }[]) {
  const ids = partidas.map((p) => p.id);
  const { data } = useQuery({
    queryKey: ["material-presupuestado", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [c, d] = await Promise.all([
        apuDb.from("apu_componentes").select("*").in("partida_id", ids),
        dbBanco.from("partida_detalle").select("partida_obra_id,material_id,cantidad_o_cuadrilla").in("partida_obra_id", ids).not("material_id", "is", null),
      ]);
      const matIds = [...new Set(((d.data ?? []) as { material_id: string }[]).map((x) => x.material_id))];
      const mats = matIds.length ? ((await dbBanco.from("materiales").select("id,precio_base").in("id", matIds)).data ?? []) : [];
      return { comps: (c.data ?? []) as (ComponenteApu & { partida_id: string })[], det: (d.data ?? []) as { partida_obra_id: string; material_id: string; cantidad_o_cuadrilla: number }[], mats: mats as { id: string; precio_base: number }[] };
    },
  });
  const mapa = new Map<string, number>();
  if (!data) return mapa;
  for (const p of partidas) {
    const met = Number(p.metrado ?? 0);
    let unit = 0;
    for (const c of data.comps.filter((x) => x.partida_id === p.id)) {
      const ins = insumos.find((i) => i.id === c.insumo_id);
      if (!ins || ins.tipo !== "MAT") continue;
      unit += cantidadComponente(c, Number(p.rendimiento) || 1, Number(p.jornada) || 8) * Number(ins.precio);
    }
    for (const x of data.det.filter((y) => y.partida_obra_id === p.id)) {
      unit += Number(x.cantidad_o_cuadrilla) * Number(data.mats.find((m) => m.id === x.material_id)?.precio_base ?? 0);
    }
    mapa.set(p.id, Math.round(unit * met * 100) / 100);
  }
  return mapa;
}

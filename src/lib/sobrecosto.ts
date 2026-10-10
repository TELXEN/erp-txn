import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { leerTodo } from "@/lib/datos";
import { precioVenta, useInsumos, useMargenesInsumo } from "@/lib/apu";
import { useCostoObras } from "@/lib/costo-obra";

const db = supabase as unknown as { from: (t: string) => any };

/** Regla del candado: costo acumulado + compra ≤ presupuesto × (avance/100 + tolerancia/100). */
export function limiteCompra(presupuesto: number, avancePct: number, toleranciaPct: number) {
  return Number(presupuesto || 0) * (Number(avancePct || 0) / 100 + Number(toleranciaPct || 0) / 100);
}
export function compraPermitida(acumulado: number, nueva: number, presupuesto: number, avancePct: number, toleranciaPct: number) {
  return acumulado + nueva <= limiteCompra(presupuesto, avancePct, toleranciaPct) + 0.005;
}

export const esSobrecosto = (msg?: string | null) => !!msg && msg.includes("SOBRECOSTO|");
export const textoSobrecosto = (msg: string) => msg.replace(/^.*SOBRECOSTO\|/, "");

export const useToleranciaAvance = () =>
  useQuery({
    queryKey: ["control_sobrecosto"],
    queryFn: async () => {
      const { data } = await db.from("control_sobrecosto").select("tolerancia_pct").maybeSingle();
      return Number(data?.tolerancia_pct ?? 15);
    },
  });

export type Solicitud = {
  id: string;
  proyecto_id: string;
  partida_id: string | null;
  rubro: string;
  descripcion: string;
  proveedor: string;
  monto: number;
  exceso: number;
  motivo: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada" | "Usada";
  solicitado_por: string | null;
  resuelto_en: string | null;
  vence_en: string | null;
  created_at: string;
};

export const useSolicitudesDesbloqueo = () =>
  useQuery({
    queryKey: ["solicitudes_desbloqueo"],
    queryFn: async () => {
      const { data, error } = await db.from("solicitudes_desbloqueo").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as Solicitud[];
    },
  });

export async function solicitarDesbloqueo(s: Pick<Solicitud, "proyecto_id" | "partida_id" | "rubro" | "descripcion" | "proveedor" | "monto" | "motivo">) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await db.from("solicitudes_desbloqueo").insert({ ...s, solicitado_por: u.user?.id, estado: "Pendiente" });
  return error?.message ?? null;
}

/* ---------- Desglose del costo directo por rubro ---------- */

export const RUBROS_CD = [
  { clave: "MAT", nombre: "Materiales" },
  { clave: "MO", nombre: "Mano de obra" },
  { clave: "EQ", nombre: "Herramientas y equipos" },
  { clave: "HT", nombre: "Herramientas manuales" },
  { clave: "SC", nombre: "Subcontratos" },
] as const;
export type ClaveRubro = (typeof RUBROS_CD)[number]["clave"];
export type FilaDesglose = { clave: ClaveRubro; nombre: string; base: number; real: number };

type PartidaApu = { id: string; metrado: number | null; rendimiento: number | null; jornada: number | null; padre_id: string | null };
type Comp = { partida_id: string; insumo_id: string; cuadrilla: number; cantidad: number };

export function useDesgloseCd(proyectoId?: string | null) {
  const { data: insumos = [] } = useInsumos();
  const { data: margenes } = useMargenesInsumo();
  const { costoDe } = useCostoObras();
  const { data } = useQuery({
    queryKey: ["desglose_cd", proyectoId],
    enabled: !!proyectoId,
    queryFn: async () => {
      const partidas = await leerTodo<PartidaApu>(() =>
        db.from("partidas").select("id,metrado,rendimiento,jornada,padre_id").eq("proyecto_id", proyectoId).order("id"),
      );
      const ids = partidas.map((p) => p.id);
      const comps: Comp[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data: c } = await db.from("apu_componentes").select("partida_id,insumo_id,cuadrilla,cantidad").in("partida_id", ids.slice(i, i + 200));
        comps.push(...((c ?? []) as Comp[]));
      }
      return { partidas, comps };
    },
  });

  return useMemo<FilaDesglose[]>(() => {
    const base: Record<string, number> = { MAT: 0, MO: 0, EQ: 0, HT: 0, SC: 0 };
    if (data) {
      const ins = new Map(insumos.map((i) => [i.id, i]));
      const part = new Map(data.partidas.map((p) => [p.id, p]));
      data.comps.forEach((c) => {
        const p = part.get(c.partida_id);
        const i = ins.get(c.insumo_id);
        if (!p || !i || i.tipo === "HT") return;
        const rend = Number(p.rendimiento) || 0;
        const cant = Number(c.cuadrilla) > 0 && rend > 0 ? (Number(c.cuadrilla) * (Number(p.jornada) || 8)) / rend : Number(c.cantidad);
        const t = base[i.tipo] !== undefined ? i.tipo : "MAT";
        base[t] += Number(p.metrado || 0) * cant * precioVenta(i);
      });
    }
    base.HT = (base.MO * Number(margenes?.HT ?? 0)) / 100;
    const c = proyectoId ? costoDe(proyectoId) : null;
    const real: Record<string, number> = {
      MAT: c?.materiales ?? 0,
      MO: (c?.mod ?? 0) + (c?.honorarios ?? 0),
      EQ: c?.equipos ?? 0,
      HT: c?.herramientas ?? 0,
      SC: c?.subcontratos ?? 0,
    };
    return RUBROS_CD.map((r) => ({ clave: r.clave, nombre: r.nombre, base: base[r.clave], real: real[r.clave] }));
  }, [data, insumos, margenes, proyectoId, costoDe]);
}

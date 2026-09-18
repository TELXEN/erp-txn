import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function pedir<T>(tabla: string, columnas = "*", orden?: { col: string; asc?: boolean }) {
  let q = supabase.from(tabla as never).select(columnas);
  if (orden) q = q.order(orden.col, { ascending: orden.asc ?? true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export type Proyecto = {
  id: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: "En Ejecucion" | "Finalizado";
};

export type Partida = {
  id: string;
  proyecto_id: string;
  nombre: string;
  especialidad: string;
  presupuesto_inicial: number;
  avance_pct: number;
};

export type Trabajador = {
  id: string;
  nombre: string;
  categoria: "Operario" | "Oficial" | "Peon";
  jornal_diario: number;
  activo: boolean;
};

export type Tareo = {
  id: string;
  fecha: string;
  trabajador_id: string;
  proyecto_id: string;
  asistencia: number;
  costo_soles: number;
};

export type GastoDirecto = {
  id: string;
  proyecto_id: string;
  partida_id: string;
  descripcion: string;
  proveedor: string;
  monto: number;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  monto_soles: number;
  fecha: string;
};

export type GastoGeneral = {
  id: string;
  descripcion: string;
  proveedor: string;
  monto: number;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  monto_soles: number;
  fecha: string;
};

export type Venta = {
  id: string;
  proyecto_id: string;
  concepto: string;
  monto: number;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  monto_soles: number;
  numero_factura: string;
  fecha_pago: string | null;
  estado: "Pagado" | "Pendiente de Pago";
};

export const useProyectos = () =>
  useQuery({
    queryKey: ["proyectos"],
    queryFn: () => pedir<Proyecto>("proyectos", "*", { col: "nombre" }),
  });

export const usePartidas = () =>
  useQuery({
    queryKey: ["partidas"],
    queryFn: () => pedir<Partida>("partidas", "*", { col: "especialidad" }),
  });

export const useTrabajadores = () =>
  useQuery({
    queryKey: ["trabajadores"],
    queryFn: () => pedir<Trabajador>("trabajadores", "*", { col: "nombre" }),
  });

export const useTareos = () =>
  useQuery({
    queryKey: ["tareos"],
    queryFn: () => pedir<Tareo>("tareos", "*", { col: "fecha", asc: false }),
  });

export const useGastosDirectos = () =>
  useQuery({
    queryKey: ["gastos_directos"],
    queryFn: () => pedir<GastoDirecto>("gastos_directos", "*", { col: "fecha", asc: false }),
  });

export const useGastosGenerales = () =>
  useQuery({
    queryKey: ["gastos_generales"],
    queryFn: () => pedir<GastoGeneral>("gastos_generales", "*", { col: "fecha", asc: false }),
  });

export const useVentas = () =>
  useQuery({
    queryKey: ["ventas"],
    queryFn: () => pedir<Venta>("ventas", "*", { col: "created_at", asc: false }),
  });

export function agruparPorEspecialidad(partidas: Partida[]) {
  const mapa = new Map<string, Partida[]>();
  partidas.forEach((p) => {
    const lista = mapa.get(p.especialidad) ?? [];
    lista.push(p);
    mapa.set(p.especialidad, lista);
  });
  return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function costoRealPartida(partidaId: string, tareos: Tareo[], gastos: GastoDirecto[]) {
  const mano = tareos.filter((t) => t.partida_id === partidaId).reduce((s, t) => s + Number(t.costo_soles), 0);
  const compras = gastos.filter((g) => g.partida_id === partidaId).reduce((s, g) => s + Number(g.monto_soles), 0);
  return mano + compras;
}

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
  dni: string;
  nombre: string;
  cargo: string;
  categoria: "Operario" | "Oficial" | "Peon";
  jornal_diario: number;
  numero_cuenta: string;
  cci: string;
  banco: string;
  numero_celular: string;
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

export function agruparPorProyectoYEspecialidad(
  partidas: Partida[],
  nombreProyecto: (id: string) => string,
) {
  const porProyecto = new Map<string, Map<string, Partida[]>>();
  partidas.forEach((p) => {
    const proyecto = nombreProyecto(p.proyecto_id);
    let porEspecialidad = porProyecto.get(proyecto);
    if (!porEspecialidad) {
      porEspecialidad = new Map<string, Partida[]>();
      porProyecto.set(proyecto, porEspecialidad);
    }
    const lista = porEspecialidad.get(p.especialidad) ?? [];
    lista.push(p);
    porEspecialidad.set(p.especialidad, lista);
  });
  return [...porProyecto.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([proyecto, porEspecialidad]) => ({
      proyecto,
      grupos: [...porEspecialidad.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    }));
}

export function costoRealPartida(partidaId: string, gastos: GastoDirecto[]) {
  return gastos.filter((g) => g.partida_id === partidaId).reduce((s, g) => s + Number(g.monto_soles), 0);
}

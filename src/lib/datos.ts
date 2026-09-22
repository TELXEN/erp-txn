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
  situacion: string;
  prioridad: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type Partida = {
  id: string;
  proyecto_id: string;
  nombre: string;
  especialidad: string;
  presupuesto_inicial: number;
  avance_pct: number;
  situacion: string;
  prioridad: string;
  tipo_presupuesto: string;
};

export type TipoPresupuesto = {
  id: string;
  nombre: string;
  es_contractual: boolean;
  orden: number;
  activo: boolean;
};

export type ClasificacionCargo = "Directo" | "Indirecto";

export type Cargo = {
  id: string;
  nombre: string;
  clasificacion: ClasificacionCargo;
  orden: number;
  activo: boolean;
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

export type Tercero = {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  es_cliente: boolean;
  es_proveedor: boolean;
  direccion: string;
  telefono: string;
  email: string;
  condicion_pago: string;
  activo: boolean;
};

export const RUBROS_COSTO = ["Materiales", "Subcontratos", "Equipos", "Servicios"] as const;
export type RubroCosto = (typeof RUBROS_COSTO)[number];

export type GastoDirecto = {
  id: string;
  proyecto_id: string;
  partida_id: string;
  descripcion: string;
  proveedor: string;
  proveedor_id: string | null;
  monto: number;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  monto_soles: number;
  fecha: string;
  rubro: RubroCosto;
};


export type GastoGeneral = {
  id: string;
  proyecto_id: string | null;
  descripcion: string;
  proveedor: string;
  proveedor_id: string | null;
  monto: number;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  monto_soles: number;
  fecha: string;
};

export type Venta = {
  id: string;
  proyecto_id: string;
  cliente_id: string | null;
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

export const useCargos = () =>
  useQuery({
    queryKey: ["cargos"],
    queryFn: () => pedir<Cargo>("cargos", "*", { col: "orden" }),
  });

export function clasificacionDeCargo(cargo: string, cargos: Cargo[]): ClasificacionCargo {
  return cargos.find((c) => c.nombre === cargo)?.clasificacion ?? "Directo";
}

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

export const useTerceros = () =>
  useQuery({
    queryKey: ["terceros"],
    queryFn: () => pedir<Tercero>("terceros", "*", { col: "razon_social" }),
  });

export const useVentas = () =>
  useQuery({
    queryKey: ["ventas"],
    queryFn: () => pedir<Venta>("ventas", "*", { col: "created_at", asc: false }),
  });

export const useTiposPresupuesto = () =>
  useQuery({
    queryKey: ["tipos_presupuesto"],
    queryFn: () => pedir<TipoPresupuesto>("tipos_presupuesto", "*", { col: "orden" }),
  });

export function esContractual(tipo: string, tipos: TipoPresupuesto[]) {
  const encontrado = tipos.find((t) => t.nombre === tipo);
  return encontrado ? encontrado.es_contractual : tipo === "Contractual";
}

export function resumenPresupuesto(partidas: Partida[], tipos: TipoPresupuesto[]) {
  let contractual = 0;
  let adicionales = 0;
  partidas.forEach((p) => {
    const monto = Number(p.presupuesto_inicial);
    if (esContractual(p.tipo_presupuesto ?? "Contractual", tipos)) contractual += monto;
    else adicionales += monto;
  });
  return { contractual, adicionales, vigente: contractual + adicionales };
}

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

export function presupuestoProyecto(proyectoId: string, partidas: Partida[]) {
  return partidas
    .filter((p) => p.proyecto_id === proyectoId)
    .reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
}

export function costoRealProyecto(
  proyectoId: string,
  gastosDirectos: GastoDirecto[],
  tareos: Tareo[],
  gastosGenerales: GastoGeneral[],
) {
  const directos = gastosDirectos
    .filter((g) => g.proyecto_id === proyectoId)
    .reduce((s, g) => s + Number(g.monto_soles), 0);
  const manoObra = tareos
    .filter((t) => t.proyecto_id === proyectoId)
    .reduce((s, t) => s + Number(t.costo_soles), 0);
  const generales = gastosGenerales
    .filter((g) => g.proyecto_id === proyectoId)
    .reduce((s, g) => s + Number(g.monto_soles), 0);
  return directos + manoObra + generales;
}

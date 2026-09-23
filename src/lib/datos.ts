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
  codigo: string | null;
  responsable_id: string | null;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: "En Ejecucion" | "Finalizado";
  situacion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  pct_gastos_generales: number;
  pct_utilidad: number;
};

/** Estructura de oferta: CD neto + GG (% del CD) + Utilidad (% del CD). */
export function estructuraOferta(costoDirecto: number, pctGG: number, pctUtilidad: number) {
  const gastosGenerales = (costoDirecto * Number(pctGG || 0)) / 100;
  const utilidad = (costoDirecto * Number(pctUtilidad || 0)) / 100;
  return {
    costoDirecto,
    gastosGenerales,
    utilidad,
    ofertado: costoDirecto + gastosGenerales + utilidad,
  };
}

export type Partida = {
  id: string;
  proyecto_id: string;
  codigo: string;
  nombre: string;
  especialidad: string;
  presupuesto_inicial: number;
  avance_pct: number;
  situacion: string;
  prioridad: string;
  tipo_presupuesto: string;
  aplica_gg_utilidad: boolean;
  aplica_gg: boolean;
  aplica_utilidad: boolean;
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
  caja_chica_id: string | null;
};

export type CajaChica = {
  id: string;
  proyecto_id: string;
  responsable_id: string;
  motivo: string;
  monto_entregado: number;
  fecha_entrega: string;
  fecha_liquidacion: string | null;
  estado: "Abierta" | "Liquidada";
  observacion: string;
};


export type CategoriaGastoGeneral = {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
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
  categoria: string;
  caja_chica_id: string | null;
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

export const useCategoriasGastoGeneral = () =>
  useQuery({
    queryKey: ["categorias_gasto_general"],
    queryFn: () => pedir<CategoriaGastoGeneral>("categorias_gasto_general", "*", { col: "orden" }),
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

export const useCajasChicas = () =>
  useQuery({
    queryKey: ["cajas_chicas"],
    queryFn: () => pedir<CajaChica>("cajas_chicas", "*", { col: "fecha_entrega", asc: false }),
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

/** Indica si una partida cobra gastos generales. */
export function cobraGG(p: Partida, tipos: TipoPresupuesto[]) {
  if (esContractual(p.tipo_presupuesto ?? "Contractual", tipos)) return true;
  if (p.aplica_gg !== undefined && p.aplica_gg !== null) return p.aplica_gg !== false;
  return p.aplica_gg_utilidad !== false;
}

/** Indica si una partida cobra utilidad. */
export function cobraUtilidad(p: Partida, tipos: TipoPresupuesto[]) {
  if (esContractual(p.tipo_presupuesto ?? "Contractual", tipos)) return true;
  if (p.aplica_utilidad !== undefined && p.aplica_utilidad !== null) return p.aplica_utilidad !== false;
  return p.aplica_gg_utilidad !== false;
}

/**
 * Oferta de un proyecto a partir de sus partidas.
 * Las contractuales siempre llevan GG y utilidad; las adicionales llevan
 * cada recargo de forma independiente.
 */
export function ofertaProyecto(
  partidas: Partida[],
  tipos: TipoPresupuesto[],
  pctGG: number,
  pctUtilidad: number,
) {
  let costoDirecto = 0;
  let baseGG = 0;
  let baseUtilidad = 0;
  let sinRecargo = 0;
  partidas.forEach((p) => {
    const monto = Number(p.presupuesto_inicial);
    costoDirecto += monto;
    const gg = cobraGG(p, tipos);
    const ut = cobraUtilidad(p, tipos);
    if (gg) baseGG += monto;
    if (ut) baseUtilidad += monto;
    if (!gg && !ut) sinRecargo += monto;
  });
  const gastosGenerales = (baseGG * Number(pctGG || 0)) / 100;
  const utilidad = (baseUtilidad * Number(pctUtilidad || 0)) / 100;
  return {
    costoDirecto,
    baseGG,
    baseUtilidad,
    baseRecargo: baseGG,
    sinRecargo,
    gastosGenerales,
    utilidad,
    ofertado: costoDirecto + gastosGenerales + utilidad,
  };
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

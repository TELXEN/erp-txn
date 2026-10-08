import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRIORIDADES, SITUACIONES } from "@/lib/configuracion";

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
  avance_programado_pct: number | null;
  fecha_corte_programado: string | null;
  periodicidad_cronograma?: "dia" | "semana" | "quincena" | "mes";
  pct_gastos_generales: number;
  pct_utilidad: number;
  archivado_en?: string | null;
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
  categoria: string;
  marca?: string;
  unidad: string;
  metrado: number;
  precio_unitario: number;
  presupuesto_inicial: number;
  avance_pct: number;
  situacion: string;
  prioridad: string;
  tipo_presupuesto: string;
  aplica_gg_utilidad: boolean;
  aplica_gg: boolean;
  aplica_utilidad: boolean;
  padre_id?: string | null;
  rendimiento?: number;
  jornada?: number;
  pct_herramientas?: number;
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
  tipo_contratacion: string;
  regimen_laboral: string;
  sistema_pensiones: string;
  cuspp: string;
  fecha_ingreso: string | null;
  sueldo_mensual: number;
  asignacion_familiar: boolean;
  suspension_cuarta: boolean;
  fecha_cese: string | null;
};

export type Tareo = {
  id: string;
  fecha: string;
  trabajador_id: string;
  proyecto_id: string;
  asistencia: number;
  costo_soles: number;
  tipo?: string;
  horas?: number;
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
  contacto: string;
  celular_contacto: string;
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
  banco_id: string | null;
  numero_operacion: string;
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

export type EstadoProyecto = { id: string; nombre: string; orden: number; activo: boolean };

export const useEstadosProyecto = () =>
  useQuery({
    queryKey: ["estados_proyecto"],
    queryFn: () => pedir<EstadoProyecto>("estados_proyecto", "*", { col: "orden" }),
  });

/** Nombres de estados de proyecto con respaldo en la lista base si la tabla está vacía. */
export function nombresEstados(estados: EstadoProyecto[] | undefined) {
  return estados && estados.length > 0 ? estados.map((e) => e.nombre) : SITUACIONES;
}

export type PrioridadItem = { id: string; nombre: string; orden: number; activo: boolean };

export type MarcaItem = { id: string; nombre: string; orden: number; activo: boolean };

export const useMarcas = () =>
  useQuery({
    queryKey: ["marcas"],
    queryFn: () => pedir<MarcaItem>("marcas", "*", { col: "nombre" }),
  });

export const usePrioridades = () =>
  useQuery({
    queryKey: ["prioridades"],
    queryFn: () => pedir<PrioridadItem>("prioridades", "*", { col: "orden" }),
  });

/** Nombres de prioridades con respaldo en la lista base si la tabla está vacía. */
export function nombresPrioridades(lista: PrioridadItem[] | undefined): string[] {
  return lista && lista.length > 0 ? lista.map((e) => e.nombre) : PRIORIDADES;
}

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
  tareoVehiculos: { proyecto_id: string; costo_soles: number }[] = [],
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
  const movilidad = tareoVehiculos
    .filter((t) => t.proyecto_id === proyectoId)
    .reduce((s, t) => s + Number(t.costo_soles), 0);
  return directos + manoObra + generales + movilidad;
}

export type Periodicidad = "dia" | "semana" | "quincena" | "mes";

export const PERIODICIDADES: { valor: Periodicidad; nombre: string }[] = [
  { valor: "dia", nombre: "Días" },
  { valor: "semana", nombre: "Semanas" },
  { valor: "quincena", nombre: "Quincenas" },
  { valor: "mes", nombre: "Meses" },
];

export type CronogramaPartida = {
  id: string;
  partida_id: string;
  anio: number;
  mes: number;
  pct: number;
  periodicidad: Periodicidad;
  fecha_inicio: string;
};

export const useCronograma = () =>
  useQuery({
    queryKey: ["cronograma_partidas"],
    queryFn: () => pedir<CronogramaPartida>("cronograma_partidas", "*"),
  });

/** Clave año-mes comparable: 2026*12+mes */
export const claveMes = (anio: number, mes: number) => anio * 12 + mes;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hoyISO = () => iso(new Date());

export type PeriodoCronograma = { inicio: string; fin: string; etiqueta: string; corta: string };

const MES3 = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Genera las columnas del cronograma entre inicio y fin según la periodicidad. */
export function generarPeriodos(inicio: string | null, fin: string | null, per: Periodicidad): PeriodoCronograma[] {
  const a = inicio ? new Date(inicio + "T00:00:00") : new Date();
  a.setHours(0, 0, 0, 0);
  const porDefecto = { dia: 14, semana: 42, quincena: 90, mes: 180 }[per];
  let b = fin ? new Date(fin + "T00:00:00") : new Date(a.getTime() + porDefecto * 86400000);
  if (b < a) b = new Date(a);
  const max = { dia: 120, semana: 104, quincena: 72, mes: 36 }[per];
  const lista: PeriodoCronograma[] = [];
  let cur = new Date(a);
  let n = 1;
  while (cur <= b && lista.length < max) {
    let sig: Date;
    let etiqueta: string;
    let corta: string;
    if (per === "dia") {
      sig = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      etiqueta = `Día ${n}`;
      corta = `${cur.getDate()} ${MES3[cur.getMonth()]}`;
    } else if (per === "semana") {
      sig = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
      etiqueta = `Sem ${n}`;
      corta = `${cur.getDate()} ${MES3[cur.getMonth()]}`;
    } else if (per === "quincena") {
      const primera = cur.getDate() <= 15;
      sig = primera ? new Date(cur.getFullYear(), cur.getMonth(), 16) : new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      etiqueta = `${primera ? "Q1" : "Q2"} ${MES3[cur.getMonth()]}`;
      corta = String(cur.getFullYear()).slice(2);
    } else {
      sig = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      etiqueta = `${MES3[cur.getMonth()]} ${String(cur.getFullYear()).slice(2)}`;
      corta = `Mes ${n}`;
    }
    const finP = new Date(sig.getTime() - 86400000);
    lista.push({ inicio: iso(cur), fin: iso(finP > b ? b : finP), etiqueta, corta });
    cur = sig;
    n += 1;
  }
  return lista;
}

/** % programado acumulado de una partida en periodos iniciados hasta la fecha (incluida). */
export function programadoPartida(partidaId: string, cron: CronogramaPartida[], hasta: string, per: Periodicidad) {
  return Math.min(
    100,
    cron
      .filter((c) => c.partida_id === partidaId && (c.periodicidad ?? "mes") === per && c.fecha_inicio <= hasta)
      .reduce((s, c) => s + Number(c.pct), 0),
  );
}

/** Avance programado ponderado de la obra según su cronograma; null si no hay cronograma. */
export function programadoCronograma(partidas: Partida[], cron: CronogramaPartida[], hasta: string, per: Periodicidad) {
  const ids = new Set(partidas.map((p) => p.id));
  if (!cron.some((c) => ids.has(c.partida_id) && (c.periodicidad ?? "mes") === per)) return null;
  const base = partidas.reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
  if (base > 0)
    return partidas.reduce((s, p) => s + programadoPartida(p.id, cron, hasta, per) * Number(p.presupuesto_inicial), 0) / base;
  return partidas.reduce((s, p) => s + programadoPartida(p.id, cron, hasta, per), 0) / (partidas.length || 1);
}

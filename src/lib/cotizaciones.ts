import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { previsualizarCodigoDocumento, useCodificacionDocumento } from "@/lib/codificacion-documentos";

export type EstadoCotizacion = "Borrador" | "Enviada" | "Aprobada" | "Rechazada";

export const ESTADOS_COTIZACION: EstadoCotizacion[] = ["Borrador", "Enviada", "Aprobada", "Rechazada"];

export type Cotizacion = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  cliente: string;
  nombre: string;
  ubicacion: string;
  fecha_emision: string;
  validez_dias: number;
  pct_gastos_generales: number;
  pct_utilidad: number;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  orientacion?: "vertical" | "horizontal";
  condiciones: string;
  estado: EstadoCotizacion;
  proyecto_id: string | null;
  aplica_igv?: boolean;
  revision?: string;
  recursos_humanos?: string;
  tiempo_ejecucion?: string;
  condiciones_pago?: string;
  multidisciplinaria?: boolean;
  alcance?: "ambos" | "suministro" | "montaje";
};

export type CotizacionItem = {
  id: string;
  cotizacion_id: string;
  codigo: string;
  nombre: string;
  especialidad: string;
  categoria: string;
  marca?: string;
  unidad: string;
  metrado: number;
  precio_unitario: number;
  orden: number;
  padre_id?: string | null;
  rendimiento?: number;
  jornada?: number;
  pct_herramientas?: number;
  grupo?: string;
  /** 'grupo' = fila marcadora que conserva una especialidad/categoría sin partidas. */
  tipo?: string;
};

export type PartidaMaestra = {
  id: string;
  codigo: string;
  nombre: string;
  especialidad: string;
  categoria: string;
  marca?: string;
  unidad: string;
  precio_unitario: number;
  activo: boolean;
  orden?: number;
  /** Tipo de insumo dominante: MO | MAT | EQ | HT | SC — define el primer dígito del código. */
  tipo_partida?: string;
};

export const useCotizaciones = () =>
  useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cotizacion[];
    },
  });

/** Por defecto excluye las filas marcadoras de grupo; la hoja editable pide `conGrupos`. */
export const useCotizacionItems = (cotizacionId: string | null, conGrupos = false) =>
  useQuery({
    queryKey: ["cotizacion_items", cotizacionId],
    enabled: Boolean(cotizacionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", cotizacionId as string)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as CotizacionItem[];
    },
    select: (d) => (conGrupos ? d : d.filter((i) => i.tipo !== "grupo")),
  });

export const usePartidasMaestras = () =>
  useQuery({
    queryKey: ["partidas_maestras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partidas_maestras").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as PartidaMaestra[];
    },
  });

export const useCodificacionCotizacion = () => useCodificacionDocumento("COTIZACIONES");

/** Vista previa del siguiente código de cotización (CÓDIGO + correlativo). */
export const previsualizarCodigoCotizacion = previsualizarCodigoDocumento;


/** Reserva y devuelve el siguiente código correlativo de cotización. */
export async function generarCodigoCotizacion(): Promise<string> {
  const { reservarCodigo } = await import("./codigos.functions");
  return reservarCodigo({ data: { tipo: "cotizacion" } });
}

/** Costo directo + gastos generales + utilidad de una cotización. */
export function totalesCotizacion(
  items: Pick<CotizacionItem, "metrado" | "precio_unitario">[],
  pctGG: number,
  pctUtilidad: number,
) {
  const costoDirecto = items.reduce(
    (s, i) => s + Number(i.metrado || 0) * Number(i.precio_unitario || 0),
    0,
  );
  const gastosGenerales = (costoDirecto * Number(pctGG || 0)) / 100;
  const utilidad = (costoDirecto * Number(pctUtilidad || 0)) / 100;
  return { costoDirecto, gastosGenerales, utilidad, total: costoDirecto + gastosGenerales + utilidad };
}

/** Símbolo de la moneda de una cotización. */
export const simboloMoneda = (moneda?: string | null) => (moneda === "USD" ? "US$" : "S/");

/** Último tipo de cambio venta registrado (para precargar cotizaciones en USD). */
export const useTipoCambioActual = () =>
  useQuery({
    queryKey: ["tipo_cambio_actual"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipo_cambio_diario")
        .select("venta")
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.venta) || 0;
    },
  });

/** Fecha hasta la que la propuesta sigue vigente. */
export function vigenciaHasta(fechaEmision: string, dias: number) {
  const d = new Date(`${fechaEmision}T00:00:00`);
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}

/* ---------------- Grupos, alcance y plantillas ---------------- */

export type AlcanceCotizacion = "ambos" | "suministro" | "montaje";
export const GRUPO_SUMINISTRO = "SUMINISTRO DE MATERIALES";
export const GRUPO_MONTAJE = "MONTAJE ELECTROMECÁNICO";
export const ALCANCES: [AlcanceCotizacion, string][] = [
  ["ambos", "Suministro + Montaje"],
  ["suministro", "Solo suministro"],
  ["montaje", "Solo montaje"],
];

export type GrupoCotizacion = { id: string; nombre: string; orden: number; activo: boolean };

const sb = supabase as unknown as { from: (t: string) => any };

export const useGruposCotizacion = () =>
  useQuery({
    queryKey: ["grupos_cotizacion"],
    queryFn: async () => {
      const { data, error } = await sb.from("grupos_cotizacion").select("*").order("orden");
      if (error) throw error;
      return (data ?? []) as GrupoCotizacion[];
    },
  });

/** Grupos que puede usar una cotización según su alcance. */
export function gruposPermitidos(grupos: GrupoCotizacion[], alcance?: string | null) {
  const activos = grupos.filter((g) => g.activo).map((g) => g.nombre);
  if (alcance === "suministro") return activos.filter((g) => g === GRUPO_SUMINISTRO);
  if (alcance === "montaje") return activos.filter((g) => g === GRUPO_MONTAJE);
  return activos;
}

export type PlantillaCotizacion = {
  id: string;
  nombre: string;
  descripcion: string;
  multidisciplinaria: boolean;
  alcance: AlcanceCotizacion;
  pct_gastos_generales: number;
  pct_utilidad: number;
  condiciones: string;
  condiciones_pago: string;
  recursos_humanos: string;
  tiempo_ejecucion: string;
};

export const usePlantillasCotizacion = () =>
  useQuery({
    queryKey: ["plantillas_cotizacion"],
    queryFn: async () => {
      const { data, error } = await sb.from("plantillas_cotizacion").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as PlantillaCotizacion[];
    },
  });

type FilaCopiable = {
  id: string;
  padre_id?: string | null;
  tipo?: string;
  grupo?: string;
  especialidad: string;
  categoria?: string | null;
  codigo?: string | null;
  nombre: string;
  marca?: string | null;
  unidad: string;
  metrado: number;
  precio_unitario: number;
  orden: number;
};

/** Copia filas jerárquicas a otra tabla, remapeando padre_id por niveles. */
async function copiarFilas(
  tabla: "cotizacion_items" | "plantilla_cotizacion_items",
  origen: FilaCopiable[],
  extra: Record<string, unknown>,
  transformar: (f: FilaCopiable) => Record<string, unknown>,
) {
  const mapa = new Map<string, string>();
  let pendientes = [...origen];
  while (pendientes.length) {
    const listos = pendientes.filter((i) => !i.padre_id || mapa.has(i.padre_id));
    if (!listos.length) break;
    const { data, error } = await sb
      .from(tabla)
      .insert(listos.map((i) => ({ ...extra, ...transformar(i), padre_id: i.padre_id ? mapa.get(i.padre_id) ?? null : null })))
      .select("id");
    if (error) throw error;
    listos.forEach((i, idx) => data?.[idx]?.id && mapa.set(i.id, data[idx].id));
    pendientes = pendientes.filter((i) => !mapa.has(i.id));
  }
}

const base = (i: FilaCopiable) => ({
  tipo: i.tipo || "partida",
  grupo: i.grupo ?? "",
  especialidad: i.especialidad ?? "",
  categoria: i.categoria ?? "",
  codigo: i.codigo ?? "",
  nombre: i.nombre,
  marca: i.marca ?? "",
  unidad: i.unidad,
  orden: i.orden,
});

/** Guarda la estructura de una cotización en una plantilla (nueva o existente, reemplazando sus partidas). */
export async function guardarComoPlantilla(cot: Cotizacion & { multidisciplinaria?: boolean; alcance?: string }, plantillaId: string | null, nombre: string) {
  const cabecera = {
    multidisciplinaria: Boolean(cot.multidisciplinaria),
    alcance: cot.alcance ?? "ambos",
    pct_gastos_generales: cot.pct_gastos_generales,
    pct_utilidad: cot.pct_utilidad,
    condiciones: cot.condiciones ?? "",
    condiciones_pago: cot.condiciones_pago ?? "",
    recursos_humanos: cot.recursos_humanos ?? "",
    tiempo_ejecucion: cot.tiempo_ejecucion ?? "",
  };
  let id = plantillaId;
  if (id) {
    const { error } = await sb.from("plantillas_cotizacion").update(cabecera).eq("id", id);
    if (error) throw error;
    await sb.from("plantilla_cotizacion_items").delete().eq("plantilla_id", id);
  } else {
    const { data, error } = await sb.from("plantillas_cotizacion").insert({ ...cabecera, nombre }).select("id").single();
    if (error) throw error;
    id = data.id as string;
  }
  const { data: items, error } = await supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cot.id).order("orden");
  if (error) throw error;
  await copiarFilas("plantilla_cotizacion_items", (items ?? []) as unknown as FilaCopiable[], { plantilla_id: id }, (i) => ({
    ...base(i),
    metrado: 0,
    precio_unitario: Number(i.precio_unitario) || 0,
  }));
  return id;
}

/** Copia la estructura de una plantilla a una cotización; toma precios actuales del Registro de partidas. */
export async function aplicarPlantilla(plantillaId: string, cotizacionId: string) {
  const [{ data: items, error }, { data: maestras }] = await Promise.all([
    sb.from("plantilla_cotizacion_items").select("*").eq("plantilla_id", plantillaId).order("orden"),
    supabase.from("partidas_maestras").select("nombre, precio_unitario"),
  ]);
  if (error) throw error;
  const precio = new Map((maestras ?? []).map((m) => [m.nombre.trim().toLowerCase(), Number(m.precio_unitario)]));
  await copiarFilas("cotizacion_items", (items ?? []) as FilaCopiable[], { cotizacion_id: cotizacionId }, (i) => ({
    ...base(i),
    metrado: i.tipo === "grupo" ? 0 : Number(i.metrado) || 1,
    precio_unitario: precio.get(i.nombre.trim().toLowerCase()) ?? Number(i.precio_unitario) ?? 0,
  }));
}

/** Cambia una cotización entre una disciplina y multidisciplinaria sin perder partidas. */
export async function cambiarModoCotizacion(cotizacionId: string, multi: boolean, especialidad = "") {
  const { error } = await sb.from("cotizaciones").update({ multidisciplinaria: multi }).eq("id", cotizacionId);
  if (error) throw error;
  if (multi) {
    // El capítulo (grupo) ya está guardado en `grupo`; la especialidad pasa a ser la disciplina elegida.
    const { error: e2 } = await supabase.from("cotizacion_items").update({ especialidad } as never).eq("cotizacion_id", cotizacionId);
    if (e2) throw e2;
    return;
  }
  const { data } = await sb.from("cotizacion_items").select("id, grupo").eq("cotizacion_id", cotizacionId);
  const grupos = new Set<string>(((data ?? []) as { grupo: string }[]).map((d) => d.grupo));
  for (const g of grupos) {
    await supabase
      .from("cotizacion_items")
      .update({ especialidad: g || GRUPO_SUMINISTRO } as never)
      .eq("cotizacion_id", cotizacionId)
      .eq("grupo" as never, g as never);
  }
}

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
  condiciones: string;
  estado: EstadoCotizacion;
  proyecto_id: string | null;
  aplica_igv?: boolean;
  revision?: string;
  recursos_humanos?: string;
  tiempo_ejecucion?: string;
  condiciones_pago?: string;
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const useCotizacionItems = (cotizacionId: string | null) =>
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

export type CodificacionCotizacionConfig = {
  id: string;
  prefijo: string;
  incluir_anio: boolean;
  anio_dos_digitos: boolean;
  separador: string;
  tipo_letra: string;
  digitos: number;
  correlativo_actual: number;
};

export const useCodificacionCotizacion = () =>
  useQuery({
    queryKey: ["codificacion_cotizacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("codificacion_cotizacion")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CodificacionCotizacionConfig | null;
    },
  });

/** Vista previa del siguiente código de cotización sin consumir el correlativo. Ej.: TXN26-C001 */
export function previsualizarCodigoCotizacion(
  cfg: Partial<CodificacionCotizacionConfig>,
  correlativo?: number,
) {
  const prefijo = (cfg.prefijo ?? "TXN").trim().toUpperCase();
  const separador = cfg.separador ?? "-";
  const digitos = Math.max(Number(cfg.digitos ?? 3) || 1, 1);
  const numero = correlativo ?? Number(cfg.correlativo_actual ?? 0) + 1;
  const anioCompleto = String(new Date().getFullYear());
  const anio =
    cfg.incluir_anio === false ? "" : cfg.anio_dos_digitos === false ? anioCompleto : anioCompleto.slice(-2);
  const letra = (cfg.tipo_letra ?? "C").trim().toUpperCase();
  return `${prefijo}${anio}${separador}${letra}${String(numero).padStart(digitos, "0")}`;
}


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

/** Fecha hasta la que la propuesta sigue vigente. */
export function vigenciaHasta(fechaEmision: string, dias: number) {
  const d = new Date(`${fechaEmision}T00:00:00`);
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}

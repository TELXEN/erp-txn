import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Vehiculo = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  tipo: string;
  propiedad: "Propio" | "Alquilado";
  proveedor_id: string | null;
  km_actual: number;
  soat_vencimiento: string | null;
  revision_tecnica_vencimiento: string | null;
  tarifa_dia: number;
  tarifa_km: number;
  estado: "Operativo" | "En taller" | "Baja";
  observacion: string;
};

export type TareoVehiculo = {
  id: string;
  fecha: string;
  vehiculo_id: string;
  proyecto_id: string;
  conductor_id: string | null;
  dias: number;
  km: number;
  costo_soles: number;
  observacion: string;
};

export type Traslado = {
  id: string;
  fecha: string;
  vehiculo_id: string;
  conductor_id: string | null;
  proyecto_id: string | null;
  origen: string;
  destino: string;
  km_inicial: number;
  km_final: number;
  carga: string;
  combustible_galones: number;
  combustible_monto: number;
  observacion: string;
  origen_pago: "Banco" | "Caja chica";
  banco_id: string | null;
  caja_chica_id: string | null;
  numero_operacion: string;
};

export type Mantenimiento = {
  id: string;
  vehiculo_id: string;
  fecha: string;
  tipo: "Preventivo" | "Correctivo";
  taller_id: string | null;
  costo: number;
  km: number;
  detalle: string;
  origen_pago: "Banco" | "Caja chica";
  banco_id: string | null;
  caja_chica_id: string | null;
  numero_operacion: string;
};

export type PlanMantenimiento = {
  id: string;
  vehiculo_id: string;
  descripcion: string;
  cada_km: number | null;
  cada_meses: number | null;
  ultimo_km: number;
  ultima_fecha: string | null;
  proximo_km: number | null;
  proxima_fecha: string | null;
  activo: boolean;
};

async function pedir<T>(tabla: string, orden: { col: string; asc?: boolean }) {
  const { data, error } = await supabase
    .from(tabla as never)
    .select("*")
    .order(orden.col, { ascending: orden.asc ?? true });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useVehiculos = () =>
  useQuery({ queryKey: ["vehiculos"], queryFn: () => pedir<Vehiculo>("vehiculos", { col: "placa" }) });

export const useTareoVehiculos = () =>
  useQuery({ queryKey: ["tareo_vehiculos"], queryFn: () => pedir<TareoVehiculo>("tareo_vehiculos", { col: "fecha", asc: false }) });

export const useTraslados = () =>
  useQuery({ queryKey: ["traslados_vehiculo"], queryFn: () => pedir<Traslado>("traslados_vehiculo", { col: "fecha", asc: false }) });

export const useMantenimientos = () =>
  useQuery({ queryKey: ["mantenimientos_vehiculo"], queryFn: () => pedir<Mantenimiento>("mantenimientos_vehiculo", { col: "fecha", asc: false }) });

export const usePlanMantenimiento = () =>
  useQuery({ queryKey: ["plan_mantenimiento"], queryFn: () => pedir<PlanMantenimiento>("plan_mantenimiento", { col: "created_at" }) });

export const TIPOS_VEHICULO = ["Camioneta", "Camión", "Auto", "Van", "Otro"];
export const ESTADOS_VEHICULO = ["Operativo", "En taller", "Baja"];

/** Costo del tareo: días x tarifa diaria + km x tarifa por km. */
export function costoTareo(dias: number, km: number, v: Vehiculo | undefined) {
  if (!v) return 0;
  return Number(dias || 0) * Number(v.tarifa_dia || 0) + Number(km || 0) * Number(v.tarifa_km || 0);
}

/** Días que faltan para un vencimiento; null si no hay fecha. */
export function diasPara(fecha: string | null) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fecha + "T00:00:00").getTime() - hoy.getTime()) / 86400000);
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Transportista = Tables<"transportistas">;
export type VehiculoTransportista = Tables<"transportista_vehiculos">;
export type ConductorTransportista = Tables<"transportista_conductores">;
export type TransportistaCompleto = Transportista & { vehiculos: VehiculoTransportista[]; conductores: ConductorTransportista[] };

export const ENTIDADES_AUTORIZACION = ["MTC", "SUTRAN", "Municipalidad", "SUCAMEC", "DIGESA", "Otra"] as const;

/** Vencido si la fecha existe y es anterior a hoy (Lima no importa: comparación por día ISO). */
export function vencido(fecha: string | null | undefined, hoy = new Date().toISOString().slice(0, 10)) {
  return Boolean(fecha) && (fecha as string) < hoy;
}

export const nombreConductor = (c: Pick<ConductorTransportista, "nombres" | "apellidos">) => `${c.nombres} ${c.apellidos}`.trim();

export function useTransportistas() {
  return useQuery({
    queryKey: ["transportistas"],
    queryFn: async (): Promise<TransportistaCompleto[]> => {
      const [t, v, c] = await Promise.all([
        supabase.from("transportistas").select("*").order("razon_social"),
        supabase.from("transportista_vehiculos").select("*").order("placa"),
        supabase.from("transportista_conductores").select("*").order("nombres"),
      ]);
      if (t.error) throw t.error; if (v.error) throw v.error; if (c.error) throw c.error;
      return (t.data ?? []).map((x) => ({ ...x, vehiculos: (v.data ?? []).filter((y) => y.transportista_id === x.id), conductores: (c.data ?? []).filter((y) => y.transportista_id === x.id) }));
    },
  });
}

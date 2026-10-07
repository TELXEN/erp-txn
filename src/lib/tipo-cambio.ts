import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { consultarTipoCambio } from "@/lib/decolecta.functions";

/** Fecha de hoy en Lima (UTC-5). */
export const fechaLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

export type TipoCambioHoy = { venta: number; compra: number; fecha: string; fuente: string; esHoy: boolean; aviso: string };

/**
 * Fuente única del tipo de cambio del día para todo el ERP.
 * Una sola consulta por día: el servidor lee primero lo guardado y solo consulta Decolecta si falta;
 * en el navegador el resultado (incluso un fallo) queda en memoria hasta el cambio de fecha.
 */
export const useTipoCambioHoy = () => {
  const fecha = fechaLima();
  return useQuery({
    queryKey: ["tc_hoy", fecha],
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async (): Promise<TipoCambioHoy> => {
      try {
        const r = await consultarTipoCambio({ data: { fecha } });
        if (r.encontrado && r.venta > 0) return { venta: r.venta, compra: r.compra, fecha, fuente: r.fuente || "SUNAT", esHoy: true, aviso: "" };
      } catch { /* respaldo */ }
      const { data } = await supabase.from("tipo_cambio_diario").select("venta,compra,fecha,fuente").order("fecha", { ascending: false }).limit(1).maybeSingle();
      if (data) return { venta: Number(data.venta), compra: Number(data.compra), fecha: data.fecha, fuente: data.fuente, esHoy: data.fecha === fecha, aviso: data.fecha === fecha ? "" : "No se obtuvo el TC de hoy; se usa el último disponible." };
      return { venta: 0, compra: 0, fecha: "", fuente: "", esHoy: false, aviso: "Sin tipo de cambio disponible." };
    },
  });
};

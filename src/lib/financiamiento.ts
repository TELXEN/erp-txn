import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Financiamiento = Database["public"]["Tables"]["financiamientos"]["Row"];
export type CuotaFinanciamiento = Database["public"]["Tables"]["financiamiento_cuotas"]["Row"];
export function useFinanciamientos() {
  return useQuery({ queryKey: ["financiamientos"], queryFn: async () => {
    const [f, c] = await Promise.all([supabase.from("financiamientos").select("*").order("fecha_desembolso", { ascending: false }), supabase.from("financiamiento_cuotas").select("*").order("numero")]);
    if (f.error) throw f.error; if (c.error) throw c.error;
    return { prestamos: f.data ?? [], cuotas: c.data ?? [] };
  } });
}
export function useSaldosBancarios() {
  return useQuery({ queryKey: ["banco_saldos"], queryFn: async () => {
    const { data, error } = await supabase.from("banco_saldos").select("*");
    if (error) throw error; return data ?? [];
  } });
}

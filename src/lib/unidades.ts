import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UnidadMedida = {
  id: string;
  simbolo: string;
  descripcion: string;
  orden: number;
  activo: boolean;
};

export const useUnidadesMedida = () =>
  useQuery({
    queryKey: ["unidades_medida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unidades_medida").select("*").order("orden");
      if (error) throw error;
      return (data ?? []) as UnidadMedida[];
    },
  });

/** Presupuesto de una partida: metrado × precio unitario. */
export const montoPartida = (metrado: number | string, precioUnitario: number | string) =>
  Math.round(Number(metrado || 0) * Number(precioUnitario || 0) * 100) / 100;

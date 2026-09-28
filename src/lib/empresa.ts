import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Empresa = {
  id: string;
  razon_social: string;
  ruc: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  eslogan: string;
  color_marca: string;
  logo_url: string;
};

export function useEmpresa() {
  return useQuery({
    queryKey: ["empresa_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresa_config")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Empresa | null;
    },
  });
}

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
  rubro: string;
  color_marca: string;
  logo_url: string;
  gerente_nombre?: string | null;
  gerente_dni?: string | null;
  rrhh_nombre?: string | null;
  rrhh_dni?: string | null;
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

export type FirmasEmpresa = { razon_social?: string | null | undefined; ruc?: string | null | undefined; gerente_nombre?: string | null | undefined; gerente_dni?: string | null | undefined; rrhh_nombre?: string | null | undefined; rrhh_dni?: string | null | undefined } | null | undefined;

/** Firmante de documentos laborales: Jefe de RR. HH. si está registrado; si no, el Gerente General; si no, la empresa. */
export function firmanteLaboral(e: FirmasEmpresa): { nombre: string; documento: string; cargo: string } {
  if (e?.rrhh_nombre?.trim()) return { nombre: e.rrhh_nombre.trim(), documento: e.rrhh_dni?.trim() ? `DNI ${e.rrhh_dni.trim()}` : "", cargo: "Jefe de Recursos Humanos" };
  if (e?.gerente_nombre?.trim()) return { nombre: e.gerente_nombre.trim(), documento: e.gerente_dni?.trim() ? `DNI ${e.gerente_dni.trim()}` : "", cargo: "Gerente General" };
  return { nombre: e?.razon_social ?? "", documento: e?.ruc ? `RUC ${e.ruc}` : "", cargo: "Empleador" };
}

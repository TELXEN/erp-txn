import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TIPOS_EMO = ["Pre-ocupacional", "Periódico", "Retiro", "Por reincorporación"] as const;
export const EXAMENES_EMO = [
  "Examen clínico", "Audiometría", "Espirometría", "Oftalmología", "Rayos X de tórax",
  "Laboratorio", "Psicológico", "Trabajo en altura", "Electrocardiograma", "Otros",
] as const;
export const RESULTADOS_EMO = ["Apto", "Apto con restricciones", "No apto"] as const;
export const DIAS_AVISO_EMO = 30;

export type Emo = {
  id: string;
  trabajador_id: string;
  tipo_emo: string;
  examenes: string[];
  resultado: string;
  restricciones: string | null;
  fecha_emo: string;
  fecha_vencimiento: string;
  clinica: string;
  sede_clinica: string | null;
  costo: number;
  estado_pago: "Pendiente" | "Pagado";
  fecha_pago: string | null;
  observaciones: string | null;
};

export type EstadoEmo = "vigente" | "por_vencer" | "vencido" | "sin_emo";

function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export function diasParaVencer(fecha: string) {
  const a = new Date(`${hoyISO()}T00:00:00Z`).getTime();
  const b = new Date(`${fecha}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function estadoEmo(fechaVenc?: string | null): EstadoEmo {
  if (!fechaVenc) return "sin_emo";
  const d = diasParaVencer(fechaVenc);
  if (d < 0) return "vencido";
  if (d <= DIAS_AVISO_EMO) return "por_vencer";
  return "vigente";
}

export const ESTADO_EMO_INFO: Record<EstadoEmo, { texto: string; clase: string; punto: string }> = {
  vigente: { texto: "Vigente", clase: "text-good border-good/40 bg-good/10", punto: "bg-good" },
  por_vencer: { texto: "Por vencer", clase: "text-warn border-warn/40 bg-warn/10", punto: "bg-warn" },
  vencido: { texto: "Vencido", clase: "text-bad border-bad/40 bg-bad/10", punto: "bg-bad" },
  sin_emo: { texto: "Sin EMO", clase: "text-muted-foreground border-line bg-muted", punto: "bg-muted-foreground/40" },
};

export function sumarAnios(fecha: string, anios: number) {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-").map(Number);
  return `${y + anios}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function useEmos(habilitado = true) {
  return useQuery({
    queryKey: ["emos_trabajador"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emos_trabajador")
        .select("*")
        .order("fecha_vencimiento", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Emo[];
    },
  });
}

/** Último EMO (mayor fecha de vencimiento) por trabajador. */
export function ultimoEmoPorTrabajador(emos: Emo[]) {
  const m = new Map<string, Emo>();
  for (const e of emos) {
    const prev = m.get(e.trabajador_id);
    if (!prev || e.fecha_vencimiento > prev.fecha_vencimiento) m.set(e.trabajador_id, e);
  }
  return m;
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Partida } from "@/lib/datos";

export type EspecialidadPartida = {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
};

export const useEspecialidadesPartida = () =>
  useQuery({
    queryKey: ["especialidades_partida"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidades_partida")
        .select("*")
        .order("orden");
      if (error) throw error;
      return (data ?? []) as EspecialidadPartida[];
    },
  });

/** Código del capítulo de una especialidad (ej. "05"). */
export const codigoEspecialidad = (nombre: string, catalogo: EspecialidadPartida[]) =>
  catalogo.find((e) => e.nombre === nombre)?.codigo ?? "";

/**
 * Sugiere el siguiente código de partida dentro del capítulo,
 * considerando las partidas ya registradas en el mismo proyecto.
 */
export function siguienteCodigoPartida(
  especialidad: string,
  proyectoId: string,
  partidas: Partida[],
  catalogo: EspecialidadPartida[],
) {
  const capitulo = codigoEspecialidad(especialidad, catalogo);
  if (!capitulo) return "";
  const usados = partidas
    .filter((p) => p.proyecto_id === proyectoId && (p.codigo ?? "").startsWith(`${capitulo}.`))
    .map((p) => Number((p.codigo ?? "").split(".")[1]))
    .filter((n) => Number.isFinite(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${capitulo}.${String(siguiente).padStart(2, "0")}`;
}

/**
 * Sugiere el siguiente código dentro del capítulo a partir de una lista
 * de códigos ya usados (banco maestro, cotización, etc.).
 */
export function siguienteCodigoEnCapitulo(
  especialidad: string,
  codigosUsados: (string | null | undefined)[],
  catalogo: EspecialidadPartida[],
) {
  const capitulo = codigoEspecialidad(especialidad, catalogo);
  if (!capitulo) return "";
  const usados = codigosUsados
    .filter((c): c is string => Boolean(c) && (c as string).startsWith(`${capitulo}.`))
    .map((c) => Number(c.split(".")[1]))
    .filter((n) => Number.isFinite(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${capitulo}.${String(siguiente).padStart(2, "0")}`;
}

/** Etiqueta de partida con su código delante. */
export const etiquetaPartida = (p: { codigo?: string | null; nombre: string }) =>
  p.codigo ? `[${p.codigo}] ${p.nombre}` : p.nombre;

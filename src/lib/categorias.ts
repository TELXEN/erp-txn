import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CategoriaPartida = {
  id: string;
  codigo: string;
  nombre: string;
  especialidad: string;
  orden: number;
  activo: boolean;
};

export const useCategoriasPartida = () =>
  useQuery({
    queryKey: ["categorias_partida"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_partida")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return (data ?? []) as CategoriaPartida[];
    },
  });

/** Categorías activas de una especialidad, en orden. */
export const categoriasDe = (especialidad: string, catalogo: CategoriaPartida[]) =>
  catalogo
    .filter((c) => c.activo && c.especialidad === especialidad)
    .sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));

/** Código de la categoría (ej. "05.01"). */
export const codigoCategoria = (nombre: string, catalogo: CategoriaPartida[]) =>
  catalogo.find((c) => c.nombre === nombre)?.codigo ?? "";

/**
 * Sugiere el siguiente código de partida dentro de una categoría:
 * 05.01 → 05.01.01, 05.01.02, ...
 */
export function siguienteCodigoEnCategoria(
  categoria: string,
  codigosUsados: (string | null | undefined)[],
  catalogo: CategoriaPartida[],
) {
  const base = codigoCategoria(categoria, catalogo);
  if (!base) return "";
  const usados = codigosUsados
    .filter((c): c is string => Boolean(c) && (c as string).startsWith(`${base}.`))
    .map((c) => Number(c.slice(base.length + 1).split(".")[0]))
    .filter((n) => Number.isFinite(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${base}.${String(siguiente).padStart(2, "0")}`;
}

/** Siguiente código de categoría libre dentro de un capítulo (ej. 05.03). */
export function siguienteCodigoDeCategoria(capitulo: string, catalogo: CategoriaPartida[]) {
  if (!capitulo) return "";
  const usados = catalogo
    .filter((c) => c.codigo.startsWith(`${capitulo}.`))
    .map((c) => Number(c.codigo.split(".")[1]))
    .filter((n) => Number.isFinite(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${capitulo}.${String(siguiente).padStart(2, "0")}`;
}

/** Agrupa filas por especialidad y luego por categoría, conservando el orden del catálogo. */
export function agruparPorCategoria<T extends { especialidad: string; categoria?: string | null }>(
  filas: T[],
) {
  const mapa = new Map<string, Map<string, T[]>>();
  for (const f of filas) {
    const esp = f.especialidad || "Sin especialidad";
    const cat = (f.categoria ?? "").trim() || "Sin categoría";
    if (!mapa.has(esp)) mapa.set(esp, new Map());
    const sub = mapa.get(esp)!;
    if (!sub.has(cat)) sub.set(cat, []);
    sub.get(cat)!.push(f);
  }
  return [...mapa.entries()].map(([especialidad, sub]) => ({
    especialidad,
    categorias: [...sub.entries()].map(([categoria, items]) => ({ categoria, items })),
  }));
}

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

/** Agrupa filas solo por categoría, conservando el orden de aparición. */
export function agruparSoloPorCategoria<T extends { categoria?: string | null }>(filas: T[]) {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    const cat = (f.categoria ?? "").trim() || "Sin categoría";
    if (!mapa.has(cat)) mapa.set(cat, []);
    mapa.get(cat)!.push(f);
  }
  return [...mapa.entries()].map(([categoria, items]) => ({ categoria, items }));
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

type FilaCodigo = { codigo?: string | null; especialidad: string; categoria?: string | null };

/**
 * Código contextual dentro de una obra o cotización (sin códigos fijos de catálogo):
 * - Capítulo: reutiliza el de la especialidad si ya existe; si no, el siguiente libre (01, 02...).
 * - Categoría: reutiliza la de esa especialidad; si no, la siguiente libre (01.01, 01.02...).
 * - Partida: siguiente correlativo (01.01.01, 01.01.02...).
 */
export function codigoContextual(especialidad: string, categoria: string, filas: FilaCodigo[]) {
  if (!especialidad) return "";
  const seg = (c: string) => c.split(".").map((s) => Number(s));
  const conCodigo = filas.filter((f) => (f.codigo ?? "").trim());
  const pad = (n: number) => String(n).padStart(2, "0");
  const maxDe = (nums: (number | undefined)[]) => nums.filter((n): n is number => Number.isFinite(n)).reduce((a, b) => Math.max(a, b), 0);

  const propia = conCodigo.find((f) => f.especialidad === especialidad);
  const capitulo = propia
    ? (propia.codigo as string).split(".")[0]
    : pad(maxDe(conCodigo.map((f) => seg(f.codigo as string)[0])) + 1);
  const delCapitulo = conCodigo.filter((f) => (f.codigo as string).split(".")[0] === capitulo);

  const cat = categoria.trim();
  const mismaCat = delCapitulo.find(
    (f) => (f.categoria ?? "").trim() === cat && (f.codigo as string).split(".").length >= 3,
  );
  const base = mismaCat
    ? (mismaCat.codigo as string).split(".").slice(0, 2).join(".")
    : `${capitulo}.${pad(maxDe(delCapitulo.map((f) => seg(f.codigo as string)[1])) + 1)}`;
  const items = conCodigo
    .filter((f) => (f.codigo as string).startsWith(`${base}.`))
    .map((f) => seg(f.codigo as string)[2]);
  return `${base}.${pad(maxDe(items) + 1)}`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const SIN_CAT = "Sin categoría";
const claveCat = (c?: string | null) => (c ?? "").trim() || SIN_CAT;

function agrupar<T>(filas: T[], clave: (f: T) => string) {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    const k = clave(f);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(f);
  }
  return mapa;
}

/**
 * Códigos de encabezado (capítulo y subcapítulo) de una obra/cotización.
 * Reutiliza el prefijo de las partidas ya codificadas; si faltan, numera por orden de aparición.
 */
export function prefijosWBS(filas: FilaCodigo[]) {
  const capitulos = new Map<string, string>();
  const categorias = new Map<string, string>();
  const usadosCap = new Set<string>();
  let nextCap = 0;

  for (const [esp, lista] of agrupar(filas, (f) => f.especialidad || "Sin especialidad")) {
    const conCod = lista.find((f) => /^\d+/.test((f.codigo ?? "").trim()));
    let cap = conCod ? (conCod.codigo as string).trim().split(".")[0] : "";
    if (!cap || usadosCap.has(cap)) {
      do {
        nextCap += 1;
        cap = pad2(nextCap);
      } while (usadosCap.has(cap));
    }
    usadosCap.add(cap);
    nextCap = Math.max(nextCap, Number(cap) || 0);
    capitulos.set(esp, cap);

    const usadosSub = new Set<string>();
    let nextSub = 0;
    for (const [cat, items] of agrupar(lista, (f) => claveCat(f.categoria))) {
      const conCod3 = items.find((f) => (f.codigo ?? "").trim().split(".").length >= 3);
      let sub = conCod3 ? (conCod3.codigo as string).trim().split(".")[1] : "";
      if (!sub || usadosSub.has(sub)) {
        do {
          nextSub += 1;
          sub = pad2(nextSub);
        } while (usadosSub.has(sub));
      }
      usadosSub.add(sub);
      nextSub = Math.max(nextSub, Number(sub) || 0);
      categorias.set(`${esp}||${cat}`, `${cap}.${sub}`);
    }
  }

  return {
    capitulo: (esp: string) => capitulos.get(esp || "Sin especialidad") ?? "",
    categoria: (esp: string, cat?: string | null) =>
      categorias.get(`${esp || "Sin especialidad"}||${claveCat(cat)}`) ?? "",
  };
}

/**
 * Renumera toda la EDT/WBS de una obra: 01, 01.01, 01.01.01...
 * Devuelve solo las partidas cuyo código cambia.
 */
export function renumerarWBS<T extends FilaCodigo & { id: string; padre_id?: string | null; tipo?: string }>(
  filas: T[],
) {
  const cambios: { id: string; codigo: string }[] = [];
  const ids = new Set(filas.map((f) => f.id));
  const esHijo = (f: T) => Boolean(f.padre_id && ids.has(f.padre_id));
  const hijosDe = (id: string) => filas.filter((f) => f.padre_id === id);
  let iCap = 0;
  for (const [, lista] of agrupar(filas, (f) => f.especialidad || "Sin especialidad")) {
    iCap += 1;
    const cap = pad2(iCap);
    let iSub = 0;
    for (const [, items] of agrupar(lista, (f) => claveCat(f.categoria))) {
      // Marcadora de la especialidad (sin categoría ni partidas): no ocupa correlativo de categoría.
      if (items.every((f) => f.tipo === "grupo") && !(items[0]?.categoria ?? "").trim()) {
        for (const m of items) if ((m.codigo ?? "").trim() !== `${cap}.00.00`) cambios.push({ id: m.id, codigo: `${cap}.00.00` });
        continue;
      }
      iSub += 1;
      // Las filas marcadoras de grupo conservan el prefijo del grupo con correlativo 00.
      for (const m of items.filter((f) => f.tipo === "grupo")) {
        const c0 = `${cap}.${pad2(iSub)}.00`;
        if ((m.codigo ?? "").trim() !== c0) cambios.push({ id: m.id, codigo: c0 });
      }
      items.filter((f) => !esHijo(f) && f.tipo !== "grupo").forEach((f, i) => {
        const codigo = `${cap}.${pad2(iSub)}.${pad2(i + 1)}`;
        if ((f.codigo ?? "").trim() !== codigo) cambios.push({ id: f.id, codigo });
        hijosDe(f.id).forEach((h, j) => {
          const c4 = `${codigo}.${pad2(j + 1)}`;
          if ((h.codigo ?? "").trim() !== c4) cambios.push({ id: h.id, codigo: c4 });
        });
      });
    }
  }
  return cambios;
}

type FilaJerarquia = { id: string; padre_id?: string | null };

/**
 * Ordena filas de un grupo en árbol: cada partida seguida de sus subpartidas (4.° nivel).
 * Devuelve la fila, su nivel (3 = partida, 4 = subpartida) y si es agrupadora.
 */
export function ordenarJerarquia<T extends FilaJerarquia>(filas: T[]) {
  const ids = new Set(filas.map((f) => f.id));
  const hijos = new Map<string, T[]>();
  for (const f of filas) {
    if (f.padre_id && ids.has(f.padre_id)) {
      if (!hijos.has(f.padre_id)) hijos.set(f.padre_id, []);
      hijos.get(f.padre_id)!.push(f);
    }
  }
  const out: { fila: T; nivel: 3 | 4; agrupadora: boolean; hijos: T[] }[] = [];
  for (const f of filas) {
    if (f.padre_id && ids.has(f.padre_id)) continue;
    const h = hijos.get(f.id) ?? [];
    out.push({ fila: f, nivel: 3, agrupadora: h.length > 0, hijos: h });
    for (const c of h) out.push({ fila: c, nivel: 4, agrupadora: false, hijos: [] });
  }
  return out;
}

/** Siguiente código de subpartida: 01.01.01 → 01.01.01.01, 01.01.01.02... */
export function siguienteCodigoSubpartida(
  codigoPadre: string,
  hermanos: { codigo?: string | null }[],
) {
  const base = (codigoPadre ?? "").trim();
  const usados = hermanos
    .map((h) => (h.codigo ?? "").trim())
    .filter((c) => base && c.startsWith(`${base}.`))
    .map((c) => Number(c.slice(base.length + 1).split(".")[0]))
    .filter((n) => Number.isFinite(n));
  const n = (usados.length ? Math.max(...usados) : 0) + 1;
  return base ? `${base}.${pad2(n)}` : "";
}

import { formatearTexto } from "@/lib/formato-texto";

/** Niveles de la hoja de cotización (de mayor a menor jerarquía). */
export type NivelCotizacion = "especialidad" | "titulo" | "subtitulo" | "partida";

export const RANGO_NIVEL: Record<NivelCotizacion, number> = { especialidad: 0, titulo: 1, subtitulo: 2, partida: 3 };

export const NOMBRE_NIVEL: Record<NivelCotizacion, string> = {
  especialidad: "Especialidad",
  titulo: "Título",
  subtitulo: "Subtítulo",
  partida: "Partida",
};

export type FilaNivel = { id: string; nivel?: string | null; tipo?: string | null; orden?: number | null };

export const nivelDe = (f: FilaNivel): NivelCotizacion =>
  f.nivel && f.nivel in RANGO_NIVEL ? (f.nivel as NivelCotizacion) : f.tipo === "grupo" ? "titulo" : "partida";

/** Formato obligatorio del texto según el nivel. */
export function formatearNivel(texto: string, nivel: NivelCotizacion) {
  if (nivel === "especialidad" || nivel === "titulo") return formatearTexto(texto, "mayusculas");
  if (nivel === "subtitulo") return formatearTexto(texto, "titulo");
  return formatearTexto(texto, "oracion");
}

/**
 * Numeración por posición: el primer nivel colocado es N.0; sus hijos N.1, N.2…
 * y cada nivel inferior añade un segmento. Los niveles ausentes no ocupan segmento.
 */
export function numerarNiveles<T extends FilaNivel>(filas: T[]) {
  const orden = [...filas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const codigos = new Map<string, string>();
  const profundidad = new Map<string, number>();
  const pila: { rango: number; ruta: number[]; hijos: number }[] = [];
  let raices = 0;
  for (const f of orden) {
    const rango = RANGO_NIVEL[nivelDe(f)];
    while (pila.length && pila[pila.length - 1]!.rango >= rango) pila.pop();
    const padre = pila[pila.length - 1];
    let ruta: number[];
    if (padre) ruta = [...padre.ruta, ++padre.hijos];
    else ruta = [++raices];
    codigos.set(f.id, ruta.length === 1 ? `${ruta[0]}.0` : ruta.join("."));
    profundidad.set(f.id, ruta.length - 1);
    pila.push({ rango, ruta, hijos: 0 });
  }
  return { orden, codigos, profundidad };
}

/** Índices [inicio, fin) del bloque de una fila: ella y todo lo que tiene dentro. */
export function bloqueDe<T extends FilaNivel>(ordenadas: T[], id: string): [number, number] {
  const i = ordenadas.findIndex((f) => f.id === id);
  if (i < 0) return [0, 0];
  const r = RANGO_NIVEL[nivelDe(ordenadas[i]!)];
  let j = i + 1;
  while (j < ordenadas.length && RANGO_NIVEL[nivelDe(ordenadas[j]!)] > r) j++;
  return [i, j];
}

/** Mueve bloques entre hermanos o cruza el encabezado contiguo para cambiar de grupo. */
export function moverBloqueNivel<T extends FilaNivel>(filas: T[], id: string, direccion: "subir" | "bajar"): T[] | null {
  const { orden } = numerarNiveles(filas);
  const padres = new Map<string, string | null>();
  const pila: T[] = [];
  for (const fila of orden) {
    const rango = RANGO_NIVEL[nivelDe(fila)];
    let ultimo = pila.at(-1);
    while (ultimo && RANGO_NIVEL[nivelDe(ultimo)] >= rango) {
      pila.pop();
      ultimo = pila.at(-1);
    }
    padres.set(fila.id, ultimo?.id ?? null);
    pila.push(fila);
  }
  const actual = orden.find((fila) => fila.id === id);
  if (!actual) return null;
  const hermanos = orden.filter((fila) => nivelDe(fila) === nivelDe(actual) && padres.get(fila.id) === padres.get(id));
  const vecino = hermanos[hermanos.findIndex((fila) => fila.id === id) + (direccion === "subir" ? -1 : 1)];
  const [inicio, fin] = bloqueDe(orden, id);
  const bloque = orden.slice(inicio, fin);
  if (!vecino) {
    // Solo las partidas cruzan al grupo vecino; los encabezados se mueven dentro de su grupo.
    if (nivelDe(actual) !== "partida") return null;
    const limite = direccion === "subir" ? orden[inicio - 1] : orden[fin];
    if (!limite || RANGO_NIVEL[nivelDe(limite)] >= RANGO_NIVEL[nivelDe(actual)]) return null;
    // Do not lift the first child above the first heading into an orphan root.
    if (direccion === "subir" && inicio < 2) return null;
    const nueva = direccion === "subir"
      ? [...orden.slice(0, inicio - 1), ...bloque, limite, ...orden.slice(fin)]
      : [...orden.slice(0, inicio), limite, ...bloque, ...orden.slice(fin + 1)];
    return nueva.map((fila, i) => ({ ...fila, orden: i + 1 }));
  }
  const [vecInicio, vecFin] = bloqueDe(orden, vecino.id);
  const nueva = direccion === "subir"
    ? [...orden.slice(0, vecInicio), ...bloque, ...orden.slice(vecInicio, inicio), ...orden.slice(fin)]
    : [...orden.slice(0, inicio), ...orden.slice(fin, vecFin), ...bloque, ...orden.slice(vecFin)];
  return nueva.map((fila, i) => ({ ...fila, orden: i + 1 }));
}

/** Total de una fila encabezado = suma de sus partidas; de una partida = metrado × P.U. */
export function totalesNiveles<T extends FilaNivel & { metrado?: number | string; precio_unitario?: number | string }>(ordenadas: T[]) {
  const tot = new Map<string, number>();
  ordenadas.forEach((f, i) => {
    if (nivelDe(f) === "partida") {
      tot.set(f.id, Number(f.metrado || 0) * Number(f.precio_unitario || 0));
      return;
    }
    const [, fin] = bloqueDe(ordenadas, f.id);
    let s = 0;
    for (let k = i + 1; k < fin; k++) {
      const h = ordenadas[k]!;
      if (nivelDe(h) === "partida") s += Number(h.metrado || 0) * Number(h.precio_unitario || 0);
    }
    tot.set(f.id, s);
  });
  return tot;
}

/**
 * Posición (índice en el orden numerado) donde entra una fila nueva:
 * especialidad al final de la hoja; título al final de su especialidad (o de la hoja);
 * subtítulo y partida al final del bloque de la fila seleccionada.
 */
export function posicionInsercion<T extends FilaNivel>(ordenadas: T[], nivel: string, seleccionadoId: string | null): number {
  if (nivel === "especialidad" || !seleccionadoId) return ordenadas.length;
  const idx = ordenadas.findIndex((f) => f.id === seleccionadoId);
  if (idx < 0) return ordenadas.length;
  if (nivel === "titulo") {
    for (let i = idx; i >= 0; i--) {
      const fila = ordenadas[i];
      if (fila && nivelDe(fila) === "especialidad") return bloqueDe(ordenadas, fila.id)[1];
    }
    return ordenadas.length;
  }
  return bloqueDe(ordenadas, seleccionadoId)[1];
}

import type { CronogramaPartida, Periodicidad } from "@/lib/datos";

export type TipoDependencia = "FS" | "SS" | "FF";
export type Dependencia = {
  id?: string;
  predecesora_id: string;
  sucesora_id: string;
  tipo: TipoDependencia;
  desfase_dias: number;
};

export const NOMBRE_TIPO: Record<TipoDependencia, string> = {
  FS: "Fin → Inicio",
  SS: "Inicio → Inicio",
  FF: "Fin → Fin",
};

const DIA = 86400000;
export const aDia = (iso: string) => Math.round(new Date(iso + "T00:00:00Z").getTime() / DIA);
export const deDia = (n: number) => new Date(n * DIA).toISOString().slice(0, 10);

/** Inicio y fin (inclusive, ISO) de la barra: primer y último periodo con % > 0. */
export function rangoPartida(partidaId: string, cron: CronogramaPartida[], per: Periodicidad, finPeriodo: (inicio: string) => string) {
  const filas = cron
    .filter((c) => c.partida_id === partidaId && (c.periodicidad ?? "mes") === per && Number(c.pct) > 0)
    .map((c) => c.fecha_inicio)
    .sort();
  const primero = filas[0];
  const ultimo = filas[filas.length - 1];
  if (!primero || !ultimo) return null;
  return { inicio: primero, fin: finPeriodo(ultimo) };
}

export type Tarea = { id: string; inicio: number; duracion: number };
export type ResultadoCpm = {
  es: Record<string, number>;
  ef: Record<string, number>;
  ls: Record<string, number>;
  lf: Record<string, number>;
  holgura: Record<string, number>;
  criticas: Set<string>;
  fin: number;
};

/** Ruta crítica (CPM). Días enteros; EF = ES + duración (fin exclusivo). Respeta el inicio programado como mínimo. */
export function calcularCpm(tareas: Tarea[], deps: Dependencia[]): ResultadoCpm {
  const ids = new Set(tareas.map((t) => t.id));
  const validas = deps.filter((d) => ids.has(d.predecesora_id) && ids.has(d.sucesora_id));
  const n = (r: Record<string, number>, k: string) => r[k] ?? 0;
  const dur: Record<string, number> = Object.fromEntries(tareas.map((t) => [t.id, t.duracion]));
  const ini: Record<string, number> = Object.fromEntries(tareas.map((t) => [t.id, t.inicio]));
  const entrada: Record<string, number> = Object.fromEntries(tareas.map((t) => [t.id, 0]));
  validas.forEach((d) => (entrada[d.sucesora_id] = n(entrada, d.sucesora_id) + 1));
  const cola = tareas.filter((t) => n(entrada, t.id) === 0).map((t) => t.id);
  const orden: string[] = [];
  for (let id = cola.shift(); id !== undefined; id = cola.shift()) {
    orden.push(id);
    const actual = id;
    validas.filter((d) => d.predecesora_id === actual).forEach((d) => {
      entrada[d.sucesora_id] = n(entrada, d.sucesora_id) - 1;
      if (entrada[d.sucesora_id] === 0) cola.push(d.sucesora_id);
    });
  }
  if (orden.length !== tareas.length) throw new Error("Las dependencias forman un círculo");

  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};
  for (const id of orden) {
    let inicio = n(ini, id);
    validas.filter((d) => d.sucesora_id === id).forEach((d) => {
      const p = d.predecesora_id;
      const lag = Number(d.desfase_dias) || 0;
      if (d.tipo === "FS") inicio = Math.max(inicio, n(ef, p) + lag);
      else if (d.tipo === "SS") inicio = Math.max(inicio, n(es, p) + lag);
      else inicio = Math.max(inicio, n(ef, p) + lag - n(dur, id));
    });
    es[id] = inicio;
    ef[id] = inicio + n(dur, id);
  }
  const fin = tareas.length ? Math.max(...tareas.map((t) => n(ef, t.id))) : 0;
  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};
  for (const id of [...orden].reverse()) {
    let limite = fin;
    validas.filter((d) => d.predecesora_id === id).forEach((d) => {
      const s = d.sucesora_id;
      const lag = Number(d.desfase_dias) || 0;
      if (d.tipo === "FS") limite = Math.min(limite, n(ls, s) - lag);
      else if (d.tipo === "SS") limite = Math.min(limite, n(ls, s) - lag + n(dur, id));
      else limite = Math.min(limite, n(lf, s) - lag);
    });
    lf[id] = limite;
    ls[id] = limite - n(dur, id);
  }
  const holgura: Record<string, number> = {};
  const criticas = new Set<string>();
  tareas.forEach((t) => {
    const h = n(ls, t.id) - n(es, t.id);
    holgura[t.id] = h;
    if (h <= 0) criticas.add(t.id);
  });
  return { es, ef, ls, lf, holgura, criticas, fin };
}

/** Estado según avance real frente a lo programado a hoy (puntos porcentuales). */
export function estadoAvance(real: number, programado: number): "ok" | "alerta" | "atraso" {
  const dif = real - programado;
  if (dif >= -0.01) return "ok";
  if (dif > -10) return "alerta";
  return "atraso";
}

/** Domingo de Pascua (algoritmo de Meeus). Devuelve número de día. */
function pascua(anio: number) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aDia(`${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`);
}

const FIJOS: [string, string][] = [
  ["01-01", "Año Nuevo"], ["05-01", "Día del Trabajo"], ["06-07", "Batalla de Arica"], ["06-29", "San Pedro y San Pablo"],
  ["07-23", "Día de la Fuerza Aérea"], ["07-28", "Fiestas Patrias"], ["07-29", "Fiestas Patrias"], ["08-06", "Batalla de Junín"],
  ["08-30", "Santa Rosa de Lima"], ["10-08", "Combate de Angamos"], ["11-01", "Todos los Santos"], ["12-08", "Inmaculada Concepción"],
  ["12-09", "Batalla de Ayacucho"], ["12-25", "Navidad"],
];

/** Feriados nacionales de Perú del año (número de día → nombre). */
export function feriadosPeru(anio: number): Map<number, string> {
  const m = new Map<number, string>(FIJOS.map(([md, n]) => [aDia(`${anio}-${md}`), n]));
  const p = pascua(anio);
  m.set(p - 3, "Jueves Santo");
  m.set(p - 2, "Viernes Santo");
  return m;
}

/** Día de semana 0=domingo … 6=sábado. */
export const diaSemana = (dia: number) => (((dia + 4) % 7) + 7) % 7;

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export type Tramo = { inicio: number; fin: number; etiqueta: string }; // fin exclusivo

/** Cabecera de dos niveles: superior (meses o años) e inferior (días, semanas, quincenas o meses). */
export function cabeceras(d0: number, d1: number, zoom: "dia" | "semana" | "quincena" | "mes") {
  const superior: Tramo[] = [];
  const inferior: Tramo[] = [];
  const fechaDe = (n: number) => new Date(n * DIA);
  const diaDe = (a: number, m: number, d: number) => Math.round(Date.UTC(a, m, d) / DIA);
  // superior
  for (let cur = d0; cur < d1; ) {
    const f = fechaDe(cur);
    const sig = zoom === "mes" ? diaDe(f.getUTCFullYear() + 1, 0, 1) : diaDe(f.getUTCFullYear(), f.getUTCMonth() + 1, 1);
    superior.push({ inicio: cur, fin: Math.min(sig, d1), etiqueta: zoom === "mes" ? String(f.getUTCFullYear()) : `${MESES[f.getUTCMonth()]} ${f.getUTCFullYear()}` });
    cur = sig;
  }
  // inferior
  for (let cur = d0; cur < d1; ) {
    const f = fechaDe(cur);
    let sig: number;
    let etiqueta: string;
    if (zoom === "dia") { sig = cur + 1; etiqueta = String(f.getUTCDate()); }
    else if (zoom === "semana") { sig = cur + (7 - ((diaSemana(cur) + 6) % 7)); etiqueta = String(f.getUTCDate()); }
    else if (zoom === "quincena") { const pri = f.getUTCDate() <= 15; sig = pri ? diaDe(f.getUTCFullYear(), f.getUTCMonth(), 16) : diaDe(f.getUTCFullYear(), f.getUTCMonth() + 1, 1); etiqueta = pri ? "Q1" : "Q2"; }
    else { sig = diaDe(f.getUTCFullYear(), f.getUTCMonth() + 1, 1); etiqueta = MESES[f.getUTCMonth()] ?? ""; }
    inferior.push({ inicio: cur, fin: Math.min(sig, d1), etiqueta });
    cur = sig;
  }
  return { superior, inferior };
}

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

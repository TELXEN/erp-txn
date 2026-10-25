import { supabase } from "@/integrations/supabase/client";

/** Datos mínimos del trabajador para calcular beneficios sociales. */
export type TrabajadorBeneficio = {
  id: string;
  nombre?: string;
  sueldo_mensual: number | string;
  asignacion_familiar: boolean | null;
  regimen_laboral: string;
  fecha_ingreso: string | null;
  fecha_cese?: string | null;
};

export const RMV = 1230; // vigente desde 01/10/2026
export type TipoBeneficio = "CTS" | "Gratificación" | "Liquidación";

const FACTORES: Record<string, { grat: number; cts: number; vac: number }> = {
  General: { grat: 1, cts: 1, vac: 1 },
  "Construcción Civil": { grat: 1, cts: 1, vac: 1 },
  "MYPE Pequeña": { grat: 0.5, cts: 0.5, vac: 0.5 },
  "MYPE Micro": { grat: 0, cts: 0, vac: 0.5 },
  Agrario: { grat: 0, cts: 0, vac: 1 },
};
export const factores = (r: string) => FACTORES[r] ?? { grat: 1, cts: 1, vac: 1 };

const r2 = (n: number) => Math.round(n * 100) / 100;
const D = (s: string) => new Date(`${s}T00:00:00Z`);
const maxF = (a: string, b: string) => (a > b ? a : b);

/** Meses y días completos entre desde y hasta (ambos inclusive), base 30. */
export function computo(desde: string, hasta: string) {
  if (desde > hasta) return { meses: 0, dias: 0 };
  const a = D(desde);
  const b = D(hasta);
  b.setUTCDate(b.getUTCDate() + 1);
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  let dias = b.getUTCDate() - a.getUTCDate();
  if (dias < 0) { meses -= 1; dias += 30; }
  return { meses: Math.max(meses, 0), dias: Math.max(dias, 0) };
}

export const asignacionFamiliar = (t: TrabajadorBeneficio) =>
  t.asignacion_familiar && !t.regimen_laboral.startsWith("MYPE") ? RMV * 0.1 : 0;
export const remuneracionBase = (t: TrabajadorBeneficio) => Number(t.sueldo_mensual) + asignacionFamiliar(t);
const tasaBonif = (t: TrabajadorBeneficio) => (t.regimen_laboral === "Agrario" ? 0.06 : 0.09);

export function periodoGrat(anio: number, p: string) {
  return p === "Julio" ? { desde: `${anio}-01-01`, hasta: `${anio}-06-30` } : { desde: `${anio}-07-01`, hasta: `${anio}-12-31` };
}
export function periodoCts(anio: number, p: string) {
  return p === "Mayo" ? { desde: `${anio - 1}-11-01`, hasta: `${anio}-04-30` } : { desde: `${anio}-05-01`, hasta: `${anio}-10-31` };
}

export function calcGrat(t: TrabajadorBeneficio, desde: string, hasta: string) {
  const inicio = maxF(desde, t.fecha_ingreso ?? desde);
  const { meses } = computo(inicio, hasta);
  const rc = r2(remuneracionBase(t));
  const monto = r2((rc / 6) * meses * factores(t.regimen_laboral).grat);
  const bonificacion = r2(monto * tasaBonif(t));
  return { fecha_desde: inicio, fecha_hasta: hasta, meses, dias: 0, remuneracion_computable: rc, monto, bonificacion, total: r2(monto + bonificacion), detalle: {} as Record<string, number> };
}

export function calcCts(t: TrabajadorBeneficio, desde: string, hasta: string) {
  const inicio = maxF(desde, t.fecha_ingreso ?? desde);
  const { meses, dias } = computo(inicio, hasta);
  const base = remuneracionBase(t);
  const sextoGrat = factores(t.regimen_laboral).grat > 0 ? base / 6 : 0;
  const rc = r2(base + sextoGrat);
  const monto = r2(((rc / 12) * meses + (rc / 360) * dias) * factores(t.regimen_laboral).cts);
  return {
    fecha_desde: inicio, fecha_hasta: hasta, meses, dias, remuneracion_computable: rc, monto, bonificacion: 0, total: monto,
    detalle: { sueldo: r2(Number(t.sueldo_mensual)), asignacion_familiar: r2(asignacionFamiliar(t)), sexto_gratificacion: r2(sextoGrat) } as Record<string, number>,
  };
}

export function calcLiquidacion(t: TrabajadorBeneficio, cese: string) {
  const y = Number(cese.slice(0, 4));
  const m = Number(cese.slice(5, 7));
  const ingreso = t.fecha_ingreso ?? cese;
  const inicioCts = m >= 11 ? `${y}-11-01` : m >= 5 ? `${y}-05-01` : `${y - 1}-11-01`;
  const cts = calcCts(t, inicioCts, cese);
  const grat = calcGrat(t, m <= 6 ? `${y}-01-01` : `${y}-07-01`, cese);
  let aniv = `${y}${ingreso.slice(4)}`;
  if (aniv > cese) aniv = `${y - 1}${ingreso.slice(4)}`;
  if (aniv < ingreso) aniv = ingreso;
  const v = computo(aniv, cese);
  const base = r2(remuneracionBase(t));
  const vac = r2(((base / 12) * v.meses + (base / 360) * v.dias) * factores(t.regimen_laboral).vac);
  const monto = r2(cts.monto + grat.monto + vac);
  return {
    fecha_desde: ingreso, fecha_hasta: cese, meses: v.meses, dias: v.dias, remuneracion_computable: base, monto,
    bonificacion: grat.bonificacion, total: r2(monto + grat.bonificacion),
    detalle: {
      cts_trunca: cts.monto, cts_meses: cts.meses, cts_dias: cts.dias,
      gratificacion_trunca: grat.monto, grat_meses: grat.meses,
      bonificacion_extraordinaria: grat.bonificacion,
      vacaciones_truncas: vac, vac_meses: v.meses, vac_dias: v.dias,
    } as Record<string, number>,
  };
}

/** Recalcula un registro según su tipo y periodo. */
export function recalcular(t: TrabajadorBeneficio, r: { tipo: string; anio: number; periodo: string; fecha_hasta: string }) {
  if (r.tipo === "CTS") { const p = periodoCts(r.anio, r.periodo); return calcCts(t, p.desde, p.hasta); }
  if (r.tipo === "Gratificación") { const p = periodoGrat(r.anio, r.periodo); return calcGrat(t, p.desde, p.hasta); }
  return calcLiquidacion(t, r.fecha_hasta);
}

/** Si el periodo CTS anterior al indicado corresponde al trabajador, devuelve ese periodo. */
export function periodoCtsAnterior(t: TrabajadorBeneficio, anio: number, periodo: string) {
  const ant = periodo === "Noviembre" ? { anio, periodo: "Mayo" } : { anio: anio - 1, periodo: "Noviembre" };
  const rango = periodoCts(ant.anio, ant.periodo);
  if (!t.fecha_ingreso || t.fecha_ingreso > rango.hasta) return null;
  if (t.fecha_cese && t.fecha_cese < rango.hasta) return null;
  const c = calcCts(t, rango.desde, rango.hasta);
  return c.total > 0 ? { ...ant, ...c } : null;
}

/** Recalcula los beneficios pendientes de un trabajador (tras cambiar su ficha). Devuelve cuántos pagados quedaron sin cambio. */
export async function recalcularPendientes(t: TrabajadorBeneficio) {
  const { data, error } = await supabase.from("beneficios_sociales").select("*").eq("trabajador_id", t.id);
  if (error) throw error;
  let pagados = 0;
  for (const r of data ?? []) {
    if (r.estado_pago !== "Pendiente") { pagados++; continue; }
    const nuevo = recalcular(t, r);
    const { error: e } = await supabase.from("beneficios_sociales").update(nuevo).eq("id", r.id);
    if (e) throw e;
  }
  return pagados;
}

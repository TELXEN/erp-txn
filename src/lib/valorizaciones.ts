// Cálculo puro de valorizaciones de obra (sin acceso a datos).
export const IGV_VALORIZACION = 0.18;

const r2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export type ItemValorizacion = {
  metrado_contratado: number;
  precio_unitario: number;
  metrado_anterior: number;
  metrado_actual: number;
};

/** Máximo metrado que se puede valorizar en el período sin pasar el 100 % contratado. */
export function metradoMaximo(it: Pick<ItemValorizacion, "metrado_contratado" | "metrado_anterior">) {
  return Math.max(0, it.metrado_contratado - it.metrado_anterior);
}

export function limitarMetrado(it: Pick<ItemValorizacion, "metrado_contratado" | "metrado_anterior">, valor: number) {
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.min(valor, metradoMaximo(it));
}

/** Metrado sugerido desde el % de avance físico actual menos lo ya valorizado. */
export function metradoSugerido(contratado: number, avancePct: number, anterior: number) {
  const ejecutado = (contratado * Math.min(Math.max(avancePct, 0), 100)) / 100;
  return Math.round(Math.max(0, ejecutado - anterior) * 10000) / 10000;
}

export function filaValorizacion(it: ItemValorizacion) {
  const contratado = it.metrado_contratado * it.precio_unitario;
  const anterior = it.metrado_anterior * it.precio_unitario;
  const actual = it.metrado_actual * it.precio_unitario;
  const acumMetrado = it.metrado_anterior + it.metrado_actual;
  const pctDe = (m: number) => (it.metrado_contratado > 0 ? (m / it.metrado_contratado) * 100 : 0);
  return {
    contratado: r2(contratado),
    anterior: r2(anterior),
    actual: r2(actual),
    acumulado: r2(anterior + actual),
    saldo: r2(contratado - anterior - actual),
    pctAnterior: pctDe(it.metrado_anterior),
    pctActual: pctDe(it.metrado_actual),
    pctAcumulado: pctDe(acumMetrado),
    metradoAcumulado: acumMetrado,
    metradoSaldo: it.metrado_contratado - acumMetrado,
  };
}

export type Porcentajes = { pct_gg: number; pct_utilidad: number; pct_adelanto: number; pct_retencion: number };

export function resumenValorizacion(costoDirecto: number, p: Porcentajes) {
  const cd = r2(costoDirecto);
  const gg = r2((cd * p.pct_gg) / 100);
  const utilidad = r2((cd * p.pct_utilidad) / 100);
  const subtotal = r2(cd + gg + utilidad);
  const adelanto = r2((subtotal * p.pct_adelanto) / 100);
  const base = r2(subtotal - adelanto);
  const igv = r2(base * IGV_VALORIZACION);
  const total = r2(base + igv);
  const retencion = r2((base * p.pct_retencion) / 100);
  const neto = r2(total - retencion);
  return { cd, gg, utilidad, subtotal, adelanto, base, igv, total, retencion, neto };
}

export type FirmaValorizacion = { firma_nombre: string; firma_cargo: string; firma_fecha: string | null };

/** La aprobación exige la firma de conformidad del supervisor del cliente. */
export function faltaFirma(f: FirmaValorizacion) {
  return !f.firma_nombre.trim() || !f.firma_cargo.trim() || !f.firma_fecha;
}

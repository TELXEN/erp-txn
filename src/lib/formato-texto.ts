// Formato automático de textos del ERP (oración, título, cargo, unidad, mayúsculas).
export type ModoFormato = "oracion" | "titulo" | "cargo" | "unidad" | "mayusculas" | "marca";

const SIGLAS = new Set([
  "PVC", "HVAC", "LED", "IP65", "ASTM", "ISO", "HA-25", "AC", "DC", "BIM", "CAD", "ERP", "API",
  "AWG", "ABB", "PAT", "S.R.L.", "S.A.", "THW", "THHN", "NTP", "SAC", "S.A.C.", "SRL", "EIRL", "SA", "IGV", "SUNAT", "RUC", "DNI",
  "NYY", "N2XOH", "LSOH", "HDPE", "CPVC", "UPS", "PLC", "SCADA", "CCTV", "UTP", "FTP", "TV",
  "MT", "BT", "AT", "IEC", "NEC", "NFPA", "ANSI", "IEEE", "EPP", "SST", "SCTR", "EMO", "GLP",
  "APU", "WBS", "PDF", "USB", "WIFI", "GPS", "TELXEN", "XLPE", "EMT", "IMC", "TW",
]);
const MINUSCULAS_TITULO = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "con", "para", "por", "a", "al", "sin", "sobre",
  "un", "una", "unos", "unas", "entre", "hacia", "desde", "hasta", "contra", "según", "tras", "ante", "bajo", "ni",
]);
const ROMANOS = /^(?=[MDCLXVI])M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/;

/** Una palabra que contiene dígitos (IP65, 12AWG, 3x10mm²) o es sigla/romano se respeta. */
function esProtegida(palabra: string) {
  const limpia = palabra.replace(/^[("'¿¡]+|[)"'.,;:!?]+$/g, "");
  if (!limpia) return false;
  const up = limpia.toUpperCase();
  if (SIGLAS.has(up)) return true;
  if (/\d/.test(limpia)) return true;
  if (limpia.length > 1 && ROMANOS.test(up) && limpia === up && up !== "DI" && up !== "MI") return true;
  return false;
}

function normalizarProtegida(palabra: string) {
  return palabra.replace(/[\p{L}\d.-]+/u, (m) => {
    const up = m.toUpperCase();
    if (SIGLAS.has(up)) return up;
    if (/\d/.test(m)) return m === m.toLowerCase() ? m : up.replace(/MM²|MM2/g, (x) => x.toLowerCase());
    return up;
  });
}

const capital = (p: string) => p.replace(/\p{L}/u, (c) => c.toUpperCase());

/** ¿El texto está mayormente en mayúsculas? (se reformatea) */
function gritado(t: string) {
  const letras = t.replace(/[^\p{L}]/gu, "");
  if (letras.length < 3) return false;
  const may = letras.replace(/[^\p{Lu}]/gu, "").length;
  return may / letras.length > 0.6;
}

export function formatearTexto(texto: string, modo: ModoFormato): string {
  if (texto == null) return texto;
  const original = String(texto);
  const t = original.replace(/\s+/g, " ").trim();
  if (!t) return t;
  if (modo === "marca") return capital(t);
  if (modo === "unidad") return normalizarUnidad(t);
  if (modo === "mayusculas") return t.toUpperCase();

  const palabras = t.split(" ");
  let inicioOracion = true;
  const salida = palabras.map((p, i) => {
    let r: string;
    if (esProtegida(p)) r = normalizarProtegida(p);
    else {
      const min = p.toLowerCase();
      if (modo === "titulo") r = i > 0 && MINUSCULAS_TITULO.has(min) ? min : capital(min);
      else r = inicioOracion ? capital(min) : min;
    }
    if (modo === "oracion") inicioOracion = /[.!?]$/.test(p);
    else inicioOracion = false;
    return r;
  });
  return salida.join(" ");
}

/** Palabra con mayúsculas anómalas: una minúscula seguida de mayúscula (motoRES, cabLE). */
function anomala(p: string) {
  return !esProtegida(p) && /\p{Ll}\p{Lu}/u.test(p);
}

/** Sólo reformatea si el texto viene gritado (evita deshacer nombres propios bien escritos);
 *  las palabras con mayúsculas anómalas se pasan siempre a minúsculas. */
export function formatearSiGritado(texto: string, modo: ModoFormato) {
  if (modo === "unidad") return normalizarUnidad(texto);
  if (modo === "oracion" && !gritado(texto)) {
    const t = texto
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((p) => (anomala(p) ? p.toLowerCase() : p))
      .join(" ");
    return t ? capital(t) : t;
  }
  return formatearTexto(texto, modo);
}

const UNIDADES: Record<string, string> = {
  kw: "kW", mw: "MW", w: "W", kva: "kVA", mpa: "MPa", kpa: "kPa", pa: "Pa", psi: "psi", bar: "bar",
  m: "m", m2: "m²", "m²": "m²", m3: "m³", "m³": "m³", cm: "cm", mm: "mm", km: "km", ml: "ml",
  kg: "kg", g: "g", ton: "ton", t: "ton", h: "h", hh: "H-H", "h-h": "H-H", hm: "H-M", "h-m": "H-M", min: "min", mes: "mes",
  dia: "día", "día": "día", und: "und", u: "und", unid: "und", glb: "GLB", gl: "gl", l: "L", lt: "L",
  v: "V", kv: "kV", a: "A", pto: "pto", par: "par", jgo: "jgo", rll: "rll", bls: "bls", pza: "pza",
};
export function normalizarUnidad(texto: string) {
  const t = texto.trim();
  const k = t.toLowerCase().replace(/\.$/, "");
  return UNIDADES[k] ?? t;
}
export const unidadValida = (t: string) => /^[\p{L}²³%/.\-\d ]{1,12}$/u.test(t.trim());

const COLADOR_ES = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** Orden alfabético A→Z en español: ignora mayúsculas y tildes; la ñ no se separa de la N. */
export function ordenarPorNombre<T extends { nombre: string }>(filas: T[]): T[] {
  return [...filas].sort((a, b) => COLADOR_ES.compare(a.nombre ?? "", b.nombre ?? ""));
}

/** Clave para detectar nombres repetidos: mayúsculas, tildes y espacios de más no cuentan. */
export function claveNombre(texto: string) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}


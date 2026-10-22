import { unzipSync, strFromU8 } from "fflate";

const SEG = "https://api-seguridad.sunat.gob.pe/v1/clientessol";
const API = "https://api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros";

export type Libro = "RVIE" | "RCE";
export type Cred = { ruc: string; client_id: string; usuario_sol: string; client_secret: string; clave_sol: string };

export class SunatError extends Error {}

export async function cargarCredenciales(): Promise<Cred> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: cfg }, { data: cred }] = await Promise.all([
    supabaseAdmin.from("sire_config").select("ruc, client_id, usuario_sol").limit(1).maybeSingle(),
    supabaseAdmin.from("sire_credenciales").select("client_secret, clave_sol").limit(1).maybeSingle(),
  ]);
  if (!cfg?.ruc || !cfg.client_id || !cfg.usuario_sol || !cred?.client_secret || !cred.clave_sol)
    throw new SunatError("Completa primero la Configuración API SOL (RUC, Client ID, Client Secret, Usuario SOL y Clave SOL).");
  return { ...cfg, client_secret: cred.client_secret, clave_sol: cred.clave_sol };
}

export async function obtenerToken(c: Cred, scope = "https://api-sire.sunat.gob.pe"): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "password",
    scope,
    client_id: c.client_id,
    client_secret: c.client_secret,
    username: `${c.ruc}${c.usuario_sol}`,
    password: c.clave_sol,
  });
  let r: Response;
  try {
    r = await fetch(`${SEG}/${encodeURIComponent(c.client_id)}/oauth2/token/`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
  } catch {
    throw new SunatError("No se pudo contactar a SUNAT. Intenta en unos minutos.");
  }
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; error_description?: string; msg?: string };
  if (!r.ok || !j.access_token) {
    console.error("SUNAT token", r.status, j);
    throw new SunatError(`SUNAT rechazó las credenciales${j.error_description || j.msg ? `: ${j.error_description ?? j.msg}` : ""}. Revisa Client ID, Client Secret, Usuario y Clave SOL.`);
  }
  return j.access_token;
}

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const txt = await r.text();
  let j: any = {};
  try { j = JSON.parse(txt); } catch { /* no json */ }
  if (!r.ok) {
    console.error("SUNAT api", path, r.status, txt.slice(0, 500));
    const errs = (Array.isArray(j?.errors) ? j.errors : []) as { cod?: string | number; msg?: string }[];
    const detalle = errs.map((e) => e.msg).filter(Boolean).join(" · ");
    const msg = detalle || j?.msg || j?.message;
    if (r.status === 401) throw new SunatError("La sesión con SUNAT expiró o no tiene permiso para el SIRE.");
    if (r.status >= 500) throw new SunatError("El servicio SIRE de SUNAT no está disponible en este momento.");
    const err = new SunatError(msg ? `SUNAT: ${msg}` : `SUNAT respondió con error ${r.status}.`);
    (err as SunatError & { codigos?: string[] }).codigos = errs.map((e) => String(e.cod ?? ""));
    throw err;
  }
  return j as T;
}

export async function solicitarPropuesta(token: string, libro: Libro, per: string): Promise<string> {
  const path = libro === "RVIE"
    ? `/rvie/propuesta/web/propuesta/${per}/exportapropuesta?codTipoArchivo=0`
    : `/rce/propuesta/web/propuesta/${per}/exportacioncomprobantepropuesta?codTipoArchivo=0&codOrigenEnvio=2`;
  const j = await api<{ numTicket?: string }>(token, path);
  if (!j.numTicket) throw new SunatError("SUNAT no devolvió ticket. Puede que el período aún no tenga propuesta.");
  return j.numTicket;
}

type Reporte = { nomArchivoReporte: string; codTipoAchivoReporte?: string; codTipoArchivoReporte?: string };
export async function consultarTicket(token: string, per: string, ticket: string) {
  const j = await api<{ registros?: { codEstadoProceso?: string; desEstadoProceso?: string; codProceso?: string; archivoReporte?: Reporte[] }[] }>(
    token, `/rvierce/gestionprocesosmasivos/web/masivo/consultaestadotickets?perIni=${per}&perFin=${per}&page=1&perPage=20&numTicket=${ticket}`);
  const reg = j.registros?.[0];
  return {
    terminado: reg?.codEstadoProceso === "06",
    error: reg?.codEstadoProceso === "07" || reg?.codEstadoProceso === "08",
    estado: reg?.desEstadoProceso ?? "En proceso",
    codProceso: reg?.codProceso ?? "10",
    archivo: reg?.archivoReporte?.[0],
  };
}

export async function descargarArchivo(token: string, libro: Libro, per: string, ticket: string, codProceso: string, a: Reporte): Promise<string> {
  const q = new URLSearchParams({
    nomArchivoReporte: a.nomArchivoReporte,
    codTipoArchivoReporte: a.codTipoArchivoReporte ?? a.codTipoAchivoReporte ?? "00",
    codLibro: libro === "RVIE" ? "140000" : "080000",
    perTributario: per, codProceso, numTicket: ticket,
  });
  const r = await fetch(`${API}/rvierce/gestionprocesosmasivos/web/masivo/archivoreporte?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new SunatError("No se pudo descargar el archivo de la propuesta.");
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const files = unzipSync(buf);
    const nombre = Object.keys(files).find((n) => n.toLowerCase().endsWith(".txt")) ?? Object.keys(files)[0];
    if (!nombre) throw new SunatError("El archivo de SUNAT está vacío.");
    return strFromU8(files[nombre]!);
  }
  return strFromU8(buf);
}

export async function aceptarPropuesta(token: string, libro: Libro, per: string) {
  const path = libro === "RVIE"
    ? `/rvie/propuesta/web/propuesta/${per}/aceptapropuesta`
    : `/rce/propuesta/web/propuesta/${per}/aceptapropuesta`;
  return api<{ numTicket?: string }>(token, path, { method: "POST", body: "{}" });
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (v?: string) => { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };

export type ItemSunat = {
  clave: string; fecha: string; vencimiento: string; tipo: string; serie: string; numero: string; serie_numero: string;
  ruc: string; razon: string; base: number; igv: number; no_gravado: number; isc: number; otros: number; total: number;
  moneda: string; tipo_cambio: number; raw: Record<string, string>;
};

function aIso(f: string) {
  const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : f;
}

export function parsearTxt(txt: string): ItemSunat[] {
  const lineas = txt.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return [];
  const cab = lineas[0]!.split("|").map((h) => h.trim());
  const nc = cab.map(norm);
  const col = (...pats: string[]) => { for (const p of pats) { const i = nc.findIndex((h) => h.includes(p)); if (i >= 0) return i; } return -1; };
  const idx = {
    fecha: col("fechadeemision", "fecemision", "fechaemision"),
    venc: col("fechavcto", "fechadevenc", "fecvencimiento", "fechavencimiento"),
    tipo: col("tipocp", "tipodecp", "tipocomprobante"),
    serie: col("seriedelcdp", "seriecdp", "seriecp", "serie"),
    numero: col("nrocpodocnroinicial", "nrocp", "nrodecp", "numerocp", "nrocpodoc"),
    ruc: col("nrodocidentidad", "nrodocumentoidentidad", "nrodoc"),
    razon: col("apellidosnombresrazonsocial", "razonsocial", "apellidosnombres"),
    base: col("bigravadadg", "bigravada", "baseimponible"),
    igv: col("igvipmdg", "igvipm", "igv"),
    nog: col("valoradqng", "mtoexonerado", "exonerado", "inafecto"),
    isc: col("isc"),
    otros: col("otrostrib", "otroscargos", "otros"),
    total: col("totalcp", "importetotal", "total"),
    moneda: col("moneda", "codmoneda"),
    tc: col("tipodecambio", "tipocambio"),
  };
  const todos = (pred: (h: string) => boolean) => nc.map((h, i) => (pred(h) ? i : -1)).filter((i) => i >= 0);
  const basesIdx = todos((h) => /^bi(gravad|adq)/.test(h) || h.startsWith("baseimponible"));
  const igvIdx = todos((h) => h.startsWith("igv"));
  return lineas.slice(1).map((l) => {
    const v = l.split("|").map((x) => x.trim());
    const g = (i: number) => (i >= 0 ? v[i] ?? "" : "");
    const suma = (ids: number[]) => ids.reduce((s, i) => s + num(g(i)), 0);
    const raw: Record<string, string> = {};
    cab.forEach((h, i) => { if (h) raw[h] = v[i] ?? ""; });
    const serie = g(idx.serie), numero = g(idx.numero), tipo = g(idx.tipo);
    const sn = `${serie}-${numero}`.toUpperCase();
    const total = num(g(idx.total)), nog = num(g(idx.nog)), isc = num(g(idx.isc)), otros = num(g(idx.otros));
    const igv = igvIdx.length ? suma(igvIdx) : num(g(idx.igv));
    let base = basesIdx.length ? suma(basesIdx) : num(g(idx.base));
    if (!base && total) base = Math.round((total - igv - nog - isc - otros) * 100) / 100;
    return {
      clave: `${tipo}|${sn}`, fecha: aIso(g(idx.fecha)), vencimiento: aIso(g(idx.venc)), tipo, serie, numero, serie_numero: sn,
      ruc: g(idx.ruc), razon: g(idx.razon), base, igv, no_gravado: nog,
      isc, otros, total, moneda: g(idx.moneda) || "PEN", tipo_cambio: num(g(idx.tc)) || 1, raw,
    };
  }).filter((i) => i.serie || i.numero);
}

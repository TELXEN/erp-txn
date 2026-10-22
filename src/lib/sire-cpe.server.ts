import { unzipSync, strFromU8 } from "fflate";

const CPE = "https://api-cpe.sunat.gob.pe/v1/contribuyente/consultacpe/comprobantes";
export const SCOPE_CPE = "https://api-cpe.sunat.gob.pe";

export type Archivo = { bytes: Uint8Array; ext: "xml" | "pdf" | "zip"; mime: string };

function b64(s: string) {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

function detectar(u: Uint8Array): Archivo | null {
  if (u.length < 4) return null;
  if (u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46) return { bytes: u, ext: "pdf", mime: "application/pdf" };
  if (u[0] === 0x50 && u[1] === 0x4b) return { bytes: u, ext: "zip", mime: "application/zip" };
  const head = strFromU8(u.slice(0, 200)).trimStart();
  if (head.startsWith("<")) return { bytes: u, ext: "xml", mime: "application/xml" };
  return null;
}

/** Descarga un archivo de un comprobante recibido. tipoArchivo: 01 PDF, 02 XML, 03 CDR. Devuelve null si no existe. */
export async function descargarCpe(token: string, ruc: string, tipo: string, serie: string, numero: string, tipoArchivo: "01" | "02" | "03"): Promise<Archivo | null> {
  const id = [ruc, tipo, serie, numero].map((x) => String(x ?? "").trim());
  if (id.some((x) => !x || !/^[A-Za-z0-9]+$/.test(x))) throw new Error("Datos del comprobante incompletos para consultar SUNAT");
  const url = `${CPE}/${id.map(encodeURIComponent).join("-")}-2/${tipoArchivo}`;
  let r: Response | null = null;
  let causa = "";
  for (let intento = 0; intento < 3 && !r; intento++) {
    try {
      r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "*/*", "User-Agent": "Mozilla/5.0 (compatible; ERP-TELXEN/1.0)" }, signal: AbortSignal.timeout(25000) });
    } catch (e) {
      causa = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error("SUNAT CPE fetch", tipoArchivo, url.replace(CPE, ""), causa);
    }
  }
  if (!r) throw new Error(`SUNAT no respondió; vuelve a intentar (${causa.slice(0, 80)})`);
  if (r.status === 404 || r.status === 204) return null;
  if (!r.ok) {
    const cuerpo = (await r.text().catch(() => "")).slice(0, 300);
    console.error("SUNAT CPE", tipoArchivo, r.status, cuerpo);
    let msg = "";
    try { const j = JSON.parse(cuerpo); msg = j?.errors?.map((x: any) => x.desError ?? x.msg).join(" · ") || j?.msg || j?.message || "";
      if (j?.errors?.some((x: any) => String(x.codError) === "113")) return null; // SUNAT: sin resultados
    } catch { /* */ }
    if (r.status === 401 || r.status === 403) throw new Error(`Credenciales sin permiso de consulta de comprobantes en SUNAT${msg ? `: ${msg}` : ""}`);
    if (r.status === 422 && /no existe|no se encontr/i.test(msg)) return null;
    throw new Error(`SUNAT respondió ${r.status}${msg ? `: ${msg}` : ""}`);
  }
  const u = new Uint8Array(await r.arrayBuffer());
  const directo = detectar(u);
  if (directo) return directo;
  try {
    const j = JSON.parse(strFromU8(u)) as Record<string, unknown>;
    const val = (j["valArchivo"] ?? j["archivo"] ?? j["contenido"] ?? (j as any).data?.valArchivo) as string | undefined;
    if (val) return detectar(b64(val));
  } catch { /* no json */ }
  return null;
}

/** Si el ZIP del XML trae la constancia (archivo R-*.xml), la devuelve como CDR. */
export function cdrDe(a: Archivo): Archivo | null {
  if (a.ext !== "zip") return null;
  const f = unzipSync(a.bytes);
  const n = Object.keys(f).find((k) => /(^|\/)R-.*\.xml$/i.test(k));
  return n ? { bytes: f[n]!, ext: "xml", mime: "application/xml" } : null;
}

/** Si es ZIP, extrae el primer XML. */
export function xmlDe(a: Archivo): string | null {
  if (a.ext === "xml") return strFromU8(a.bytes);
  if (a.ext === "zip") {
    const f = unzipSync(a.bytes);
    const n = Object.keys(f).find((k) => k.toLowerCase().endsWith(".xml") && !/(^|\/)R-/i.test(k)) ?? Object.keys(f).find((k) => k.toLowerCase().endsWith(".xml"));
    return n ? strFromU8(f[n]!) : null;
  }
  return null;
}

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  return m ? m[1]!.replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
};
const attr = (xml: string, name: string, a: string) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*\\b${a}="([^"]*)"`));
  return m?.[1] ?? "";
};
const bloques = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[\\s\\S]*?</(?:\\w+:)?${name}>`, "g")) ?? [];
const n = (s: string) => Number(s) || 0;

export type ItemXml = { codigo: string | null; descripcion: string; unidad: string; cantidad: number; precio_unitario: number; valor: number };

const limpio = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const todos = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "g"))].map((m) => limpio(m[1]!));

/** Parser UBL 2.1 (Perú): extrae ítems de cac:InvoiceLine / CreditNoteLine / DebitNoteLine. */
export function parsearUbl(xml: string) {
  const lineas = [...bloques(xml, "InvoiceLine"), ...bloques(xml, "CreditNoteLine"), ...bloques(xml, "DebitNoteLine")];
  const items: ItemXml[] = lineas.map((l) => {
    const cant = n(tag(l, "InvoicedQuantity") || tag(l, "CreditedQuantity") || tag(l, "DebitedQuantity"));
    const valor = n(tag(l, "LineExtensionAmount"));
    const item = bloques(l, "Item")[0] ?? "";
    const sellers = bloques(item, "SellersItemIdentification")[0];
    // cac:Price directo (no PricingReference, que trae el precio con IGV)
    const sinRef = l.replace(/<(?:\w+:)?PricingReference\b[\s\S]*?<\/(?:\w+:)?PricingReference>/g, "");
    const precio = bloques(sinRef, "Price")[0];
    return {
      codigo: sellers ? limpio(tag(sellers, "ID")) || null : null,
      descripcion: todos(item, "Description").join(" ") || limpio(tag(l, "Description")),
      unidad: attr(l, "InvoicedQuantity", "unitCode") || attr(l, "CreditedQuantity", "unitCode") || attr(l, "DebitedQuantity", "unitCode") || "NIU",
      cantidad: cant,
      precio_unitario: precio ? n(tag(precio, "PriceAmount")) : cant ? valor / cant : 0,
      valor,
    };
  });
  const sinLineas = xml.replace(/<(?:\w+:)?(?:Invoice|CreditNote|DebitNote)Line\b[\s\S]*$/, "");
  const id = limpio(tag(sinLineas, "ID"));
  const [serie = "", numero = ""] = id.split("-");
  const sup = bloques(xml, "AccountingSupplierParty")[0] ?? "";
  const emisorRuc = limpio(tag(sup, "ID"));
  return { moneda: tag(xml, "DocumentCurrencyCode") || "PEN", fecha: tag(xml, "IssueDate"), serie, numero, emisorRuc, items };
}

/** Comprueba que el XML corresponde al comprobante del SIRE. */
export function coincide(u: ReturnType<typeof parsearUbl>, ruc: string, serie: string, numero: string) {
  const num = (s: string) => String(Number(s) || s);
  return (!u.emisorRuc || u.emisorRuc === ruc) && (!u.serie || u.serie.toUpperCase() === serie.toUpperCase()) && (!u.numero || num(u.numero) === num(numero));
}

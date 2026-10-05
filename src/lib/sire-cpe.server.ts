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
  let r: Response;
  try {
    r = await fetch(`${CPE}/${id.map(encodeURIComponent).join("-")}-2/${tipoArchivo}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    console.error("SUNAT CPE fetch", e);
    throw new Error("No disponible en SUNAT (servicio de consulta no respondió)");
  }
  if (r.status === 404 || r.status === 204) return null;
  if (r.status === 401 || r.status === 403) throw new Error("SUNAT no autorizó la descarga (revisa que las credenciales API tengan acceso a consulta de comprobantes).");
  if (!r.ok) throw new Error(`SUNAT respondió ${r.status}`);
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

/** Si es ZIP, extrae el primer XML. */
export function xmlDe(a: Archivo): string | null {
  if (a.ext === "xml") return strFromU8(a.bytes);
  if (a.ext === "zip") {
    const f = unzipSync(a.bytes);
    const n = Object.keys(f).find((k) => k.toLowerCase().endsWith(".xml"));
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

export type ItemXml = { descripcion: string; unidad: string; cantidad: number; precio_unitario: number; valor: number };

export function parsearUbl(xml: string) {
  const lineas = [...bloques(xml, "InvoiceLine"), ...bloques(xml, "CreditNoteLine"), ...bloques(xml, "DebitNoteLine")];
  const items: ItemXml[] = lineas.map((l) => {
    const cant = n(tag(l, "InvoicedQuantity") || tag(l, "CreditedQuantity") || tag(l, "DebitedQuantity"));
    const valor = n(tag(l, "LineExtensionAmount"));
    const precio = bloques(l, "Price")[0];
    return {
      descripcion: tag(l, "Description").replace(/\s+/g, " "),
      unidad: attr(l, "InvoicedQuantity", "unitCode") || attr(l, "CreditedQuantity", "unitCode") || "NIU",
      cantidad: cant,
      precio_unitario: precio ? n(tag(precio, "PriceAmount")) : cant ? valor / cant : 0,
      valor,
    };
  });
  return { moneda: tag(xml, "DocumentCurrencyCode") || "PEN", fecha: tag(xml, "IssueDate"), items };
}

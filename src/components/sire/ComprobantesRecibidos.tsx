import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { zipSync } from "fflate";
import { Download, FileCode2, FileText, ShieldCheck, FolderDown, ClipboardCheck, XCircle, Printer, Paperclip, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Boton, Select } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import { descargarComprobantesSire } from "@/lib/sire.functions";

type ItemRce = { clave: string; fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string; base: number; igv: number; total_sunat: number | null; moneda?: string; tipo_cambio?: number };
type Recibido = {
  id: string; ruc_emisor: string; razon_emisor: string; tipo: string; serie: string; numero: string; fecha: string | null;
  moneda: string; tipo_cambio: number; base: number; igv: number; total: number;
  xml_path: string | null; pdf_path: string | null; cdr_path: string | null; estado_descarga: string; error: string | null; registrado_en: string | null;
};
const BUCKET = "comprobantes-compra";
const claveDe = (ruc: string, tipo: string, serie: string, numero: string) => `${ruc}-${tipo}-${serie}-${numero}`.toUpperCase();
function partes(sn: string) { const i = sn.lastIndexOf("-"); return { serie: sn.slice(0, i), numero: sn.slice(i + 1).replace(/^0+(?=\d)/, "") }; }

export function ComprobantesRecibidos({ periodo, items }: { periodo: string; items: ItemRce[] }) {
  const qc = useQueryClient();
  const descargar$ = useServerFn(descargarComprobantesSire);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [prog, setProg] = useState<{ h: number; t: number } | null>(null);
  const [registrar, setRegistrar] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const qk = ["sire-recibidos", periodo];
  const { data: recibidos = [] } = useQuery({
    queryKey: qk,
    queryFn: async () => ((await supabase.from("comprobantes_recibidos").select("*").eq("periodo", periodo)).data ?? []) as Recibido[],
  });
  const porClave = useMemo(() => new Map(recibidos.map((r) => [claveDe(r.ruc_emisor, r.tipo, r.serie, r.numero), r])), [recibidos]);
  const filas = items.filter((i) => i.ruc && i.serie_numero.includes("-")).map((i) => {
    const p = partes(i.serie_numero);
    const k = claveDe(i.ruc, i.tipo, p.serie, p.numero);
    return { k, i, ...p, r: porClave.get(k) };
  });
  const todos = filas.length > 0 && filas.every((f) => sel.has(f.k));

  async function descargar(soloFallidas = false) {
    const objetivo = filas.filter((f) => (soloFallidas ? f.r && f.r.estado_descarga !== "Descargado" : sel.has(f.k)));
    if (!objetivo.length) { toast.info("Selecciona comprobantes"); return; }
    setProg({ h: 0, t: objetivo.length });
    let ok = 0, err = 0;
    for (let x = 0; x < objetivo.length; x += 10) {
      const lote = objetivo.slice(x, x + 10).map(({ i, serie, numero }) => ({
        ruc: i.ruc, razon: i.razon ?? "", tipo: i.tipo, serie, numero, fecha: i.fecha ?? "", moneda: i.moneda || "PEN",
        tipo_cambio: i.tipo_cambio || 1, base: i.base, igv: i.igv, total: i.total_sunat ?? 0,
      }));
      try {
        const r = await descargar$({ data: { periodo, docs: lote } });
        if (r.error) { toast.error(r.error); break; }
        r.resultados.forEach((z) => (z.ok ? ok++ : err++));
      } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); break; }
      setProg({ h: Math.min(x + 10, objetivo.length), t: objetivo.length });
      await qc.invalidateQueries({ queryKey: qk });
    }
    setProg(null);
    toast[err ? "warning" : "success"](`${ok} descargados${err ? ` · ${err} con problemas` : ""}`);
  }

  async function abrir(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function zip() {
    const paths = recibidos.flatMap((r) => [r.xml_path, r.pdf_path, r.cdr_path].filter(Boolean) as string[]);
    if (!paths.length) { toast.info("Aún no hay archivos descargados"); return; }
    const files: Record<string, Uint8Array> = {};
    for (const p of paths) {
      const { data } = await supabase.storage.from(BUCKET).download(p);
      if (data) files[p.split("/").pop()!] = new Uint8Array(await data.arrayBuffer());
    }
    const blob = new Blob([zipSync(files) as BlobPart], { type: "application/zip" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `compras-${periodo}.zip`; a.click();
  }

  async function adjuntar(k: string, i: ItemRce, f: File) {
    const ext = f.name.toLowerCase().endsWith(".xml") ? "xml" : "pdf";
    const path = `${periodo}/${k}.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, f, { upsert: true, contentType: ext === "xml" ? "application/xml" : "application/pdf" });
    if (up.error) { toast.error("No se pudo adjuntar: " + up.error.message); return; }
    const p = partes(i.serie_numero);
    const { data: cab, error } = await supabase.from("comprobantes_recibidos").upsert({
      periodo, ruc_emisor: i.ruc, razon_emisor: i.razon ?? "", tipo: i.tipo, serie: p.serie, numero: p.numero,
      fecha: i.fecha || null, moneda: i.moneda || "PEN", tipo_cambio: i.tipo_cambio || 1, base: i.base, igv: i.igv, total: i.total_sunat ?? 0,
      ...(ext === "xml" ? { xml_path: path } : { pdf_path: path }), error: null,
    }, { onConflict: "ruc_emisor,tipo,serie,numero" }).select("id").single();
    if (error) { toast.error(error.message); return; }
    if (ext === "xml" && cab) {
      // Leer las líneas reales emitidas por el proveedor desde el XML UBL
      const doc = new DOMParser().parseFromString(await f.text(), "application/xml");
      const hijos = (el: Element, nombre: string) => Array.from(el.getElementsByTagName("*")).filter((x) => x.localName === nombre);
      const txt = (el: Element, nombre: string) => hijos(el, nombre)[0]?.textContent?.trim() ?? "";
      const lineas = hijos(doc.documentElement, "InvoiceLine").concat(hijos(doc.documentElement, "CreditNoteLine"), hijos(doc.documentElement, "DebitNoteLine"));
      const filas = lineas.map((l, n) => {
        const cantEl = hijos(l, "InvoicedQuantity")[0] ?? hijos(l, "CreditedQuantity")[0] ?? hijos(l, "DebitedQuantity")[0];
        const item = Array.from(l.children).find((x) => x.localName === "Item") ?? l;
        const desc = Array.from(item.children).filter((x) => x.localName === "Description").map((d) => d.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ");
        const sellers = Array.from(item.children).find((x) => x.localName === "SellersItemIdentification");
        const precio = Array.from(l.children).find((x) => x.localName === "Price");
        return { comprobante_id: cab.id, orden: n + 1, origen: "adjunto", codigo: sellers ? txt(sellers, "ID") || null : null, descripcion: desc || "—", unidad: cantEl?.getAttribute("unitCode") ?? "", cantidad: Number(cantEl?.textContent || 0), precio_unitario: Number(precio ? txt(precio, "PriceAmount") : 0), valor: Number(Array.from(l.children).find((x) => x.localName === "LineExtensionAmount")?.textContent || 0) };
      });
      if (filas.length) {
        await supabase.from("comprobantes_recibidos_items").delete().eq("comprobante_id", cab.id);
        const r = await supabase.from("comprobantes_recibidos_items").insert(filas);
        if (r.error) toast.error("No se pudieron leer los ítems: " + r.error.message);
      }
    }
    toast.success(ext === "xml" ? "XML adjuntado: la factura usará la descripción emitida" : "Comprobante original adjuntado");
    qc.invalidateQueries({ queryKey: qk });
  }

  async function ficha(i: ItemRce, r?: Recibido) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write("<p style='font-family:Arial;padding:24px'>Preparando factura…</p>");
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const m = (n: number) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmt = (v?: string | null) => { if (!v) return "—"; const s = String(v).slice(0, 10); const [a, b, c] = s.split("-"); return a && b && c && a.length === 4 ? `${c}/${b}/${a}` : s; };
    const raw = ((i as any).raw ?? {}) as Record<string, unknown>;
    const vencRaw = String((i as any).vencimiento || raw["fecvencpag"] || raw["fechavencimiento"] || "").trim();
    const moneda = (i.moneda === "USD" ? "USD" : "PEN") as "PEN" | "USD";
    const sim = moneda === "USD" ? "US$" : "S/";
    const nog = Number((i as any).no_gravado || 0), isc = Number((i as any).isc || 0), otros = Number((i as any).otros || 0);
    const total = Number(i.total_sunat ?? i.base + i.igv);
    const toDate = (s: string) => { const p = s.includes("/") ? s.split("/").reverse().join("-") : s.slice(0, 10); const d = new Date(p + "T00:00:00"); return isNaN(+d) ? null : d; };
    const fe = toDate(String(i.fecha || "")), fv = vencRaw ? toDate(vencRaw) : null;
    const plazo = fe && fv ? Math.round((+fv - +fe) / 86400000) : 0;
    const condicion = fv && plazo > 0 ? `Crédito a ${plazo} días` : "Contado";
    const [{ data: emp }, { data: prov }, its] = await Promise.all([
      supabase.from("empresa_config").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("terceros").select("razon_social, direccion").eq("numero_documento", i.ruc).maybeSingle(),
      r ? supabase.from("comprobantes_recibidos_items").select("*").eq("comprobante_id", r.id).order("orden").then((x) => x.data ?? []) : Promise.resolve([] as any[]),
    ]);
    const { montoEnLetras } = await import("@/lib/facturacion");
    const items = (its as any[]).length ? (its as any[]) : [{ descripcion: "Detalle no disponible: adjunte el XML del proveedor (icono de clip) para mostrar la descripción emitida", unidad: "ZZ", cantidad: 1, precio_unitario: i.base, valor: i.base }];
    const tipoNom: Record<string, string> = { "01": "FACTURA ELECTRÓNICA", "03": "BOLETA DE VENTA ELECTRÓNICA", "07": "NOTA DE CRÉDITO ELECTRÓNICA", "08": "NOTA DE DÉBITO ELECTRÓNICA" };
    const e = (emp ?? {}) as any;
    const filaD = (l: string, v: string) => `<div class="kv"><b>${l}</b><span>:</span><span>${esc(v)}</span></div>`;
    const filaT = (l: string, v: number, b = false) => `<tr${b ? ' class="tt"' : ""}><td>${l}</td><td class="r">${sim} ${m(v)}</td></tr>`;
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.serie_numero)} · ${esc(i.razon)}</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}
      body{font-family:var(--font-global,Arial),Arial,sans-serif;color:#1f2937;font-size:9.5pt;margin:0}
      .hoja{max-width:182mm;margin:0 auto}
      .cab{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #1e3a5f;padding-bottom:10px}
      .emi h1{font-size:13pt;margin:0 0 4px;color:#1e3a5f}.emi p{margin:1px 0;font-size:8.5pt}
      .box{border:1px solid #94a3b8;border-top:4px solid #1e3a5f;border-radius:6px;padding:10px 14px;text-align:center;min-width:58mm}
      .box div{margin:2px 0}.box .n{font-size:13pt;font-weight:700;color:#1e3a5f}
      .datos{display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin:12px 0;padding:10px;border:1px solid #e2e8f0;border-left:3px solid #1e3a5f;border-radius:6px;background:#f8fafc}
      .kv{display:grid;grid-template-columns:92px 8px 1fr;font-size:8.5pt;line-height:1.45}.kv b{font-weight:700}
      h3{font-size:8.5pt;margin:0 0 4px;color:#1e3a5f}
      table.it{width:100%;border-collapse:collapse}table.it th{background:#1e3a5f;color:#fff;font-size:7pt;padding:4px;text-align:center}
      table.it td{padding:4px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:8.5pt}table.it tr:nth-child(even) td{background:#f8fafc}
      .r{text-align:right}.c{text-align:center}
      .pie{display:flex;gap:14px;margin-top:10px;align-items:flex-start}.pie .izq{flex:1}
      table.tot{width:74mm;border-collapse:collapse;margin-left:auto}table.tot td{padding:2px 4px;border-bottom:1px solid #e2e8f0;font-size:8.5pt}.tt td{font-weight:700}
      .son{margin:10px 0;font-weight:700;text-align:justify;font-size:8.5pt}
      .card{border:1px solid #e2e8f0;border-radius:6px;padding:8px;font-size:8.5pt}
      .nota{margin-top:14px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:7pt;color:#475569}
      @media print{.hoja{max-width:none}}
    </style></head><body><div class="hoja">
      <div class="cab"><div class="emi"><h1>${esc(prov?.razon_social || i.razon)}</h1>
        <p>RUC: ${esc(i.ruc)}</p><p>Dirección: ${esc(prov?.direccion || "—")}</p></div>
        <div class="box"><div><b>RUC ${esc(i.ruc)}</b></div><div><b>${tipoNom[i.tipo] ?? "COMPROBANTE " + esc(i.tipo)}</b></div><div class="n">${esc(i.serie_numero)}</div></div></div>
      <div class="datos"><div><h3>ADQUIRIENTE / CLIENTE</h3>
        ${filaD("Razón social", e.razon_social || "—")}${filaD("RUC", e.ruc || "—")}${filaD("Dirección", e.direccion || "—")}</div>
        <div><h3>DATOS DEL COMPROBANTE</h3>
        ${filaD("F. emisión", fmt(i.fecha))}${filaD("F. vencimiento", fv ? fmt(vencRaw) : "—")}${filaD("Forma de pago", condicion)}${filaD("Plazo", plazo > 0 ? `${plazo} días` : "—")}${filaD("Moneda", moneda === "USD" ? "Dólares americanos (USD)" : "Soles (PEN)")}${moneda === "USD" ? filaD("T. cambio", Number(i.tipo_cambio || 0).toFixed(3)) : ""}</div></div>
      <table class="it"><thead><tr><th style="width:5%">#</th><th>DESCRIPCIÓN</th><th style="width:8%">UNIDAD</th><th style="width:10%">CANTIDAD</th><th style="width:14%">VALOR<br/>UNITARIO</th><th style="width:14%">IMPORTE<br/>TOTAL</th></tr></thead><tbody>
        ${items.map((x, k) => `<tr><td class="c">${k + 1}</td><td>${esc(x.descripcion)}</td><td class="c">${esc(x.unidad || "—")}</td><td class="r">${m(x.cantidad)}</td><td class="r">${m(x.precio_unitario)}</td><td class="r">${m(x.valor)}</td></tr>`).join("")}
      </tbody></table>
      <div class="pie"><div class="izq">
        <div class="card"><h3>FORMA DE PAGO</h3>${esc(condicion)}${fv ? ` · Vence ${fmt(vencRaw)} · ${sim} ${m(total)}` : ""}</div></div>
        <table class="tot">${filaT("Op. gravadas", i.base)}${nog ? filaT("Op. no gravadas", nog) : ""}${isc ? filaT("ISC", isc) : ""}${filaT("IGV (18%)", i.igv)}${otros ? filaT("Otros tributos", otros) : ""}${filaT("Importe total", total, true)}</table></div>
      <div class="son">${esc(montoEnLetras(total, moneda))}</div>
      <div class="nota">Representación generada por el ERP con los datos fiscales declarados en SUNAT (SIRE · RCE), periodo ${esc(periodo)}. ${(its as any[]).length ? "Detalle de ítems obtenido del XML del proveedor." : "SUNAT no entregó el detalle de ítems; se muestra el importe consolidado."} No reemplaza al comprobante original emitido por el proveedor.</div>
    </div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }

  const Ic = ({ p, I, t }: { p: string | null; I: React.ElementType; t: string }) => (
    <button disabled={!p} title={p ? `Ver ${t}` : `${t} no disponible`} onClick={() => p && abrir(p)}
      className={`rounded p-1 ${p ? "text-primary hover:bg-muted" : "text-muted-foreground/40"}`}><I className="size-4" /></button>
  );

  return (
    <Panel titulo="COMPROBANTES DE COMPRA · XML / PDF / CDR"
      extra={<div className="flex flex-wrap gap-2">
        <Boton variante="linea" onClick={() => descargar()} disabled={!!prog}><Download className="size-3.5" />Descargar XML de SUNAT{sel.size ? ` (${sel.size})` : ""}</Boton>
        <Boton variante="linea" onClick={() => descargar(true)} disabled={!!prog}>Reintentar fallidas</Boton>
        <Boton variante="linea" onClick={zip}><FolderDown className="size-3.5" />ZIP del período</Boton>
        <Boton onClick={() => setRegistrar(true)}><ClipboardCheck className="size-3.5" />Registrar en el ERP</Boton>
      </div>}>
      {prog && (
        <div className="space-y-1 px-5 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">{prog.h} de {prog.t} descargados…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(prog.h / prog.t) * 100}%` }} /></div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" checked={todos} onChange={() => setSel(todos ? new Set() : new Set(filas.map((f) => f.k)))} /></th>
              <th className="px-3 py-2 text-left">Comprobante</th><th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Descarga</th>
              <th className="px-3 py-2 text-center">Archivos</th><th className="px-3 py-2 text-left">ERP</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ k, i, r }) => (
              <Fragment key={k}>
              <tr className="border-t border-line">
                <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={sel.has(k)} onChange={() => { const s = new Set(sel); s.has(k) ? s.delete(k) : s.add(k); setSel(s); }} /></td>
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs">
                  <button disabled={!r} title={r ? "Ver detalle de ítems" : "Sin registro aún"} onClick={() => setAbierto(abierto === k ? null : k)} className="inline-flex items-center gap-1 hover:text-primary disabled:opacity-50">
                    <ChevronRight className={`size-3.5 transition-transform ${abierto === k ? "rotate-90" : ""}`} />{i.serie_numero}
                  </button>
                </td>
                <td className="px-3 py-1.5"><p className="font-mono text-[11px] text-muted-foreground">{i.ruc}</p><p className="truncate text-xs">{i.razon}</p></td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">{soles(i.total_sunat ?? 0)}</td>
                <td className="px-3 py-1.5 font-mono text-[11px]">
                  {!r ? <span className="text-muted-foreground">Pendiente</span>
                    : r.estado_descarga === "Descargado" ? <span className="text-good">XML de SUNAT</span>
                    : r.pdf_path || r.xml_path ? <span className="text-good">Original adjuntado</span>
                    : <span className="text-primary">XML no disponible en SUNAT</span>}
                  {r?.error && <p className="text-[10px] text-muted-foreground">{r.error}</p>}
                  {r && r.estado_descarga !== "Descargado" && !r.pdf_path && !r.xml_path && <p className="text-[10px] text-muted-foreground">Adjunta el XML del proveedor (clip) para leer los ítems.</p>}
                </td>
                <td className="px-3 py-1.5 text-center whitespace-nowrap">
                  <Ic p={r?.xml_path ?? null} I={FileCode2} t="XML" /><Ic p={r?.pdf_path ?? null} I={FileText} t="PDF" /><Ic p={r?.cdr_path ?? null} I={ShieldCheck} t="CDR" />
                  <button title="Factura A4 (imprimir / PDF)" onClick={() => ficha(i, r)} className="rounded p-1 text-primary hover:bg-muted"><Printer className="size-4" /></button>
                  <label title="Adjuntar PDF o XML original" className="cursor-pointer rounded p-1 text-primary hover:bg-muted inline-flex">
                    <Paperclip className="size-4" />
                    <input type="file" accept=".pdf,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) adjuntar(k, i, f); e.target.value = ""; }} />
                  </label>
                </td>
                <td className="px-3 py-1.5 font-mono text-[11px]">{r?.registrado_en ? <span className="text-good">Registrada</span> : "—"}</td>
              </tr>
              {abierto === k && r && <tr className="bg-muted/30"><td /><td colSpan={6} className="px-3 py-2"><DetalleItems id={r.id} moneda={r.moneda} /></td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {registrar && <RegistrarModal recibidos={recibidos.filter((r) => !r.registrado_en && (sel.size === 0 || sel.has(claveDe(r.ruc_emisor, r.tipo, r.serie, r.numero))))}
        onCerrar={() => setRegistrar(false)} onListo={() => qc.invalidateQueries({ queryKey: qk })} />}
    </Panel>
  );
}

type Dest = { tipo: "gg" | "gd"; categoria: string; proyecto: string; partida: string };

function RegistrarModal({ recibidos, onCerrar, onListo }: { recibidos: Recibido[]; onCerrar: () => void; onListo: () => void }) {
  const [dest, setDest] = useState<Record<string, Dest>>({});
  const [ocupado, setOcupado] = useState(false);
  const { data: cats = [] } = useQuery({ queryKey: ["cat-gg"], queryFn: async () => (await supabase.from("categorias_gasto_general").select("nombre").eq("activo", true).order("orden")).data ?? [] });
  const { data: proys = [] } = useQuery({ queryKey: ["proy-min"], queryFn: async () => (await supabase.from("proyectos").select("id, codigo, nombre").order("codigo")).data ?? [] });
  const { data: parts = [] } = useQuery({ queryKey: ["part-min"], queryFn: async () => (await supabase.from("partidas").select("id, proyecto_id, codigo, nombre")).data ?? [] });
  const d = (id: string): Dest => dest[id] ?? { tipo: "gg", categoria: cats[0]?.nombre ?? "Servicios y Suministros", proyecto: "", partida: "" };
  const set = (id: string, p: Partial<Dest>) => setDest((s) => ({ ...s, [id]: { ...d(id), ...p } }));

  async function proveedorId(r: Recibido) {
    const { data } = await supabase.from("terceros").select("id").eq("numero_documento", r.ruc_emisor).limit(1).maybeSingle();
    if (data) return data.id;
    const { data: n, error } = await supabase.from("terceros").insert({ numero_documento: r.ruc_emisor, razon_social: r.razon_emisor || r.ruc_emisor, tipo_documento: r.ruc_emisor.length === 11 ? "RUC" : "DNI", es_proveedor: true }).select("id").single();
    if (error) throw error;
    return n.id;
  }

  async function confirmar() {
    for (const r of recibidos) { const x = d(r.id); if (x.tipo === "gd" && (!x.proyecto || !x.partida)) { toast.error(`Elige proyecto y partida para ${r.serie}-${r.numero}`); return; } }
    setOcupado(true);
    let n = 0;
    try {
      for (const r of recibidos) {
        const x = d(r.id);
        const prov = await proveedorId(r);
        const moneda = (r.moneda === "USD" ? "USD" : "PEN") as "PEN" | "USD";
        const tc = moneda === "USD" ? Number(r.tipo_cambio) || 1 : 1;
        const comp = `${r.serie}-${r.numero}`;
        const { data: its = [] } = await supabase.from("comprobantes_recibidos_items").select("*").eq("comprobante_id", r.id).order("orden");
        const comunes = { proveedor: r.razon_emisor, proveedor_id: prov, moneda, tipo_cambio: tc, ...(r.fecha ? { fecha: r.fecha } : {}), comprobante: comp, condicion_pago: "Crédito", estado_pago: "Pendiente" };
        let regId: string | undefined;
        if (x.tipo === "gg") {
          const { data, error } = await supabase.from("gastos_generales").insert({
            ...comunes, descripcion: its?.[0]?.descripcion || `Factura ${comp}`, monto: Number(r.total), monto_soles: Number(r.total) * tc, categoria: x.categoria,
          }).select("id").single();
          if (error) throw error; regId = data.id;
        } else {
          const lista = its?.length ? its : [{ descripcion: `Factura ${comp}`, cantidad: 1, valor: Number(r.base) || Number(r.total), precio_unitario: Number(r.base) || Number(r.total) }];
          const sumaBase = lista.reduce((s, i) => s + Number(i.valor), 0) || 1;
          const factor = Number(r.total) / sumaBase;
          const filas = lista.map((i) => {
            const monto = Math.round(Number(i.valor) * factor * 100) / 100;
            const cant = Number(i.cantidad) || 1;
            return { ...comunes, proyecto_id: x.proyecto, partida_id: x.partida, descripcion: i.descripcion || `Factura ${comp}`, cantidad: cant, precio_unitario: monto / cant, monto, monto_soles: monto * tc };
          });
          const { data, error } = await supabase.from("gastos_directos").insert(filas).select("id");
          if (error) throw error; regId = data?.[0]?.id;
        }
        await supabase.from("comprobantes_recibidos").update({ registrado_en: x.tipo === "gg" ? "gasto_general" : "gasto_directo", registro_id: regId ?? null }).eq("id", r.id);
        n++;
      }
      toast.success(`${n} facturas registradas en el ERP`);
      onListo(); onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar");
      onListo();
    } finally { setOcupado(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onCerrar}>
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-line bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-card px-5 py-3">
          <div><p className="label-mono">REGISTRAR EN EL ERP</p><p className="text-sm">{recibidos.length} facturas descargadas sin registrar</p></div>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-muted-foreground hover:text-ink"><XCircle className="size-5" /></button>
        </div>
        {recibidos.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No hay facturas descargadas pendientes de registrar.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 font-mono text-[10px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Factura</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Destino</th><th className="px-3 py-2 text-left">Asignación</th></tr>
            </thead>
            <tbody>
              {recibidos.map((r) => { const x = d(r.id); return (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-3 py-2"><p className="font-mono text-xs">{r.serie}-{r.numero}</p><p className="truncate text-xs text-muted-foreground">{r.razon_emisor}</p></td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.moneda === "USD" ? "US$ " : "S/ "}{Number(r.total).toFixed(2)}</td>
                  <td className="px-3 py-2"><Select value={x.tipo} onChange={(e) => set(r.id, { tipo: e.target.value as Dest["tipo"] })}><option value="gg">Gasto General</option><option value="gd">Costo Directo</option></Select></td>
                  <td className="px-3 py-2">
                    {x.tipo === "gg"
                      ? <Select value={x.categoria} onChange={(e) => set(r.id, { categoria: e.target.value })}>{cats.map((c) => <option key={c.nombre}>{c.nombre}</option>)}</Select>
                      : <div className="flex gap-2">
                          <Select value={x.proyecto} onChange={(e) => set(r.id, { proyecto: e.target.value, partida: "" })}><option value="">Proyecto…</option>{proys.map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}</Select>
                          <Select value={x.partida} onChange={(e) => set(r.id, { partida: e.target.value })}><option value="">Partida…</option>{parts.filter((p) => p.proyecto_id === x.proyecto).map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}</Select>
                        </div>}
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        )}
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Boton variante="linea" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={ocupado || !recibidos.length}>{ocupado ? "Registrando…" : "Registrar"}</Boton>
        </div>
      </div>
    </div>
  );
}

const ORIGEN: Record<string, string> = { sunat: "XML SUNAT", adjunto: "XML adjunto", xml: "XML", manual: "Manual" };

function DetalleItems({ id, moneda }: { id: string; moneda: string }) {
  const { data: its = [], isLoading } = useQuery({
    queryKey: ["recibido-items", id],
    queryFn: async () => ((await supabase.from("comprobantes_recibidos_items").select("*").eq("comprobante_id", id).order("orden")).data ?? []),
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Cargando detalle…</p>;
  if (!its.length) return <p className="text-xs text-muted-foreground">Sin ítems: descarga el XML de SUNAT o adjunta el XML del proveedor.</p>;
  const f = (v: number) => Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return (
    <table className="w-full text-xs">
      <thead className="font-mono text-[10px] uppercase text-muted-foreground">
        <tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Código</th><th className="px-2 py-1 text-left">Descripción</th><th className="px-2 py-1 text-center">Und.</th><th className="px-2 py-1 text-right">Cant.</th><th className="px-2 py-1 text-right">P.U. ({moneda})</th><th className="px-2 py-1 text-right">Valor</th><th className="px-2 py-1 text-left">Origen</th></tr>
      </thead>
      <tbody>
        {its.map((x, n) => (
          <tr key={x.id} className="border-t border-line">
            <td className="px-2 py-1 font-mono">{n + 1}</td>
            <td className="px-2 py-1 font-mono">{x.codigo || "—"}</td>
            <td className="px-2 py-1">{x.descripcion}</td>
            <td className="px-2 py-1 text-center">{x.unidad || "—"}</td>
            <td className="px-2 py-1 text-right font-mono">{f(x.cantidad)}</td>
            <td className="px-2 py-1 text-right font-mono">{f(x.precio_unitario)}</td>
            <td className="px-2 py-1 text-right font-mono">{f(x.valor)}</td>
            <td className="px-2 py-1 text-muted-foreground">{ORIGEN[x.origen] ?? x.origen}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

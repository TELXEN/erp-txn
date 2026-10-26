import type { CSSProperties, ReactNode } from "react";
import type { Empresa } from "@/lib/empresa";
import { DOC } from "@/lib/documento-tema";
import "./hoja-orden-compra.css";

export function HojaOrdenCompra({ empresa, codigo, estado, children }: { empresa?: Empresa | null; codigo: string; estado: string; children: ReactNode }) {
  const tema = { "--oc-ink": DOC.ink, "--oc-line": DOC.line, "--oc-soft": DOC.soft, "--oc-total": DOC.total, "--oc-brand": DOC.green, "--oc-paper": DOC.white, "--oc-accent": DOC.accent, "--oc-accent-soft": DOC.accentSoft, "--oc-accent-text": DOC.accentText } as CSSProperties;
  return <section className="oc-sheet" style={tema} aria-label={`Orden de compra ${codigo}`}>
    <header className="oc-header">
      <div className="oc-logo">{empresa?.logo_url ? <img src={empresa.logo_url} alt={empresa.razon_social} /> : <strong>TX</strong>}</div>
      <div className="oc-company"><b>{empresa?.razon_social || "TELXEN SAC"}</b><span>{empresa?.eslogan}</span><span>{empresa?.direccion || "—"}</span><span>{empresa?.web || "—"}</span></div>
      <div className="oc-title"><div><h2>ORDEN DE COMPRA</h2><p>RUC: {empresa?.ruc || "—"}</p><strong>{codigo}</strong></div><span>{estado}</span></div>
    </header>
    {children}
    <footer className="oc-footer">{empresa?.razon_social || "TELXEN SAC"} · {codigo}</footer>
  </section>;
}

export function imprimirOrdenCompra(hoja: HTMLElement | null, codigo: string) {
  if (!hoja) return;
  const ventana = window.open("", "_blank");
  if (!ventana) return;
  const escape = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  const estilos = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((e) => e.outerHTML).join("");
  const fuente = getComputedStyle(document.documentElement).getPropertyValue("--font-global");
  ventana.document.write(`<!doctype html><html><head><title>${escape(codigo)}</title>${estilos}<style>:root{--font-global:${escape(fuente)}}@page{size:A4;margin:12mm}body{margin:0}.oc-sheet{width:100%;min-height:0;box-shadow:none;margin:0;padding:0}.oc-no-print{display:none!important}thead{display:table-header-group}tr{break-inside:avoid}.oc-header,.oc-totals,.oc-conditions{break-inside:avoid}</style></head><body>${hoja.outerHTML}</body></html>`);
  ventana.document.close();
  void (async () => {
    await Promise.all([...ventana.document.images].map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
    await ventana.document.fonts.ready;
    ventana.focus();
    ventana.print();
  })();
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { colorearParaExportar } from "@/lib/exportar-colores";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Vacio } from "@/components/ui-kit";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useCotizaciones } from "@/lib/cotizaciones";
import { costoReceta, dbBanco, useRecursosApu, type DetalleApu } from "@/lib/banco-apu";

import { PCT_HERRAMIENTAS_DEFECTO } from "@/lib/apu";
import { r2, sumar2 } from "@/lib/decimal";

export const Route = createFileRoute("/_authenticated/apu-vista")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s["id"] === "string" ? s["id"] : "",
    item: typeof s["item"] === "string" ? s["item"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Análisis de precios unitarios — ERP TELXEN" },
      { name: "description", content: "Ficha individual y dossier consolidado de APU de la cotización en A4." },
      { property: "og:title", content: "Análisis de precios unitarios — ERP TELXEN" },
      { property: "og:description", content: "Impresión A4 de los APU de cada partida cotizada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VistaApu,
});

const GRUPOS = [["MO", "MANO DE OBRA"], ["MAT", "MATERIALES"], ["EQ", "EQUIPOS Y HERRAMIENTAS"], ["SC", "SUBCONTRATOS"]] as const;
const n2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n4 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

type Item = {
  id: string; codigo: string | null; nombre: string; unidad: string; especialidad: string;
  metrado: number; precio_unitario: number; rendimiento: number; jornada: number; orden: number; pct_herramientas: number | null;
};

type Ficha = { it: Item; comps: DetalleApu[] };

/** Altura estimada (px) de una ficha APU dentro de la hoja de 794 px de ancho. */
function altoEstimadoApu(f: Ficha) {
  let h = 22 + 20;
  const nComps = f.comps.length;
  h += 4 * 18 + (nComps + 1) * 18;
  h += 22 + 22 + 10;
  return h;
}

/** Empaqueta fichas en hojas A4 sin cortar ninguna ficha. */
function paginarApus(fichas: Ficha[], capacidad: number) {
  const paginas: Ficha[][] = [];
  let actual: Ficha[] = [];
  let restante = capacidad;
  for (const f of fichas) {
    const h = altoEstimadoApu(f);
    if (actual.length && h > restante) {
      paginas.push(actual);
      actual = [];
      restante = capacidad;
    }
    actual.push(f);
    restante -= h;
  }
  if (actual.length) paginas.push(actual);
  return paginas;
}

const ALTO_HOJA = 1080; // alto útil de la sección A4 en px
const ALTO_ENCABEZADO = 90; // encabezado corporativo por hoja
const CAPACIDAD = ALTO_HOJA - 56 - ALTO_ENCABEZADO; // padding vertical 28+28

function VistaApu() {
  const { id, item } = Route.useSearch();
  const { data: empresa } = useEmpresa();
  const { fuente } = useFuenteDocumento();
  const { data: cotizaciones = [] } = useCotizaciones();
  const recursos = useRecursosApu();
  const cot = cotizaciones.find((c) => c.id === id);
  const [pdf, setPdf] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["apu-dossier", id, item],
    enabled: !!id,
    queryFn: async () => {
      let q = dbBanco.from("cotizacion_items").select("*").eq("cotizacion_id", id).neq("tipo", "grupo");
      if (item) q = q.eq("id", item);
      const { data: its, error } = await q;
      if (error) throw error;
      const lista = ((its ?? []) as Item[]).sort((a, b) =>
        String(a.codigo ?? "").localeCompare(String(b.codigo ?? ""), undefined, { numeric: true }) || a.orden - b.orden);
      const ids = lista.map((i) => i.id);
      const { data: comps, error: e2 } = ids.length
        ? await dbBanco.from("cotizacion_apu_detalle").select("*").in("cotizacion_item_id", ids).order("created_at")
        : { data: [], error: null };
      if (e2) throw e2;
      const porItem = new Map<string, DetalleApu[]>();
      for (const c of (comps ?? []) as (DetalleApu & { cotizacion_item_id: string })[]) {
        if (!porItem.has(c.cotizacion_item_id)) porItem.set(c.cotizacion_item_id, []);
        porItem.get(c.cotizacion_item_id)?.push(c);
      }
      return lista.filter((i) => item || porItem.has(i.id)).map((i) => ({ it: i, comps: porItem.get(i.id) ?? [] }));
    },
  });

  const fichas = data ?? [];
  const paginas = paginarApus(fichas, CAPACIDAD);
  const nombreArchivo = `APU_${cot?.codigo ?? "cotizacion"}${item && fichas[0] ? "_" + (fichas[0].it.codigo ?? "") : ""}`;

  async function descargar() {
    const el = document.getElementById("apu-impresion");
    if (!el) return;
    setPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: [7, 5, 7, 5], filename: `${nombreArchivo}.pdf`, image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 3, useCORS: true, windowWidth: 794, backgroundColor: "#ffffff", logging: false,
          onclone: colorearParaExportar,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".apu-ficha"] },
      } as never).from(el).save();
    } finally { setPdf(false); }
  }

  return (
    <div className="space-y-4">
      <Encabezado titulo={item ? "Ficha de APU" : "Dossier de APU"} subtitulo={cot ? `${cot.codigo ?? ""} — ${cot.cliente}` : "Análisis de precios unitarios"} />
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link to="/cotizacion-vista" search={{ id }}><Boton variante="linea"><ArrowLeft size={13} /> Volver a la vista previa</Boton></Link>
        {item && <Link to="/apu-vista" search={{ id, item: "" }}><Boton variante="linea">Ver dossier completo</Boton></Link>}
        <Boton onClick={() => void descargar()} disabled={pdf || !fichas.length}><FileDown size={13} /> {pdf ? "Generando…" : "Descargar PDF"}</Boton>
      </div>
      {isLoading ? <Vacio texto="Cargando análisis…" /> : !fichas.length ? (
        <Vacio texto={item ? "La partida no existe." : "Ninguna partida de esta cotización tiene análisis de precios todavía."} />
      ) : (
        <div className="overflow-x-auto">
          <div id="apu-impresion" className="apu-documento mx-auto bg-card text-foreground" style={{ width: 794, fontFamily: fuente.css }}>
            {paginas.map((pagina, pIdx) => (
              <section key={pIdx} style={{ padding: "28px 34px", minHeight: ALTO_HOJA, pageBreakAfter: pIdx < paginas.length - 1 ? "always" : "auto", fontSize: 9 }}>
                <div className="flex items-center gap-3 border-b-2 border-primary pb-2.5">
                  {empresa?.logo_url ? <img src={empresa.logo_url} alt="" crossOrigin="anonymous" className="h-12 object-contain" /> :
                    <div className="flex h-12 w-12 items-center justify-center bg-primary text-lg font-bold text-primary-foreground">TX</div>}
                  <div className="flex-1">
                    <div className="text-xs font-bold">{empresa?.razon_social ?? "TELXEN SAC"}</div>
                    <div className="text-muted-foreground">RUC {empresa?.ruc ?? ""} · {empresa?.direccion ?? ""}</div>
                    <div className="text-muted-foreground">Cliente: {cot?.cliente ?? ""}</div>
                  </div>
                  <div className="border border-primary px-3 py-1.5 text-center">
                    <div className="font-bold text-primary">ANÁLISIS DE PRECIOS UNITARIOS</div>
                    <div className="font-bold">{cot?.codigo ?? ""}</div>
                    <div className="text-muted-foreground">Hoja {pIdx + 1} de {paginas.length}</div>
                  </div>
                </div>
                {pagina.map(({ it, comps }, fIdx) => {
                  const calc = costoReceta(comps, recursos, Number(it.rendimiento ?? 1), Number(it.jornada ?? 8));
                  const totalMo = sumar2(calc.filas.filter((f) => f.tipo === "MO").map((f) => f.parcial));
                  const pctHt = Number(it.pct_herramientas ?? PCT_HERRAMIENTAS_DEFECTO);
                  const htTotal = r2(totalMo * pctHt / 100);
                  const td = "h-[18px] border-r border-line/70 px-1 align-middle text-[9px] leading-tight last:border-r-0";
                  return (
                    <div key={it.id} className={`apu-ficha break-inside-avoid ${fIdx === 0 ? "mt-2" : "mt-2 border-t border-dashed border-line pt-2"}`}>
                      <div className="border-b border-line px-2 py-1 text-[10px] font-semibold leading-tight">{it.codigo} · {it.nombre}</div>
                      <div className="flex flex-wrap items-center gap-4 border-b border-line bg-muted/50 px-2 py-0.5 text-[9.5px] leading-tight">
                        <span><strong>Rend. diario</strong> <span className="font-mono">{n2(Number(it.rendimiento ?? 1))}</span> {it.unidad}/día</span>
                        <span><strong>Jornada</strong> <span className="font-mono">{n2(Number(it.jornada ?? 8))}</span> h/día</span>
                        <span className="ml-auto font-mono text-[9px] text-muted-foreground">Metrado: {n2(Number(it.metrado))} {it.unidad}</span>
                      </div>
                      <table className="w-full table-fixed border-collapse">
                        <colgroup><col className="w-[74px]" /><col /><col className="w-[40px]" /><col className="w-[60px]" /><col className="w-[104px]" /><col className="w-[80px]" /><col className="w-[80px]" /></colgroup>
                        <thead>
                          <tr className="border-b border-line bg-card">
                            {["CÓDIGO", "DESCRIPCIÓN", "UNID.", "RECURSO", "CANTIDAD", "PRECIO", "TOTAL"].map((h, i) => (
                              <th key={h} className={`h-[20px] whitespace-nowrap border-r border-line px-1 text-[8.5px] font-semibold text-foreground/80 last:border-r-0 ${i < 2 ? "text-left" : i === 2 ? "text-center" : "text-right"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {GRUPOS.map(([tipo, titulo]) => {
                            const filas = calc.filas.filter((f) => f.tipo === tipo);
                            const subtotal = sumar2(filas.map((f) => f.parcial)) + (tipo === "EQ" ? htTotal : 0);
                            return [
                              <tr key={tipo} className="border-b border-line bg-muted/60">
                                <td colSpan={6} className={`${td} font-bold text-foreground/80`}>▾ {titulo}</td>
                                <td className={`${td} text-right font-mono font-bold`}>{n2(subtotal)}</td>
                              </tr>,
                              ...filas.map((f) => {
                                const horaria = f.tipo === "MO" || (f.tipo === "EQ" && f.und === "H-M");
                                const cantidad = horaria ? f.cantidad * Number(it.jornada ?? 8) / (Number(it.rendimiento) || 1) : f.cantidad;
                                return (
                                  <tr key={f.d.id} className="border-b border-line/70">
                                    <td className={`${td} font-mono text-muted-foreground`}>{f.d.codigo || "—"}</td>
                                    <td className={td}>{f.nombre}</td>
                                    <td className={`${td} text-center text-muted-foreground`}>{f.esPctMo ? "%" : f.und}</td>
                                    <td className={`${td} text-right font-mono text-muted-foreground`}>{f.esPctMo ? "" : n2(f.cantidad)}</td>
                                    <td className={`${td} whitespace-nowrap text-right font-mono`}>{f.esPctMo ? `${n2(f.cu)} %mo` : `${n4(cantidad)} ${f.und.toLowerCase()}`}</td>
                                    <td className={`${td} text-right font-mono`}>{f.esPctMo ? n2(totalMo) : n4(f.cu)}</td>
                                    <td className={`${td} text-right font-mono`}>{n2(f.parcial)}</td>
                                  </tr>
                                );
                              }),
                              ...(tipo === "EQ" && totalMo > 0 ? [
                                <tr key="ht" className="border-b border-line/70 bg-warn/5">
                                  <td className={`${td} font-mono text-muted-foreground`}>HT</td>
                                  <td className={`${td} italic`}>Herramientas manuales</td>
                                  <td className={`${td} text-center text-muted-foreground`}>%</td>
                                  <td className={td}></td>
                                  <td className={`${td} text-right font-mono`}>{n2(pctHt)} %mo</td>
                                  <td className={`${td} text-right font-mono`}>{n2(totalMo)}</td>
                                  <td className={`${td} text-right font-mono`}>{n2(htTotal)}</td>
                                </tr>,
                              ] : []),
                            ];
                          })}
                          {!comps.length && <tr><td colSpan={7} className="px-2 py-1 text-[9px] text-muted-foreground">Partida sin recursos analizados.</td></tr>}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-end gap-4 border-t border-line bg-muted/30 px-2 py-1 text-[11px] font-bold leading-tight">
                        <span>Costo total del APU</span><span className="font-mono text-primary">{cot?.moneda === "USD" ? "US$" : "S/"} {n2(calc.total + htTotal)}</span>
                      </div>
                    </div>

                  );
                })}

              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Printer } from "lucide-react";
import { Boton, Vacio } from "@/components/ui-kit";
import { colorearParaExportar } from "@/lib/exportar-colores";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useCotizaciones } from "@/lib/cotizaciones";
import { dbBanco } from "@/lib/banco-apu";
import { numerarGG, parcialGG, pctGG, resumenPresupuesto, subtotalGG, totalGG, totalesGG, type FilaGG } from "@/lib/gastos-generales-cotizacion";

const n2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ALTO_HOJA = 1080;
const FILAS_HOJA = 44; // filas de 18 px que caben bajo el encabezado y el resumen

export function HojaGastosGenerales({ id, acciones }: { id: string; acciones?: React.ReactNode }) {
  const { data: empresa } = useEmpresa();
  const { fuente } = useFuenteDocumento();
  const { data: cotizaciones = [] } = useCotizaciones();
  const cot = cotizaciones.find((c) => c.id === id);
  const [pdf, setPdf] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gg-vista", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: gg, error }, { data: its, error: e2 }] = await Promise.all([
        dbBanco.from("cotizacion_gastos_generales").select("*").eq("cotizacion_id", id).order("orden"),
        dbBanco.from("cotizacion_items").select("metrado, precio_unitario").eq("cotizacion_id", id).eq("tipo", "partida"),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      const cd = ((its ?? []) as { metrado: number; precio_unitario: number }[])
        .reduce((s, i) => s + Number(i.metrado || 0) * Number(i.precio_unitario || 0), 0);
      return { filas: (gg ?? []) as FilaGG[], costoDirecto: Math.round(cd * 100) / 100 };
    },
  });

  const filas = data?.filas ?? [];
  const cd = data?.costoDirecto ?? 0;
  const total = totalGG(filas);
  const pct = pctGG(total, cd);
  const { fijos, variables } = totalesGG(filas);
  const pctU = Number(cot?.pct_utilidad ?? 0);
  const pctI = (cot?.aplica_igv ?? true) ? 18 : 0;
  const res = resumenPresupuesto(cd, fijos, variables, pctU, pctI);
  const numeros = numerarGG(filas);
  const sim = cot?.moneda === "USD" ? "US$" : "S/";
  const paginas: { f: FilaGG; i: number }[][] = [];
  filas.forEach((f, i) => {
    if (!paginas.length || paginas.at(-1)!.length >= FILAS_HOJA) paginas.push([]);
    paginas.at(-1)!.push({ f, i });
  });

  async function descargar() {
    const el = document.getElementById("gg-impresion");
    if (!el) return;
    setPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: [7, 5, 7, 5], filename: `GG_${cot?.codigo ?? "cotizacion"}.pdf`, image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, windowWidth: 794, backgroundColor: "#ffffff", logging: false, onclone: (doc: Document) => { colorearParaExportar(doc); const e = doc.getElementById("gg-impresion"); e?.classList.remove("space-y-6"); e?.querySelectorAll("section").forEach((x) => x.classList.remove("shadow-lg", "ring-1")); } },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr"] },
      } as never).from(el).save();
    } finally { setPdf(false); }
  }

  const td = "h-[18px] border-r border-line/70 px-1 align-middle text-[9px] leading-tight last:border-r-0";

  function imprimir() {
    setImprimiendo(true);
    const fin = () => { setImprimiendo(false); window.removeEventListener("afterprint", fin); };
    window.addEventListener("afterprint", fin);
    setTimeout(() => window.print(), 150);
  }

  const hoja = (enPapel: boolean) => (
          <div id={enPapel ? "gg-impresion" : undefined} className={enPapel ? "mx-auto space-y-6" : "bg-card text-foreground"} style={enPapel ? { width: 794 } : { width: 794, fontFamily: fuente.css }}>
            {paginas.map((pagina, pIdx) => (
              <section key={pIdx} className={enPapel ? "bg-card text-foreground shadow-lg ring-1 ring-line" : ""} style={{ fontFamily: fuente.css, padding: "28px 34px", minHeight: ALTO_HOJA, pageBreakAfter: pIdx < paginas.length - 1 ? "always" : "auto", fontSize: 9 }}>
                <header style={{ display: "flex", gap: 12, alignItems: "center", paddingBottom: 6, color: "#000", lineHeight: 1.15, textTransform: "uppercase" }}>
                  <div style={{ width: 132, flexShrink: 0, display: "flex", alignItems: "center", alignSelf: "flex-start" }}>{empresa?.logo_url ? <img src={empresa.logo_url} alt="" crossOrigin="anonymous" style={{ maxWidth: 132, maxHeight: 78, objectFit: "contain" }} /> : <b style={{ fontSize: 20 }}>TELXEN</b>}</div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left", paddingLeft: 4, alignSelf: "flex-start" }}>
                    <b style={{ fontSize: 13, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN S.A.C"}</b>
                    <div style={{ fontWeight: 300, fontSize: 6, marginTop: 2 }}>{empresa?.eslogan || ""}</div>
                    <div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.direccion || "—"}</div>
                    <div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.web || "—"}</div>
                  </div>
                  <div style={{ width: 248, flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column" }}>
                    <div style={{ border: "1px solid #000", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5 }}>DETALLE DE GASTOS GENERALES</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5 }}>{cot?.codigo || "SIN CÓDIGO"}</div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 8, fontWeight: 700 }}>HOJA {pIdx + 1} DE {paginas.length}</div>
                  </div>
                </header>
                <div style={{ marginTop: 4, fontSize: 9, textAlign: "left" }}><b>CLIENTE:</b> {cot?.cliente ?? ""} &nbsp;·&nbsp; <b>PROYECTO:</b> {cot?.nombre ?? ""}</div>
                <table className="mt-2 w-full table-fixed border-collapse">
                  <colgroup><col className="w-[52px]" /><col /><col className="w-[48px]" /><col className="w-[52px]" /><col className="w-[48px]" /><col className="w-[72px]" /><col className="w-[80px]" /></colgroup>
                  <thead>
                    <tr className="border-y border-line bg-muted/60">
                      {["ÍTEM", "DESCRIPCIÓN", "UNID.", "CANT.", "T. (MESES)", "C. UNIT.", "TOTAL"].map((h, i) => (
                        <th key={h} className={`h-[20px] border-r border-line px-1 text-[8.5px] font-semibold last:border-r-0 ${i < 2 ? "text-left" : i === 2 ? "text-center" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagina.map(({ f, i }) => f.nivel === "item" ? (
                      <tr key={f.id} className="border-b border-line/70">
                        <td className={`${td} font-mono text-muted-foreground`}>{numeros.get(f.id)}</td>
                        <td className={`${td} pl-3`}>{f.descripcion}</td>
                        <td className={`${td} text-center text-muted-foreground`}>{f.unidad}</td>
                        <td className={`${td} text-right font-mono`}>{n2(Number(f.cantidad))}</td>
                        <td className={`${td} text-right font-mono`}>{f.tipo === "fijo" ? "N/A" : n2(Number(f.tiempo))}</td>
                        <td className={`${td} text-right font-mono`}>{n2(Number(f.precio_unitario))}</td>
                        <td className={`${td} text-right font-mono`}>{n2(parcialGG(f))}</td>
                      </tr>
                    ) : (
                      <tr key={f.id} className={`border-b border-line ${f.nivel === "bloque" ? "bg-muted/60 font-bold" : "bg-muted/25 font-semibold"}`}>
                        <td className={`${td} font-mono`}>{numeros.get(f.id)}</td>
                        <td colSpan={5} className={td}>{f.descripcion}</td>
                        <td className={`${td} text-right font-mono`}>{n2(subtotalGG(filas, i))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pIdx === paginas.length - 1 && (
                  <div className="ml-auto mt-3 w-80 border border-line text-[10px]">
                    {([
                      ["Costo directo total", cd, ""],
                      ["(+) Total gastos generales fijos", fijos, ""],
                      ["(+) Total gastos generales variables", variables, ""],
                      ["(=) Subtotal valor referencial", res.subtotal, "font-semibold bg-muted/40"],
                      [`(+) Margen de utilidad (${n2(pctU)} %)`, res.utilidad, ""],
                      ["(=) Valor venta neto total", res.venta, "font-semibold bg-muted/40"],
                      [`(+) IGV (${n2(pctI)} %)`, res.igv, ""],
                      ["(=) PRESUPUESTO FINAL TOTAL", res.total, "font-bold bg-muted/60 text-[11px]"],
                    ] as const).map(([a, b, c]) => (
                      <div key={a} className={`flex justify-between border-b border-line px-2 py-1 last:border-b-0 ${c}`}><span>{a}</span><span className="font-mono">{sim} {n2(b)}</span></div>
                    ))}
                    <div className="px-2 py-1 text-right text-muted-foreground">% Gastos generales: {n2(pct)} %</div>
                  </div>
                )}
              </section>
            ))}
          </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-card px-3 py-1">
        {acciones}
        <div className="ml-auto flex items-center gap-2">
          <Boton variante="linea" onClick={imprimir} disabled={!filas.length}><Printer size={13} /> Imprimir</Boton>
          <Boton onClick={() => void descargar()} disabled={pdf || !filas.length}><FileDown size={13} /> {pdf ? "Generando…" : "Descargar PDF"}</Boton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/60 p-3">
        {isLoading ? <Vacio texto="Cargando gastos generales…" /> : !filas.length ? (
          <Vacio texto="Esta cotización aún no tiene gastos generales." />
        ) : hoja(true)}
      </div>
      {imprimiendo && createPortal(<div className="gg-print-root">{hoja(false)}</div>, document.body)}
    </div>
  );
}

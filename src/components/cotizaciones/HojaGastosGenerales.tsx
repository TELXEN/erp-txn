import { EncabezadoAnexo } from "@/components/cotizaciones/EncabezadoAnexo";
import * as React from "react";
import { DOC } from "@/lib/documento-tema";
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
                <EncabezadoAnexo titulo="DETALLE DE GASTOS GENERALES" codigo={cot?.codigo} hoja={pIdx + 1} total={paginas.length} cliente={cot?.cliente} proyecto={cot?.nombre} />
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
                  <div className="ml-auto mt-3" style={{ width: 320, display: "grid", gap: 3, lineHeight: 1.15 }}>
                    {([
                      ["COSTO DIRECTO TOTAL", cd, false],
                      ["(+) GASTOS GENERALES FIJOS", fijos, false],
                      ["(+) GASTOS GENERALES VARIABLES", variables, false],
                      ["(=) SUB TOTAL VALOR REFERENCIAL", res.subtotal, false],
                      [`(+) UTILIDAD (${n2(pctU)}%)`, res.utilidad, false],
                      ["(=) VALOR VENTA NETO", res.venta, false],
                      [`(+) IGV (${n2(pctI)}%)`, res.igv, false],
                      ["TOTAL", res.total, true],
                    ] as const).map(([a, b, t]) => (
                      <div key={a} style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 4, alignItems: "stretch" }}>
                        <span style={{ background: t ? DOC.totalDesglose : DOC.grisClaro, color: t ? "#000" : "#333", borderRadius: 999, padding: "3px 10px", fontWeight: 700, fontSize: t ? 10 : 8.5 }}>{a}</span>
                        <span style={{ border: `1px solid ${t ? DOC.totalDesglose : DOC.gris}`, background: t ? DOC.totalDesglose : "transparent", color: "#000", borderRadius: 6, padding: "3px 8px", textAlign: "right", fontWeight: t ? 700 : 400, fontSize: t ? 10 : 8.5, whiteSpace: "nowrap" }}>{sim} {n2(b)}</span>
                      </div>
                    ))}
                    <div style={{ textAlign: "right", fontSize: 8.5, color: "#555" }}>% Gastos generales: {n2(pct)} %</div>
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

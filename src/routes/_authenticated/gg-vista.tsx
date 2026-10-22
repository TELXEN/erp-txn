import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Vacio } from "@/components/ui-kit";
import { colorearParaExportar } from "@/lib/exportar-colores";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useCotizaciones } from "@/lib/cotizaciones";
import { dbBanco } from "@/lib/banco-apu";
import { numerarGG, parcialGG, pctGG, resumenPresupuesto, subtotalGG, totalGG, totalesGG, type FilaGG } from "@/lib/gastos-generales-cotizacion";

export const Route = createFileRoute("/_authenticated/gg-vista")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s["id"] === "string" ? s["id"] : "" }),
  head: () => ({
    meta: [
      { title: "Desagregado de gastos generales — ERP TELXEN" },
      { name: "description", content: "Hoja A4 imprimible del desagregado de gastos generales de la cotización." },
      { property: "og:title", content: "Desagregado de gastos generales — ERP TELXEN" },
      { property: "og:description", content: "Impresión A4 de los gastos generales de una cotización." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VistaGG,
});

const n2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ALTO_HOJA = 1080;
const FILAS_HOJA = 44; // filas de 18 px que caben bajo el encabezado y el resumen

function VistaGG() {
  const { id } = Route.useSearch();
  const { data: empresa } = useEmpresa();
  const { fuente } = useFuenteDocumento();
  const { data: cotizaciones = [] } = useCotizaciones();
  const cot = cotizaciones.find((c) => c.id === id);
  const [pdf, setPdf] = useState(false);

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
        html2canvas: { scale: 3, useCORS: true, windowWidth: 794, backgroundColor: "#ffffff", logging: false, onclone: colorearParaExportar },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr"] },
      } as never).from(el).save();
    } finally { setPdf(false); }
  }

  const td = "h-[18px] border-r border-line/70 px-1 align-middle text-[9px] leading-tight last:border-r-0";

  return (
    <div className="space-y-4">
      <Encabezado titulo="Desagregado de gastos generales" subtitulo={cot ? `${cot.codigo ?? ""} — ${cot.cliente}` : "Gastos generales"} />
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link to="/cotizacion-vista" search={{ id }}><Boton variante="linea"><ArrowLeft size={13} /> Volver a la vista previa</Boton></Link>
        <Link to="/cotizaciones" search={{ abrir: id }}><Boton variante="linea">Volver a la cotización</Boton></Link>
        <Boton onClick={() => void descargar()} disabled={pdf || !filas.length}><FileDown size={13} /> {pdf ? "Generando…" : "Descargar PDF"}</Boton>
      </div>
      {isLoading ? <Vacio texto="Cargando gastos generales…" /> : !filas.length ? (
        <Vacio texto="Esta cotización aún no tiene gastos generales. Ábrelos desde la cotización con el botón «Gastos generales»." />
      ) : (
        <div className="overflow-x-auto">
          <div id="gg-impresion" className="mx-auto bg-card text-foreground" style={{ width: 794, fontFamily: fuente.css }}>
            {paginas.map((pagina, pIdx) => (
              <section key={pIdx} style={{ padding: "28px 34px", minHeight: ALTO_HOJA, pageBreakAfter: pIdx < paginas.length - 1 ? "always" : "auto", fontSize: 9 }}>
                <div className="flex items-center gap-3 border-b-2 border-primary pb-2.5">
                  {empresa?.logo_url ? <img src={empresa.logo_url} alt="" crossOrigin="anonymous" className="h-12 object-contain" /> :
                    <div className="flex h-12 w-12 items-center justify-center bg-primary text-lg font-bold text-primary-foreground">TX</div>}
                  <div className="flex-1">
                    <div className="text-xs font-bold">{empresa?.razon_social ?? "TELXEN SAC"}</div>
                    <div className="text-muted-foreground">RUC {empresa?.ruc ?? ""} · {empresa?.direccion ?? ""}</div>
                    <div className="text-muted-foreground">Cliente: {cot?.cliente ?? ""}</div>
                    <div className="text-muted-foreground">Proyecto: {cot?.nombre ?? ""}</div>
                  </div>
                  <div className="border border-primary px-3 py-1.5 text-center">
                    <div className="font-bold text-primary">DESAGREGADO DE GASTOS GENERALES</div>
                    <div className="font-bold">{cot?.codigo ?? ""}</div>
                    <div className="text-muted-foreground">Hoja {pIdx + 1} de {paginas.length}</div>
                  </div>
                </div>
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
        </div>
      )}
    </div>
  );
}

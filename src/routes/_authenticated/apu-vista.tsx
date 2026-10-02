import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Vacio } from "@/components/ui-kit";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useCotizaciones } from "@/lib/cotizaciones";
import { apuDb, calcularApu, TIPOS_INSUMO, useInsumos, useMargenesInsumo, type ComponenteApu } from "@/lib/apu";

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

const C = { ink: "#0f172a", mid: "#334155", mute: "#64748b", line: "#cbd5e1", soft: "#f1f5f9", em: "#047857", emBg: "#ecfdf5", white: "#ffffff" };
const n2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n4 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

type Item = {
  id: string; codigo: string | null; nombre: string; unidad: string; especialidad: string;
  metrado: number; precio_unitario: number; rendimiento: number; jornada: number; pct_herramientas: number; orden: number;
};

type Ficha = { it: Item; comps: ComponenteApu[] };

/** Altura estimada (px) de una ficha APU dentro de la hoja de 794 px de ancho. */
function altoEstimadoApu(f: Ficha, margenHt: number) {
  // Cabecera de partida (2 filas) + cabecera de tabla
  let h = 56 + 28;
  // Una fila de subtítulo por tipo de insumo (estimación sin resolver insumos)
  const nComps = f.comps.length;
  const nGrupos = Math.min(4, Math.max(1, Math.ceil(nComps / 4)));
  h += nGrupos * 24 + nComps * 20;
  // Herramientas menores (% MO)
  if (margenHt > 0 && f.comps.length) h += 20;
  // Total + nota al pie + separador
  h += 34 + 22 + 16;
  return h;
}

/** Empaqueta fichas en hojas A4 sin cortar ninguna ficha. */
function paginarApus(fichas: Ficha[], capacidad: number, margenHt: number) {
  const paginas: Ficha[][] = [];
  let actual: Ficha[] = [];
  let restante = capacidad;
  for (const f of fichas) {
    const h = altoEstimadoApu(f, margenHt);
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
  const { data: insumos = [] } = useInsumos();
  const { data: margenes } = useMargenesInsumo();
  const pctH = Number(margenes?.HT ?? 0); // % de Herramientas menores del Maestro de insumos (Márgenes APU)
  const cot = cotizaciones.find((c) => c.id === id);
  const [pdf, setPdf] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["apu-dossier", id, item],
    enabled: !!id,
    queryFn: async () => {
      let q = apuDb.from("cotizacion_items").select("*").eq("cotizacion_id", id).neq("tipo", "grupo");
      if (item) q = q.eq("id", item);
      const { data: its, error } = await q;
      if (error) throw error;
      const lista = ((its ?? []) as Item[]).sort((a, b) =>
        String(a.codigo ?? "").localeCompare(String(b.codigo ?? ""), undefined, { numeric: true }) || a.orden - b.orden);
      const ids = lista.map((i) => i.id);
      const { data: comps, error: e2 } = ids.length
        ? await apuDb.from("apu_componentes").select("*").in("cotizacion_item_id", ids).order("created_at")
        : { data: [], error: null };
      if (e2) throw e2;
      const porItem = new Map<string, ComponenteApu[]>();
      for (const c of (comps ?? []) as (ComponenteApu & { cotizacion_item_id: string })[]) {
        if (!porItem.has(c.cotizacion_item_id)) porItem.set(c.cotizacion_item_id, []);
        porItem.get(c.cotizacion_item_id)!.push(c);
      }
      return lista.filter((i) => item || porItem.has(i.id)).map((i) => ({ it: i, comps: porItem.get(i.id) ?? [] }));
    },
  });

  const fichas = data ?? [];
  const paginas = paginarApus(fichas, CAPACIDAD, pctH);
  const nombreArchivo = `APU_${cot?.codigo ?? "cotizacion"}${item && fichas[0] ? "_" + (fichas[0].it.codigo ?? "") : ""}`;

  async function descargar() {
    const el = document.getElementById("apu-impresion");
    if (!el) return;
    setPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: [7, 5, 7, 5], filename: `${nombreArchivo}.pdf`, image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, windowWidth: 794, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".apu-ficha"] },
      } as never).from(el).save();
    } finally { setPdf(false); }
  }

  return (
    <div className="space-y-4">
      <Encabezado titulo={item ? "Ficha de APU" : "Dossier de APU"} subtitulo={cot ? `${cot.codigo ?? ""} — ${cot.cliente}` : "Análisis de precios unitarios"} />
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link to="/cotizaciones"><Boton variante="linea"><ArrowLeft size={13} /> Volver</Boton></Link>
        {item && <Link to="/apu-vista" search={{ id, item: "" }}><Boton variante="linea">Ver dossier completo</Boton></Link>}
        <Boton onClick={() => void descargar()} disabled={pdf || !fichas.length}><FileDown size={13} /> {pdf ? "Generando…" : "Descargar PDF"}</Boton>
      </div>
      {isLoading ? <Vacio texto="Cargando análisis…" /> : !fichas.length ? (
        <Vacio texto={item ? "La partida no existe." : "Ninguna partida de esta cotización tiene análisis de precios todavía."} />
      ) : (
        <div className="overflow-x-auto">
          <div id="apu-impresion" style={{ width: 794, margin: "0 auto", fontFamily: fuente.css, color: C.ink, background: C.white }}>
            {paginas.map((pagina, pIdx) => (
              <section key={pIdx} style={{ padding: "28px 34px", minHeight: ALTO_HOJA, pageBreakAfter: pIdx < paginas.length - 1 ? "always" : "auto", fontSize: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `2px solid ${C.em}`, paddingBottom: 10 }}>
                  {empresa?.logo_url ? <img src={empresa.logo_url} alt="" crossOrigin="anonymous" style={{ height: 46, objectFit: "contain" }} /> :
                    <div style={{ width: 46, height: 46, background: C.em, color: C.white, fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>TX</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{empresa?.razon_social ?? "TELXEN SAC"}</div>
                    <div style={{ color: C.mute }}>RUC {empresa?.ruc ?? ""} · {empresa?.direccion ?? ""}</div>
                    <div style={{ color: C.mute }}>Cliente: {cot?.cliente ?? ""}</div>
                  </div>
                  <div style={{ border: `1.5px solid ${C.em}`, textAlign: "center", padding: "6px 12px" }}>
                    <div style={{ fontWeight: 700, color: C.em }}>ANÁLISIS DE PRECIOS UNITARIOS</div>
                    <div style={{ fontWeight: 700 }}>{cot?.codigo ?? ""}</div>
                    <div style={{ color: C.mute }}>Hoja {pIdx + 1} de {paginas.length}</div>
                  </div>
                </div>
                {pagina.map(({ it, comps }, fIdx) => {
                  const calc = calcularApu(comps, insumos, Number(it.rendimiento ?? 1), Number(it.jornada ?? 8), pctH);
                  return (
                    <div key={it.id} className="apu-ficha" style={{ pageBreakInside: "avoid", marginTop: fIdx === 0 ? 10 : 14, paddingTop: fIdx === 0 ? 0 : 12, borderTop: fIdx === 0 ? "none" : `1.5px dashed ${C.line}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr><td style={{ color: C.mute, width: 90 }}>Partida</td><td colSpan={3} style={{ fontWeight: 700 }}>{it.codigo} {it.nombre}</td></tr>
                          <tr>
                            <td style={{ color: C.mute }}>Rendimiento</td><td>{n2(Number(it.rendimiento ?? 1))} {it.unidad}/día · Jornada {n2(Number(it.jornada ?? 8))} h</td>
                            <td style={{ color: C.mute, textAlign: "right" }}>Costo unitario directo por {it.unidad}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, fontSize: 11, color: C.em }}>S/ {n2(calc.pu)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: C.ink, color: C.white }}>
                            {["Código", "Descripción del insumo", "Und.", "Cuadrilla", "Cantidad", "Precio S/", "Parcial S/"].map((h, i) => (
                              <th key={h} style={{ padding: "5px 6px", textAlign: i > 2 ? "right" : "left", fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TIPOS_INSUMO.map(([tipo, titulo]) => {
                            const filas = calc.filas.filter((f) => f.ins?.tipo === tipo);
                            const conH = tipo === "HT" && calc.herramientas > 0;
                            if (!filas.length && !conH) return null;
                            return [
                              <tr key={tipo} style={{ background: C.emBg }}>
                                <td colSpan={6} style={{ padding: "4px 6px", fontWeight: 700, color: C.em }}>{titulo}</td>
                                <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{n2(calc.tot[tipo])}</td>
                              </tr>,
                              ...filas.map(({ c, ins, cantidad, parcial }) => (
                                <tr key={c.id} style={{ borderBottom: `0.5px solid ${C.line}` }}>
                                  <td style={{ padding: "3px 6px", color: C.mute }}>{ins?.codigo}</td>
                                  <td style={{ padding: "3px 6px" }}>{ins?.nombre}</td>
                                  <td style={{ padding: "3px 6px" }}>{ins?.unidad}</td>
                                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{Number(c.cuadrilla) > 0 ? n2(Number(c.cuadrilla)) : ""}</td>
                                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{n4(cantidad)}</td>
                                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{n2(Number(ins?.precio ?? 0))}</td>
                                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{n2(parcial)}</td>
                                </tr>
                              )),
                              conH ? (
                                <tr key="h" style={{ borderBottom: `0.5px solid ${C.line}` }}>
                                  <td /><td style={{ padding: "3px 6px" }}>Herramientas (% MO)</td><td style={{ padding: "3px 6px" }}>%MO</td><td />
                                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{n2(pctH)}%</td><td />
                                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{n2(calc.herramientas)}</td>
                                </tr>
                              ) : null,
                            ];
                          })}
                          {!comps.length && <tr><td colSpan={7} style={{ padding: 10, color: C.mute }}>Partida sin insumos analizados.</td></tr>}
                          <tr style={{ background: C.soft }}>
                            <td colSpan={6} style={{ padding: "6px", textAlign: "right", fontWeight: 700 }}>COSTO UNITARIO DIRECTO</td>
                            <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, fontSize: 11 }}>{n2(calc.pu)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                <p style={{ marginTop: 10, color: C.mute, fontSize: 8 }}>
                  Mano de obra y equipos: cantidad = cuadrilla × jornada ÷ rendimiento. Materiales y subcontratos: cantidad por unidad de partida. Precios en soles, sin IGV.
                </p>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

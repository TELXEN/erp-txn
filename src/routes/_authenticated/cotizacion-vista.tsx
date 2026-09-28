import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Vacio } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { useAuth } from "@/lib/auth";
import { totalesCotizacion, useCotizacionItems, useCotizaciones, vigenciaHasta } from "@/lib/cotizaciones";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cotizacion-vista")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Vista previa de cotización — ERP TELXEN" },
      { name: "description", content: "Previsualización de cotización comercial con exportación a PDF y Excel." },
      { property: "og:title", content: "Vista previa de cotización — ERP TELXEN" },
      { property: "og:description", content: "Cotización comercial lista para PDF y Excel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VistaCotizacion,
});

// Colores en hex (html2canvas no soporta oklch de Tailwind v4)
const C = {
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  emerald600: "#059669",
  emerald50: "#ecfdf5",
  white: "#ffffff",
  marca: "#0f274a",
  ambar: "#fbbf24",
};

const S = (n: number) =>
  "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const F = (d: string) => d.split("-").reverse().join("/");

type ItemCot = {
  id: string;
  codigo?: string | null;
  nombre: string;
  especialidad: string;
  categoria?: string | null;
  marca?: string | null;
  unidad: string;
  metrado: number | string;
  precio_unitario: number | string;
};

type Fila =
  | { clase: "grupo"; llave: string; texto: string }
  | { clase: "sub"; llave: string; texto: string }
  | { clase: "item"; llave: string; item: ItemCot; indice: number };

/** Construye las filas de la hoja: especialidad y categoría como agrupadores. */
function construirFilas(items: ItemCot[]): Fila[] {
  const filas: Fila[] = [];
  const porEsp = new Map<string, Map<string, ItemCot[]>>();
  for (const it of items) {
    const esp = (it.especialidad || "").trim() || "Sin especialidad";
    const cat = (it.categoria ?? "").trim() || "Sin categoría";
    if (!porEsp.has(esp)) porEsp.set(esp, new Map());
    const sub = porEsp.get(esp)!;
    if (!sub.has(cat)) sub.set(cat, []);
    sub.get(cat)!.push(it);
  }
  let n = 0;
  for (const [esp, sub] of porEsp) {
    filas.push({ clase: "grupo", llave: `g-${esp}`, texto: esp.toUpperCase() });
    for (const [cat, lista] of sub) {
      if (sub.size > 1 || cat !== "Sin categoría") {
        filas.push({ clase: "sub", llave: `s-${esp}-${cat}`, texto: cat });
      }
      for (const it of lista) {
        n += 1;
        filas.push({ clase: "item", llave: it.id, item: it, indice: n });
      }
    }
  }
  return filas;
}

function altoEstimadoFila(fila: Fila) {
  if (fila.clase !== "item") return 22;
  // Descripción ocupa ~49% del ancho útil: ~46 caracteres por línea a 9 pt.
  const lineas = Math.max(1, Math.ceil((fila.item.nombre || "").length / 46));
  return 14 + lineas * 15;
}

function paginarFilas(filas: Fila[]) {
  if (filas.length === 0) return [[]] as Fila[][];
  const paginas: Fila[][] = [];
  let pendientes = [...filas];
  let primeraHoja = true;

  while (pendientes.length > 0) {
    const capacidad = primeraHoja ? 470 : 650;
    const capacidadFinal = primeraHoja ? 250 : 350;
    const altoPendiente = pendientes.reduce((suma, fila) => suma + altoEstimadoFila(fila), 0);

    if (altoPendiente <= capacidadFinal) {
      paginas.push(pendientes);
      pendientes = [];
      break;
    }

    const pagina: Fila[] = [];
    let usado = 0;
    while (pendientes.length > 0) {
      const proximo = pendientes[0];
      if (!proximo) break;
      const siguiente = altoEstimadoFila(proximo);
      if (pagina.length > 0 && usado + siguiente > capacidad) break;
      if (pagina.length > 0 && pendientes.length === 1) break;
      const fila = pendientes.shift();
      if (!fila) break;
      pagina.push(fila);
      usado += siguiente;
    }
    // Evita dejar un título de grupo huérfano al final de la hoja.
    while (pagina.length > 0 && pagina[pagina.length - 1]?.clase !== "item") {
      const huerfano = pagina.pop();
      if (huerfano) pendientes.unshift(huerfano);
    }
    if (pagina.length === 0) {
      const forzado = pendientes.shift();
      if (forzado) pagina.push(forzado);
    }
    paginas.push(pagina);
    primeraHoja = false;
  }

  return paginas;
}


function VistaCotizacion() {
  const { id } = Route.useSearch();
  const { data: cotizaciones = [], isLoading: cargandoCotizaciones } = useCotizaciones();
  const { data: items = [], isLoading: cargandoItems } = useCotizacionItems(id || null);
  const { data: empresa, isLoading: cargandoEmpresa } = useEmpresa();
  const { nombre, email } = useAuth();
  const cot = cotizaciones.find((fila) => fila.id === id) ?? null;
  const { data: cliente } = useQuery({
    queryKey: ["tercero-cotizacion", cot?.cliente_id],
    enabled: Boolean(cot?.cliente_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terceros")
        .select("razon_social, numero_documento, direccion, contacto, telefono, celular_contacto")
        .eq("id", cot?.cliente_id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [pdfCargando, setPdfCargando] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const calculo = cot
    ? totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad))
    : { costoDirecto: 0, gastosGenerales: 0, utilidad: 0, total: 0 };
  const subtotal = calculo.total;
  const conIgv = cot?.aplica_igv !== false;
  const igv = conIgv ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  const total = subtotal + igv;
  const nombreArchivo = `Cotizacion_${(cot?.cliente || "Cliente").replace(/[^\w-]+/g, "_")}_${cot?.codigo ?? "sin_codigo"}`;
  const paginas = paginarFilas(construirFilas(items as unknown as ItemCot[]));

  function copiarEnlace() {
    const url = `${window.location.origin}/cotizacion-vista?id=${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setEnlaceCopiado(true);
        window.setTimeout(() => setEnlaceCopiado(false), 2500);
      })
      .catch(() => {
        window.prompt("Copia este enlace de vista previa:", url);
      });
  }

  async function descargarPdf() {
    const el = document.getElementById("cotizacion-impresion");
    if (!el) return;
    setPdfCargando(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [7, 5, 7, 5],
          filename: `${nombreArchivo}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 700, backgroundColor: "#ffffff", logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".bloque-final"] },
        } as never)
        .from(el)
        .save();
    } finally {
      setPdfCargando(false);
    }
  }

  async function exportarExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Matriz de costos");
    if (!cot) return;
    ws.addRow([`${cot.codigo ?? "Cotización"} — ${cot.cliente}`]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const cab = ws.addRow(["Ítem", "Descripción", "Marca", "Unidad", "Cantidad", "C. Unitario", "Sub Total"]);
    cab.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", horizontal: "center" };
    });
    const primera = ws.rowCount + 1;
    items.forEach((it, i) => {
      const r = ws.addRow([it.codigo || i + 1, it.nombre, it.marca?.trim() || "-", it.unidad, Number(it.metrado), Number(it.precio_unitario)]);
      r.getCell(7).value = { formula: `E${r.number}*F${r.number}` };
    });
    const ultima = ws.rowCount;
    const sub = ws.addRow(["", "COSTO DIRECTO", "", "", "", "", { formula: `SUM(G${primera}:G${ultima})` }]);
    const pctGg = Number(cot.pct_gastos_generales) || 0;
    const pctUt = Number(cot.pct_utilidad) || 0;
    let base = `G${sub.number}`;
    if (pctGg > 0) {
      const f = ws.addRow(["", `GASTOS GENERALES (${pctGg}%)`, "", "", "", "", { formula: `ROUND(G${sub.number}*${pctGg / 100},2)` }]);
      base += `+G${f.number}`;
    }
    if (pctUt > 0) {
      const f = ws.addRow(["", `UTILIDAD (${pctUt}%)`, "", "", "", "", { formula: `ROUND(G${sub.number}*${pctUt / 100},2)` }]);
      base += `+G${f.number}`;
    }
    const filaSub = ws.addRow(["", "SUBTOTAL", "", "", "", "", { formula: base }]);
    const filaIgv = ws.addRow(["", conIgv ? "IGV (18%)" : "IGV (0%)", "", "", "", "", { formula: conIgv ? `ROUND(G${filaSub.number}*0.18,2)` : "0" }]);
    const tot = ws.addRow(["", "TOTAL", "", "", "", "", { formula: `G${filaSub.number}+G${filaIgv.number}` }]);
    tot.font = { bold: true };
    ["F", "G"].forEach((col) => (ws.getColumn(col).numFmt = '"S/" #,##0.00'));
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (c, n) => {
        if (n > 1) max = Math.max(max, String(c.value && typeof c.value === "object" ? "0000000000000" : c.value ?? "").length);
      });
      col.width = Math.min(max + 2, 70);
    });
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${nombreArchivo}.xlsx`);
  }

  const celda = { padding: "12px 14px", borderBottom: `1px solid ${C.slate100}` } as const;
  const cargando = cargandoCotizaciones || cargandoItems || cargandoEmpresa;

  const revision = `Rev. ${(cot as unknown as { revision?: string } | null)?.revision?.trim() || "01"}`;

  function encabezadoHoja(numero: number, totalHojas: number) {
    return (
      <div className="flex items-start justify-between gap-5" style={{ borderBottom: `2px solid ${C.marca}`, paddingBottom: 14 }}>
        <div className="flex items-center" style={{ minWidth: 150 }}>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ display: "block", maxWidth: 150, maxHeight: 62, objectFit: "contain" }} />
          ) : (
            <div className="flex items-center justify-center" style={{ width: 62, height: 62, borderRadius: 12, background: C.marca, color: C.white, fontWeight: 700, fontSize: 20 }}>
              {(empresa?.razon_social || "TELXEN").split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, textAlign: "right", paddingTop: 2 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.marca, letterSpacing: 0.4, lineHeight: 1.35, textAlign: "right" }}>
            {empresa?.razon_social || "TELXEN"}
          </div>
          {empresa?.eslogan?.trim()
            ? (() => {
                const es = empresa.eslogan.trim();
                const idx = es.indexOf(",");
                const linea1 = idx >= 0 ? es.slice(0, idx + 1) : es;
                const linea2 = idx >= 0 ? es.slice(idx + 1).trim() : "";
                return (
                  <div style={{ marginTop: 2, fontFamily: CALIBRI, fontSize: 9.5, fontWeight: 300, color: C.marca, letterSpacing: 0.4, lineHeight: 1.3, textAlign: "right" }}>
                    <span style={{ display: "block" }}>{linea1}</span>
                    {linea2 && <span style={{ display: "block" }}>{linea2}</span>}
                  </div>
                );
              })()
            : !empresa?.razon_social && (
                <div style={{ marginTop: 2, fontFamily: CALIBRI, fontSize: 9.5, fontWeight: 300, color: C.marca, letterSpacing: 0.4, lineHeight: 1.3, textAlign: "right" }}>
                  <span style={{ display: "block" }}>SOLUCIONES INTEGRALES EN ENERGÍA,</span>
                  <span style={{ display: "block" }}>AUTOMATIZACIÓN Y CONTROL INDUSTRIAL</span>
                </div>
              )}
          {empresa?.direccion && (
            <div style={{ marginTop: 4, fontFamily: CALIBRI, fontWeight: 300, fontSize: 9.5, color: C.slate700 }}>Dirección: {empresa.direccion}</div>
          )}
          {empresa?.telefono && (
            <div style={{ marginTop: 2, fontFamily: CALIBRI, fontWeight: 300, fontSize: 9.5, color: C.slate700 }}>Teléfono: {empresa.telefono}</div>
          )}
          {empresa?.web && <div style={{ marginTop: 2, fontFamily: CALIBRI, fontWeight: 300, fontSize: 9.5, color: C.marca }}>{empresa.web}</div>}

        </div>

        <div style={{ minWidth: 200 }}>
          <div style={{ background: C.ambar, borderRadius: 14, padding: "10px 16px", textAlign: "center", color: C.slate900 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, lineHeight: 1.15 }}>COTIZACIÓN</div>
            <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
            <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800, letterSpacing: 0.6 }}>{cot?.codigo ?? "SIN CÓDIGO"}</div>
          </div>
          <div className="flex justify-between" style={{ marginTop: 5, fontSize: 9.5, color: C.slate500 }}>
            <span>Hoja {numero} de {totalHojas}</span>
            <span>{revision}</span>
          </div>
        </div>
      </div>
    );
  }

  function filaDato(etiqueta: string, valor: string) {
    return (
      <div className="flex" style={{ fontFamily: '"Calibri Light", Calibri, Arial, sans-serif', fontSize: "11pt", fontWeight: 300, lineHeight: 1.25 }}>
        <span style={{ width: 74, flexShrink: 0, fontWeight: 300, color: C.slate500, textTransform: "uppercase", letterSpacing: 0, paddingTop: 1 }}>{etiqueta}</span>
        <span style={{ fontWeight: 300, color: C.slate900 }}>{valor}</span>
      </div>
    );
  }

  if (cargando) {
    return <Panel titulo="Vista previa de cotización"><div className="p-6 font-mono text-xs text-muted-foreground">Cargando cotización…</div></Panel>;
  }

  if (!id || !cot) {
    return (
      <Panel titulo="Vista previa de cotización">
        <div className="p-5"><Vacio texto="Selecciona una cotización registrada para visualizarla." /></div>
        <div className="border-t border-line p-4"><Link to="/cotizaciones"><Boton variante="linea"><ArrowLeft size={13} /> Volver a cotizaciones</Boton></Link></div>
      </Panel>
    );
  }

  return (
    <>
      <Encabezado
        titulo="Vista previa de cotización"
        subtitulo={`${cot.codigo ?? "Sin código"} · ${cot.cliente || "Cliente sin registrar"}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Link to="/cotizaciones">
              <Boton variante="linea"><ArrowLeft size={13} /> Volver</Boton>
            </Link>
            <Boton variante="linea" onClick={() => void exportarExcel()} disabled={items.length === 0}>
              <FileSpreadsheet size={14} /> Exportar a Excel
            </Boton>
            <Boton variante="accion" onClick={descargarPdf} disabled={pdfCargando}>
              <FileDown size={14} /> {pdfCargando ? "Generando..." : "Descargar PDF"}
            </Boton>
          </div>
        }
      />

      <div className="overflow-x-auto pb-8">
        <div className="mx-auto" style={{ width: 700 }}>
        <div
          id="cotizacion-impresion"
          style={{ width: 700, background: C.white, color: C.slate900, fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)" }}
        >
          {paginas.map((itemsPagina, paginaIndex) => {
            const esPrimera = paginaIndex === 0;
            const esUltima = paginaIndex === paginas.length - 1;
            const indiceInicial = paginas.slice(0, paginaIndex).reduce((suma, pagina) => suma + pagina.length, 0);
            return (
              <section
                key={`hoja-${paginaIndex + 1}`}
                className="cotizacion-hoja"
                style={{ position: "relative", width: 700, height: 990, padding: "34px 30px 38px", overflow: "hidden", background: C.white, pageBreakAfter: esUltima ? "auto" : "always", boxSizing: "border-box" }}
              >
                {encabezadoHoja(paginaIndex + 1, paginas.length)}

                {esPrimera && (
                  <div style={{ marginTop: 14 }}>
                    <div className="grid grid-cols-2" style={{ gap: "4px 28px", background: C.slate50, borderRadius: 10, padding: "10px 14px", fontFamily: '"Calibri Light", Calibri, Arial, sans-serif' }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: C.marca, textTransform: "uppercase", borderBottom: `1px solid ${C.slate100}`, paddingBottom: 3, marginBottom: 5 }}>Datos del cliente</div>
                        {filaDato("Cliente", cliente?.razon_social || cot.cliente || "—")}
                        {filaDato("RUC / DNI", cliente?.numero_documento || "—")}
                        {filaDato("Atención", cliente?.contacto || "—")}
                        {filaDato("Ubicación", cot.ubicacion || cliente?.direccion || "—")}
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: C.marca, textTransform: "uppercase", borderBottom: `1px solid ${C.slate100}`, paddingBottom: 3, marginBottom: 5 }}>Emisión y contacto</div>
                        {filaDato("Emisión", F(cot.fecha_emision))}
                        {filaDato("Vence", F(vigenciaHasta(cot.fecha_emision, Number(cot.validez_dias))))}
                        {filaDato("Por", nombre || email || "—")}
                        {filaDato("Celular", empresa?.telefono || "—")}
                        {filaDato("E-mail", empresa?.email || "—")}
                      </div>
                    </div>
                    <div className="flex" style={{ marginTop: 8, background: C.marca, color: C.white, borderRadius: 8, padding: "7px 14px", fontFamily: '"Calibri Light", Calibri, Arial, sans-serif', fontSize: "11pt", lineHeight: 1.25 }}>
                      <span style={{ fontWeight: 800, letterSpacing: 1, fontSize: 9.5, textTransform: "uppercase", paddingTop: 1, marginRight: 10 }}>Proyecto</span>
                      <span style={{ fontWeight: 300 }}>{cot.nombre || "—"}</span>
                    </div>
                  </div>
                )}

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
                  <thead>
                    <tr style={{ background: C.slate900, color: C.white }}>
                      {[
                        { h: "Ítem", a: "center" },
                        { h: "Descripción", a: "left" },
                        { h: "Marca", a: "center" },
                        { h: "Unidad", a: "center" },
                        { h: "Cantidad", a: "right" },
                        { h: "C. Unitario", a: "right" },
                        { h: "Sub Total", a: "right" },
                      ].map(({ h, a }) => (
                        <th key={h} style={{ padding: "10px 12px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, textAlign: a as "left" | "right" | "center" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: '"Calibri Light", Calibri, Arial, sans-serif', fontSize: "11pt", fontWeight: 300, lineHeight: 1.25 }}>
                    {itemsPagina.map((it, i) => (
                      <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                        <td style={{ ...celda, padding: "9px 12px", textAlign: "center", color: C.slate500 }}>{it.codigo || String(indiceInicial + i + 1).padStart(2, "0")}</td>
                        <td style={{ ...celda, padding: "9px 12px" }}>
                          <div style={{ fontWeight: 300 }}>{it.nombre}</div>
                          {(it.especialidad || it.categoria) && <div style={{ marginTop: 3, fontSize: "11pt", fontWeight: 300, color: C.slate500, lineHeight: 1.25 }}>{[it.especialidad, it.categoria].filter(Boolean).join(" · ")}</div>}
                        </td>
                        <td style={{ ...celda, padding: "9px 12px", textAlign: "center", color: C.slate500 }}>{it.marca?.trim() || "-"}</td>
                        <td style={{ ...celda, padding: "9px 12px", textAlign: "center", color: C.slate500 }}>{it.unidad}</td>
                        <td style={{ ...celda, padding: "9px 12px", textAlign: "right" }}>{Number(it.metrado).toLocaleString("es-PE", { maximumFractionDigits: 2 })}</td>
                        <td style={{ ...celda, padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{S(Number(it.precio_unitario))}</td>
                        <td style={{ ...celda, padding: "9px 12px", textAlign: "right", fontWeight: 300, whiteSpace: "nowrap" }}>{S(Number(it.metrado) * Number(it.precio_unitario))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {esUltima && (
                  <div className="bloque-final" style={{ pageBreakInside: "avoid" }}>
                    <div className="flex justify-end" style={{ marginTop: 14 }}>
                      <div style={{ width: 280 }}>
                        <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700 }}><span>Costo Directo</span><span>{S(calculo.costoDirecto)}</span></div>
                        {calculo.gastosGenerales > 0 && <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700 }}><span>Gastos Generales ({Number(cot.pct_gastos_generales)}%)</span><span>{S(calculo.gastosGenerales)}</span></div>}
                        {calculo.utilidad > 0 && <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700 }}><span>Utilidad ({Number(cot.pct_utilidad)}%)</span><span>{S(calculo.utilidad)}</span></div>}
                        {(calculo.gastosGenerales > 0 || calculo.utilidad > 0) && <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700, fontWeight: 600 }}><span>Subtotal</span><span>{S(subtotal)}</span></div>}
                        <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700, borderBottom: `1px solid ${C.slate100}` }}><span>{conIgv ? "IGV (18%)" : "IGV (0%)"}</span><span>{S(igv)}</span></div>
                        <div className="flex justify-between" style={{ marginTop: 7, padding: "10px 14px", background: C.slate900, color: C.white, borderRadius: 8, fontFamily: '"Calibri Light", Calibri, Arial, sans-serif', fontSize: "12pt", fontWeight: 300 }}>
                          <span>TOTAL</span><span>{S(total)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, borderTop: `1px solid ${C.slate100}`, paddingTop: 10, fontSize: 10.5, color: C.slate500, lineHeight: 1.45 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.slate700, marginBottom: 5 }}>Términos y condiciones</div>
                      <div><b style={{ color: C.slate700 }}>Condiciones comerciales:</b> {cot.condiciones || "Sin condiciones registradas."}</div>
                      <div style={{ marginTop: 7, color: C.slate400 }}>
                        {conIgv ? "Precios expresados en soles, incluyen IGV (18%)." : "Precios expresados en soles, no afectos a IGV."} Oferta válida hasta la fecha indicada.
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ position: "absolute", left: 30, right: 30, bottom: 15, textAlign: "center", fontSize: 9, color: C.slate400 }}>
                  Hoja {paginaIndex + 1} de {paginas.length}
                </div>
              </section>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}

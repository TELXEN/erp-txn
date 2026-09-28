import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Vacio } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
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
};

const S = (n: number) =>
  "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const F = (d: string) => d.split("-").reverse().join("/");

function VistaCotizacion() {
  const { id } = Route.useSearch();
  const { data: cotizaciones = [], isLoading: cargandoCotizaciones } = useCotizaciones();
  const { data: items = [], isLoading: cargandoItems } = useCotizacionItems(id || null);
  const { data: empresa, isLoading: cargandoEmpresa } = useEmpresa();
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
  const calculo = cot
    ? totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad))
    : { costoDirecto: 0, gastosGenerales: 0, utilidad: 0, total: 0 };
  const subtotal = calculo.total;
  const igv = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + igv;
  const nombreArchivo = `Cotizacion_${(cot?.cliente || "Cliente").replace(/[^\w-]+/g, "_")}_${cot?.codigo ?? "sin_codigo"}`;

  async function descargarPdf() {
    const el = document.getElementById("cotizacion-impresion");
    if (!el) return;
    setPdfCargando(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 12,
          filename: `${nombreArchivo}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 700, backgroundColor: "#ffffff", logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
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
    const cab = ws.addRow(["Ítem", "Descripción", "Cantidad", "Unidad", "Precio Unitario", "Total"]);
    cab.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", horizontal: "center" };
    });
    const primera = ws.rowCount + 1;
    items.forEach((it, i) => {
      const r = ws.addRow([it.codigo || i + 1, it.nombre, Number(it.metrado), it.unidad, Number(it.precio_unitario)]);
      r.getCell(6).value = { formula: `C${r.number}*E${r.number}` };
    });
    const ultima = ws.rowCount;
    const tot = ws.addRow(["", "TOTAL", "", "", "", { formula: `SUM(F${primera}:F${ultima})` }]);
    tot.font = { bold: true };
    ["E", "F"].forEach((col) => (ws.getColumn(col).numFmt = '"S/" #,##0.00'));
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
              <FileSpreadsheet size={14} /> Exportar a Excel (Matriz de Costos)
            </Boton>
            <Boton variante="accion" onClick={descargarPdf} disabled={pdfCargando}>
              <FileDown size={14} /> {pdfCargando ? "Generando..." : "Descargar PDF Comercial"}
            </Boton>
          </div>
        }
      />

      <div className="overflow-x-auto pb-8">
        <div className="mx-auto" style={{ width: 700 }}>
        <div
          id="cotizacion-impresion"
          style={{ width: 700, background: C.white, color: C.slate900, padding: 24, fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)" }}
        >
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-6" style={{ borderBottom: `2px solid ${C.slate900}`, paddingBottom: 20 }}>
            <div className="flex gap-4">
              {empresa?.logo_url ? (
                <div className="flex items-center justify-center" style={{ width: 92, height: 72 }}>
                  <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ display: "block", maxWidth: 92, maxHeight: 72, objectFit: "contain" }} />
                </div>
              ) : (
                <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 12, background: C.slate900, color: C.white, fontWeight: 700, fontSize: 20 }}>
                  {(empresa?.razon_social || "TELXEN").split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
                </div>
              )}
              <div className="grid" style={{ gap: 2 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN S.A.C."}</div>
                {empresa?.ruc && <div style={{ color: C.slate500 }}>RUC {empresa.ruc}</div>}
                {empresa?.direccion && <div style={{ color: C.slate500 }}>{empresa.direccion}</div>}
                {empresa?.telefono && <div style={{ color: C.slate500 }}>{empresa.telefono}</div>}
              </div>
            </div>
            <div style={{ border: `1px solid ${C.emerald600}`, background: C.emerald50, borderRadius: 10, padding: "12px 20px", textAlign: "right", minWidth: 190 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: C.slate900 }}>COTIZACIÓN</div>
              <div style={{ marginTop: 4, fontWeight: 700, color: C.emerald600, fontSize: 14 }}>{cot.codigo ?? "SIN CÓDIGO"}</div>
            </div>
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-3" style={{ gap: "11px 24px", marginTop: 20, background: C.slate50, borderRadius: 10, padding: 16 }}>
            {[
              ["Cliente / Razón social", cliente?.razon_social || cot.cliente || "—", "col-span-2"],
              ["RUC / DNI", cliente?.numero_documento || "—", ""],
              ["Atención", cliente?.contacto || "—", ""],
              ["Fecha de emisión", F(cot.fecha_emision), ""],
              ["Válida hasta", F(vigenciaHasta(cot.fecha_emision, Number(cot.validez_dias))), ""],
              ["Trabajo", cot.nombre || "—", "col-span-2"],
              ["Ubicación", cot.ubicacion || cliente?.direccion || "—", ""],
            ].map(([k, v, cls]) => (
              <div key={k} className={cls}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: C.slate400, fontWeight: 700 }}>{k}</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
            <thead>
              <tr style={{ background: C.slate900, color: C.white }}>
                {["Ítem", "Descripción", "Cant.", "Und.", "P. Unitario", "Total"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, textAlign: i >= 4 || i === 2 ? "right" : i === 3 || i === 0 ? "center" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ ...celda, textAlign: "center", color: C.slate500 }}>{it.codigo || String(i + 1).padStart(2, "0")}</td>
                  <td style={celda}>
                    <div style={{ fontWeight: 600 }}>{it.nombre}</div>
                    {(it.especialidad || it.categoria) && <div style={{ marginTop: 3, fontSize: 10.5, color: C.slate500, lineHeight: 1.45 }}>{[it.especialidad, it.categoria].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td style={{ ...celda, textAlign: "right" }}>{Number(it.metrado).toLocaleString("es-PE", { maximumFractionDigits: 2 })}</td>
                  <td style={{ ...celda, textAlign: "center", color: C.slate500 }}>{it.unidad}</td>
                  <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{S(Number(it.precio_unitario))}</td>
                  <td style={{ ...celda, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>{S(Number(it.metrado) * Number(it.precio_unitario))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end" style={{ marginTop: 18 }}>
            <div style={{ width: 280 }}>
              <div className="flex justify-between" style={{ padding: "6px 0", color: C.slate700 }}><span>Subtotal</span><span>{S(subtotal)}</span></div>
              {calculo.gastosGenerales > 0 && <div className="flex justify-between" style={{ padding: "6px 0", color: C.slate700 }}><span>Gastos generales ({Number(cot.pct_gastos_generales)}%)</span><span>{S(calculo.gastosGenerales)}</span></div>}
              {calculo.utilidad > 0 && <div className="flex justify-between" style={{ padding: "6px 0", color: C.slate700 }}><span>Utilidad ({Number(cot.pct_utilidad)}%)</span><span>{S(calculo.utilidad)}</span></div>}
              <div className="flex justify-between" style={{ padding: "6px 0", color: C.slate700, borderBottom: `1px solid ${C.slate100}` }}><span>IGV (18%)</span><span>{S(igv)}</span></div>
              <div className="flex justify-between" style={{ marginTop: 8, padding: "12px 14px", background: C.slate900, color: C.white, borderRadius: 8, fontSize: 15, fontWeight: 700 }}>
                <span>TOTAL</span><span>{S(total)}</span>
              </div>
            </div>
          </div>

          {/* Términos */}
          <div style={{ marginTop: 22, borderTop: `1px solid ${C.slate100}`, paddingTop: 12, fontSize: 10.5, color: C.slate500, lineHeight: 1.5, pageBreakInside: "avoid" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.slate700, marginBottom: 6 }}>Términos y condiciones</div>
            <div><b style={{ color: C.slate700 }}>Condiciones comerciales:</b> {cot.condiciones || "Sin condiciones registradas."}</div>
            <div style={{ marginTop: 10, color: C.slate400 }}>Precios expresados en soles. Oferta válida hasta la fecha indicada.</div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Encabezado } from "@/components/AppShell";
import { Boton } from "@/components/ui-kit";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cotizacion-vista")({
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

const DEMO = {
  empresa: {
    nombre: "TELXEN S.A.C.",
    ruc: "20600000001",
    direccion: "Av. Javier Prado Este 1234, San Isidro, Lima",
    telefono: "(01) 555-0100 · +51 999 888 777",
  },
  numero: "COT-2026-001",
  cliente: {
    razon: "Constructora Andina S.A.",
    ruc: "20512345678",
    atencion: "Ing. María Quispe",
    emision: "2026-09-28",
    validez: "2026-10-28",
  },
  items: [
    { desc: "Suministro e instalación de tablero eléctrico general", espec: "Gabinete metálico IP65, 400×600 mm, interruptores termomagnéticos Schneider, barra de cobre 200 A.", cant: 1, und: "und", pu: 8450 },
    { desc: "Cableado estructurado Cat 6A", espec: "Incluye canaletas, face plates, patch panel de 24 puertos y certificación Fluke por punto.", cant: 48, und: "pto", pu: 185 },
    { desc: "Sistema de pozo a tierra", espec: "Varilla de cobre 5/8\" × 2.4 m, cemento conductivo y medición con protocolo.", cant: 2, und: "und", pu: 1250 },
    { desc: "Luminarias LED panel 60×60", espec: "40 W, 4000 K, driver incluido.", cant: 36, und: "und", pu: 142.5 },
    { desc: "Mano de obra especializada y supervisión", espec: "", cant: 1, und: "glb", pu: 6800 },
  ],
  terminos: {
    pago: "50% de adelanto a la orden de compra, 50% contra entrega y conformidad.",
    entrega: "15 días calendario desde la recepción del adelanto.",
    banco: "BCP Cta. Cte. S/ 191-1234567-0-12 · CCI 002-191-001234567012-55",
  },
};

const S = (n: number) =>
  "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const F = (d: string) => d.split("-").reverse().join("/");

function VistaCotizacion() {
  const [pdfCargando, setPdfCargando] = useState(false);
  const d = DEMO;
  const subtotal = d.items.reduce((s, i) => s + i.cant * i.pu, 0);
  const igv = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + igv;
  const nombreArchivo = `Cotizacion_${d.cliente.razon.replace(/[^\w-]+/g, "_")}_${d.numero}`;

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
          pagebreak: { mode: ["avoid-all", "css"] },
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
    ws.addRow([`${d.numero} — ${d.cliente.razon}`]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const cab = ws.addRow(["Ítem", "Descripción", "Cantidad", "Unidad", "Precio Unitario", "Total"]);
    cab.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", horizontal: "center" };
    });
    const primera = ws.rowCount + 1;
    d.items.forEach((it, i) => {
      const r = ws.addRow([i + 1, it.espec ? `${it.desc} — ${it.espec}` : it.desc, it.cant, it.und, it.pu]);
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

  return (
    <>
      <Encabezado
        titulo="Vista previa de cotización"
        subtitulo="Datos de prueba — revisa la estructura antes de exportar"
        acciones={
          <div className="flex flex-wrap gap-2">
            <Link to="/cotizaciones">
              <Boton variante="linea"><ArrowLeft size={13} /> Volver</Boton>
            </Link>
            <Boton variante="linea" onClick={exportarExcel}>
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
          style={{ width: 700, background: C.white, color: C.slate900, padding: 28, fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)" }}
        >
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-6" style={{ borderBottom: `2px solid ${C.slate900}`, paddingBottom: 20 }}>
            <div className="flex gap-4">
              <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 12, background: C.slate900, color: C.white, fontWeight: 700, fontSize: 20 }}>
                TX
              </div>
              <div className="grid" style={{ gap: 2 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{d.empresa.nombre}</div>
                <div style={{ color: C.slate500 }}>RUC {d.empresa.ruc}</div>
                <div style={{ color: C.slate500 }}>{d.empresa.direccion}</div>
                <div style={{ color: C.slate500 }}>{d.empresa.telefono}</div>
              </div>
            </div>
            <div style={{ border: `1px solid ${C.emerald600}`, background: C.emerald50, borderRadius: 10, padding: "12px 20px", textAlign: "right", minWidth: 190 }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: C.slate900 }}>COTIZACIÓN</div>
              <div style={{ marginTop: 4, fontWeight: 700, color: C.emerald600, fontSize: 14 }}>{d.numero}</div>
            </div>
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-3" style={{ gap: "14px 24px", marginTop: 24, background: C.slate50, borderRadius: 10, padding: 18 }}>
            {[
              ["Cliente / Razón social", d.cliente.razon, "col-span-2"],
              ["RUC / DNI", d.cliente.ruc, ""],
              ["Atención", d.cliente.atencion, ""],
              ["Fecha de emisión", F(d.cliente.emision), ""],
              ["Válida hasta", F(d.cliente.validez), ""],
            ].map(([k, v, cls]) => (
              <div key={k} className={cls}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: C.slate400, fontWeight: 700 }}>{k}</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
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
              {d.items.map((it, i) => (
                <tr key={i} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ ...celda, textAlign: "center", color: C.slate500 }}>{String(i + 1).padStart(2, "0")}</td>
                  <td style={celda}>
                    <div style={{ fontWeight: 600 }}>{it.desc}</div>
                    {it.espec && <div style={{ marginTop: 3, fontSize: 10.5, color: C.slate500, lineHeight: 1.45 }}>{it.espec}</div>}
                  </td>
                  <td style={{ ...celda, textAlign: "right" }}>{it.cant}</td>
                  <td style={{ ...celda, textAlign: "center", color: C.slate500 }}>{it.und}</td>
                  <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{S(it.pu)}</td>
                  <td style={{ ...celda, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>{S(it.cant * it.pu)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end" style={{ marginTop: 18 }}>
            <div style={{ width: 280 }}>
              <div className="flex justify-between" style={{ padding: "6px 0", color: C.slate700 }}><span>Subtotal</span><span>{S(subtotal)}</span></div>
              <div className="flex justify-between" style={{ padding: "6px 0", color: C.slate700, borderBottom: `1px solid ${C.slate100}` }}><span>IGV (18%)</span><span>{S(igv)}</span></div>
              <div className="flex justify-between" style={{ marginTop: 8, padding: "12px 14px", background: C.slate900, color: C.white, borderRadius: 8, fontSize: 15, fontWeight: 700 }}>
                <span>TOTAL</span><span>{S(total)}</span>
              </div>
            </div>
          </div>

          {/* Términos */}
          <div style={{ marginTop: 32, borderTop: `1px solid ${C.slate100}`, paddingTop: 16, fontSize: 10.5, color: C.slate500, lineHeight: 1.6, pageBreakInside: "avoid" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.slate700, marginBottom: 6 }}>Términos y condiciones</div>
            <div><b style={{ color: C.slate700 }}>Condiciones de pago:</b> {d.terminos.pago}</div>
            <div><b style={{ color: C.slate700 }}>Tiempo de entrega:</b> {d.terminos.entrega}</div>
            <div><b style={{ color: C.slate700 }}>Depósitos:</b> {d.terminos.banco}</div>
            <div style={{ marginTop: 10, color: C.slate400 }}>Precios expresados en soles. Oferta válida hasta la fecha indicada.</div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

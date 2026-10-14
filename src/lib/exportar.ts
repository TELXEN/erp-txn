import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { soles } from "./format";
import { fuenteDocumento, type FuenteDocumentoId } from "./fuentes-documentos";
import { registrarFuenteJsPdf } from "./fuentes-jspdf";

export type Hoja = { nombre: string; filas: Record<string, string | number>[] };

export async function exportarExcel(archivo: string, hojas: Hoja[]) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import("exceljs"), import("file-saver")]);
  const libro = new ExcelJS.Workbook();
  const fuente = fuenteDocumento(typeof document === "undefined" ? undefined : document.documentElement.dataset["fuenteDocumento"]);
  hojas.forEach((h) => {
    const datos = h.filas.length ? h.filas : [{ Aviso: "Sin datos" }];
    const columnas = Array.from(new Set(datos.flatMap((fila) => Object.keys(fila))));
    const hoja = libro.addWorksheet(h.nombre.slice(0, 30));
    hoja.addRow(columnas);
    datos.forEach((fila) => hoja.addRow(columnas.map((columna) => fila[columna] ?? "")));
    hoja.eachRow((fila, indice) => {
      fila.eachCell({ includeEmpty: true }, (celda) => {
        celda.font = { ...celda.font, name: fuente.excelFamily, bold: indice === 1 };
      });
    });
    hoja.columns.forEach((columna) => {
      let ancho = 10;
      columna.eachCell?.({ includeEmpty: false }, (celda) => {
        ancho = Math.max(ancho, String(celda.value ?? "").length + 2);
      });
      columna.width = Math.min(ancho, 60);
    });
  });
  const buffer = await libro.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${archivo}.xlsx`);
}

export type BarraPdf = {
  partida: string;
  avance: number;
  gastado: number;
  diferencia: number;
};

export async function exportarPdf(opciones: {
  titulo: string;
  subtitulo: string;
  kpis?: { etiqueta: string; valor: number }[];
  barras?: BarraPdf[];
  tabla?: { columnas: string[]; filas: (string | number)[][] };
  archivo: string;
  fuentePdf?: FuenteDocumentoId;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4", putOnlyUsedFonts: true });
  const seleccion = opciones.fuentePdf ?? (typeof document === "undefined" ? undefined : document.documentElement.dataset["fuenteDocumento"]);
  const familia = await registrarFuenteJsPdf(doc, seleccion);
  const ancho = doc.internal.pageSize.getWidth();
  const margen = 40;
  let y = 48;

  doc.setFont(familia, "bold");
  doc.setFontSize(16);
  doc.text(opciones.titulo, margen, y);
  y += 16;
  doc.setFont(familia, "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(opciones.subtitulo, margen, y);
  doc.setTextColor(20);
  y += 18;
  doc.setDrawColor(220, 216, 200);
  doc.line(margen, y, ancho - margen, y);
  y += 20;

  if (opciones.kpis?.length) {
    const columnas = Math.min(3, opciones.kpis.length);
    const w = (ancho - margen * 2 - 8 * (columnas - 1)) / columnas;
    const alto = 72;
    opciones.kpis.forEach((k, i) => {
      const x = margen + (i % columnas) * (w + 8);
      const filaY = y + Math.floor(i / columnas) * (alto + 8);
      doc.setDrawColor(220, 216, 200);
      doc.roundedRect(x, filaY, w, alto, 4, 4);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(doc.splitTextToSize(k.etiqueta.toUpperCase(), w - 20), x + 10, filaY + 18);
      doc.setFontSize(13);
      doc.setFont(familia, "bold");
      doc.setTextColor(k.valor < 0 ? 210 : 20, k.valor < 0 ? 63 : 20, k.valor < 0 ? 47 : 26);
      doc.text(soles(k.valor), x + 10, filaY + 54);
      doc.setFont(familia, "normal");
      doc.setTextColor(20);
    });
    y += Math.ceil(opciones.kpis.length / columnas) * (alto + 8) + 12;
  }

  if (opciones.barras?.length) {
    doc.setFontSize(11);
    doc.setFont(familia, "bold");
    doc.text("Rendimiento por Partida", margen, y);
    doc.setFont(familia, "normal");
    y += 16;
    const anchoBarra = ancho - margen * 2 - 150;
    opciones.barras.forEach((b) => {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }
      doc.setFontSize(8);
      doc.setTextColor(30);
      doc.text(b.partida.slice(0, 46), margen, y);
      const sobre = b.gastado > b.avance;
      doc.setTextColor(sobre ? 210 : 31, sobre ? 63 : 138, sobre ? 47 : 82);
      doc.text(`${soles(b.diferencia)}`, ancho - margen, y, { align: "right" });
      doc.setTextColor(30);
      y += 6;
      // barra avance
      doc.setFillColor(235, 233, 224);
      doc.rect(margen, y, anchoBarra, 6, "F");
      doc.setFillColor(31, 111, 84);
      doc.rect(margen, y, (anchoBarra * Math.min(b.avance, 100)) / 100, 6, "F");
      doc.setFontSize(7);
      doc.setTextColor(110);
      doc.text(`Avance ${b.avance.toFixed(0)}%`, margen + anchoBarra + 8, y + 6);
      y += 9;
      doc.setFillColor(235, 233, 224);
      doc.rect(margen, y, anchoBarra, 6, "F");
      if (sobre) doc.setFillColor(210, 63, 47);
      else doc.setFillColor(31, 138, 82);
      doc.rect(margen, y, (anchoBarra * Math.min(b.gastado, 100)) / 100, 6, "F");
      doc.setTextColor(110);
      doc.text(`Gasto ${b.gastado.toFixed(0)}%`, margen + anchoBarra + 8, y + 6);
      doc.setTextColor(30);
      y += 20;
    });
    y += 6;
  }

  if (opciones.tabla) {
    autoTable(doc, {
      startY: y,
      head: [opciones.tabla.columnas],
      body: opciones.tabla.filas,
      styles: { font: familia, fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [31, 111, 84], textColor: 255 },
      margin: { left: margen, right: margen },
    });
  }

  doc.save(`${opciones.archivo}.pdf`);
}

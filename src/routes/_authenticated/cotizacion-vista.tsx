import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Vacio } from "@/components/ui-kit";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useAuth } from "@/lib/auth";
import { simboloMoneda, totalesCotizacion, useCotizacionItems, useCotizaciones, vigenciaHasta } from "@/lib/cotizaciones";
import { DOC, DOC_FUENTE_CSS, DOC_MONO } from "@/lib/documento-tema";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";
import type { ReactNode } from "react";

/** Eslogan en dos líneas: se corta en la primera coma. */
function esloganDosLineas(texto: string): ReactNode {
  const i = texto.indexOf(",");
  if (i < 0 || i >= texto.length - 1) return texto;
  return (
    <>
      {texto.slice(0, i + 1)}
      <br />
      {texto.slice(i + 1).trim()}
    </>
  );
}

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

// Vista previa e impresión con la paleta documental TELXEN.
const C = {
  slate900: DOC.dark,
  slate700: DOC.ink,
  slate500: DOC.mute,
  slate400: DOC.mute,
  slate100: DOC.total,
  slate50: DOC.soft,
  emerald800: DOC.green,
  emerald700: DOC.green,
  emerald50: DOC.accentSoft,
  white: DOC.white,
};

/** Impresión: el contenido (especialidad, categoría y partidas) sale en negro. */
const NIVEL = {
  grupo: DOC_MONO.ink,     // especialidad o grupo (Suministro / Montaje)
  categoria: DOC_MONO.ink, // categoría de partidas
  partida: DOC_MONO.ink,   // fila de partida
} as const;

const S = (sim: string, n: number) =>
  `${sim} ` + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const F = (d: string) => d.split("-").reverse().join("/");

type ItemCot = {
  id: string;
  codigo?: string | null;
  nombre: string;
  especialidad: string;
  categoria?: string | null;
  grupo?: string | null;
  marca?: string | null;
  unidad: string;
  metrado: number | string;
  precio_unitario: number | string;
};

type Fila =
  | { clase: "grupo"; llave: string; texto: string; numero: string; total: number }
  | { clase: "sub"; llave: string; texto: string; numero: string; total: number }
  | { clase: "item"; llave: string; item: ItemCot; indice: number; numero: string };

/**
 * Construye las filas de la hoja con niveles dinámicos:
 * multidisciplinaria → especialidad > grupo > categoría; una disciplina → grupo > categoría.
 * Si solo hay un grupo y el alcance es parcial, el nivel de grupo no se imprime.
 */
function construirFilas(items: ItemCot[], opts: { multi?: boolean; alcance?: string | undefined } = {}): Fila[] {
  const filas: Fila[] = [];
  const claveNiveles = (it: ItemCot): string[] => {
    const cat = (it.categoria ?? "").trim() || "Sin categoría";
    if (opts.multi) return [(it.especialidad || "").trim() || "Sin especialidad", (it.grupo || "").trim(), cat];
    return [(it.especialidad || "").trim() || "Sin grupo", cat];
  };
  const tops = new Set(items.map((i) => claveNiveles(i)[0]));
  const omitirTop = !opts.multi && tops.size <= 1 && opts.alcance && opts.alcance !== "ambos";
  type Nodo = { hijos: Map<string, Nodo>; items: ItemCot[] };
  const raiz: Nodo = { hijos: new Map(), items: [] };
  for (const it of items) {
    let n = raiz;
    const niveles = claveNiveles(it).slice(omitirTop ? 1 : 0);
    for (const k of niveles) {
      if (!n.hijos.has(k)) n.hijos.set(k, { hijos: new Map(), items: [] });
      n = n.hijos.get(k)!;
    }
    n.items.push(it);
  }
  let n = 0;
  // Los números salen del código WBS guardado (01.01.01.01 = especialidad.grupo.categoría.partida).
  const primerCodigo = (nodo: Nodo): string => {
    const it = nodo.items.find((i) => (i.codigo ?? "").trim());
    if (it) return (it.codigo as string).trim();
    for (const h of nodo.hijos.values()) {
      const c = primerCodigo(h);
      if (c) return c;
    }
    return "";
  };
  // Suma de las partidas del nodo y sus descendientes (total del encabezado).
  const totalNodo = (nodo: Nodo): number =>
    nodo.items.reduce((t, i) => t + Number(i.metrado) * Number(i.precio_unitario), 0) +
    [...nodo.hijos.values()].reduce((t, h) => t + totalNodo(h), 0);
  // Multi: 4 niveles (esp.grupo.cat.partida); una disciplina: 3 niveles (grupo.cat.partida). En ambos el primer nivel visible es 1 segmento.
  const desfase = 1 + (omitirTop ? 1 : 0);
  const recorrer = (nodo: Nodo, prefijo: string, prof: number) => {
    let j = 0;
    for (const [k, hijo] of nodo.hijos) {
      const vacio = k === "" || k === "Sin categoría";
      const omitir = vacio && nodo.hijos.size === 1;
      if (omitir) {
        recorrer(hijo, prefijo, prof + 1);
        continue;
      }
      j += 1;
      const cod = primerCodigo(hijo).split(".");
      const numero = cod.length >= prof + desfase ? cod.slice(0, prof + desfase).join(".") : prefijo ? `${prefijo}.${String(j).padStart(2, "0")}` : String(j).padStart(2, "0");
      filas.push({ clase: prof === 0 ? "grupo" : "sub", llave: `n-${numero}-${k}`, texto: prof === 0 ? k.toUpperCase() : k, numero, total: totalNodo(hijo) });
      recorrer(hijo, numero, prof + 1);
    }
    let kk = 0;
    for (const it of nodo.items) {
      n += 1;
      kk += 1;
      filas.push({ clase: "item", llave: it.id, item: it, indice: n, numero: (it.codigo ?? "").trim() || (prefijo ? `${prefijo}.${kk}` : String(kk)) });
    }
  };
  recorrer(raiz, "", 0);
  return filas;
}

/** Costo directo por grupo (Suministro / Montaje) para el desglose. */
function subtotalesPorGrupo(items: ItemCot[]) {
  const m = new Map<string, number>();
  for (const it of items) {
    const g = (it.grupo || "").trim();
    if (!g) continue;
    m.set(g, (m.get(g) ?? 0) + Number(it.metrado) * Number(it.precio_unitario));
  }
  return [...m.entries()];
}

function altoEstimadoFila(fila: Fila, charsPorLinea = 62) {
  if (fila.clase !== "item") return 22;
  // La descripción ocupa la mitad del nuevo ancho útil: ~62 caracteres por línea en vertical.
  const lineas = Math.max(1, Math.ceil((fila.item.nombre || "").length / charsPorLinea));
  return 14 + lineas * 15;
}

function paginarFilas(filas: Fila[], horizontal = false, factor = 1) {
  if (filas.length === 0) return [[]] as Fila[][];
  const charsPorLinea = horizontal ? 95 : 62;
  // A4 horizontal mide 1123 × 794 px a 96 dpi. Antes se calculaba con 700 px
  // de alto, por lo que se enviaban filas a otra hoja dejando espacio visible.
  const altoAdicionalHorizontal = horizontal ? 94 : 0;
  const paginas: Fila[][] = [];
  let pendientes = [...filas];
  let primeraHoja = true;

  while (pendientes.length > 0) {
    const capacidad = ((horizontal ? (primeraHoja ? 330 : 455) : primeraHoja ? 470 : 650) + altoAdicionalHorizontal) * factor;
    const capacidadFinal = ((horizontal ? (primeraHoja ? 175 : 245) : primeraHoja ? 250 : 350) + altoAdicionalHorizontal) * factor;
    const altoPendiente = pendientes.reduce((suma, fila) => suma + altoEstimadoFila(fila, charsPorLinea), 0);

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
      const siguiente = altoEstimadoFila(proximo, charsPorLinea);
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
  const { fuente } = useFuenteDocumento();
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
  const esUsd = cot?.moneda === "USD";
  const sim = simboloMoneda(cot?.moneda);
  const tc = Number(cot?.tipo_cambio) || 0;
  const [horizontalPreferida, setHorizontalPreferida] = useState<boolean | null>(null);
  useEffect(() => { setHorizontalPreferida(null); }, [id]);
  const qc = useQueryClient();
  const horizontal = horizontalPreferida ?? cot?.orientacion === "horizontal";
  const paginaW = horizontal ? 1123 : 794;
  const interiorW = horizontal ? 1087 : 754;
  const paginaH = horizontal ? 794 : 990;
  const [factorPagina, setFactorPagina] = useState(1);
  const [finalAparte, setFinalAparte] = useState(false);
  useEffect(() => { setFactorPagina(1); setFinalAparte(false); }, [id, horizontal, items.length]);
  const nombreArchivo = `Cotizacion_${(cot?.cliente || "Cliente").replace(/[^\w-]+/g, "_")}_${cot?.codigo ?? "sin_codigo"}`;
  const paginas = paginarFilas(construirFilas(items as unknown as ItemCot[], { multi: Boolean(cot?.multidisciplinaria), alcance: cot?.alcance }), horizontal, factorPagina).concat(finalAparte ? [[]] : []);
  // Si una hoja de partidas se desborda, se reduce un poco la capacidad; si solo se desborda la última
  // (por el bloque de totales y condiciones), ese bloque pasa a una hoja propia.
  useLayoutEffect(() => {
    const hojas = [...document.querySelectorAll<HTMLElement>("#cotizacion-impresion .cotizacion-hoja")];
    const desborda = (h: HTMLElement) => h.scrollHeight > h.clientHeight + 1;
    const intermedias = hojas.slice(0, -1).some(desborda);
    if (intermedias && factorPagina > 0.6) { setFactorPagina((f) => Math.max(0.6, f - 0.05)); return; }
    const ultima = hojas[hojas.length - 1];
    if (ultima && desborda(ultima) && !finalAparte && hojas.length > 0) setFinalAparte(true);
  });
  const porGrupo = subtotalesPorGrupo(items as unknown as ItemCot[]);

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

  function alternarHorizontal(v: boolean) {
    setHorizontalPreferida(v);
    void supabase
      .from("cotizaciones")
      .update({ orientacion: v ? "horizontal" : "vertical" })
      .eq("id", id)
      .then(() => qc.invalidateQueries({ queryKey: ["cotizaciones"] }));
  }

  async function descargarPdf() {
    const el = document.getElementById("cotizacion-impresion");
    if (!el) return;
    setPdfCargando(true);
    try {
      await document.fonts.ready;
      const html2pdf = (await import("html2pdf.js")).default;
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: horizontal ? "landscape" : "portrait" });
      const hojas = Array.from(el.querySelectorAll<HTMLElement>(".cotizacion-hoja"));
      for (const [indice, hoja] of hojas.entries()) {
        const canvas = await html2pdf().set({
          margin: 0,
          jsPDF: { unit: "mm", format: "a4", orientation: horizontal ? "landscape" : "portrait" },
          html2canvas: { scale: 3, width: hoja.offsetWidth, height: hoja.offsetHeight, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: paginaW, backgroundColor: "#ffffff", logging: false },
          pagebreak: { mode: [] },
        } as never).from(hoja).toCanvas().get("canvas") as HTMLCanvasElement;
        if (indice > 0) doc.addPage();
        doc.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
      }
      doc.save(`${nombreArchivo}.pdf`);
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
    const fuenteExcel = fuente.excelFamily;
    ws.addRow([`${cot.codigo ?? "Cotización"} — ${cot.cliente}`]).font = { name: fuenteExcel, bold: true, size: 13 };
    ws.addRow([]);
    const cab = ws.addRow(["Ítem", "Descripción", "Marca", "Unidad", "Cantidad", "C. Unitario", "Sub Total"]);
    cab.eachCell((c) => {
       c.font = { name: fuenteExcel, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", horizontal: "center" };
    });
    const filasPartida: number[] = [];
    construirFilas(items as unknown as ItemCot[], { multi: Boolean(cot.multidisciplinaria), alcance: cot.alcance }).forEach((fila) => {
      if (fila.clase !== "item") {
        // Encabezados (especialidad/grupo/categoría) llevan su total; no entra al COSTO DIRECTO para no duplicar.
        const g = ws.addRow([fila.numero, fila.texto, "", "", "", "", Math.round(fila.total * 100) / 100]);
        g.font = { name: fuenteExcel, bold: true, size: fila.clase === "grupo" ? 11 : 10 };
        g.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fila.clase === "grupo" ? "FFE2E8F0" : "FFF1F5F9" } };
        return;
      }
      const it = fila.item;
      const r = ws.addRow([it.codigo || fila.numero, it.nombre, it.marca?.trim() || "-", it.unidad, Number(it.metrado), Number(it.precio_unitario)]);
      r.getCell(7).value = { formula: `E${r.number}*F${r.number}` };
      filasPartida.push(r.number);
    });
    // Suma solo las filas de partida (los totales de encabezado son informativos).
    const sub = ws.addRow(["", "COSTO DIRECTO", "", "", "", "", { formula: filasPartida.length ? filasPartida.map((n) => `G${n}`).join("+") : "0" }]);
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
    tot.font = { name: fuenteExcel, bold: true };
    ws.eachRow((fila) => fila.eachCell({ includeEmpty: true }, (celda) => {
      celda.font = { ...celda.font, name: fuenteExcel };
    }));
    ["F", "G"].forEach((col) => (ws.getColumn(col).numFmt = `"${sim}" #,##0.00`));
    if (esUsd && tc > 0) {
      const filaTc = ws.addRow(["", `TIPO DE CAMBIO: ${tc.toFixed(3)} — TOTAL EN SOLES`, "", "", "", "", { formula: `ROUND(G${tot.number}*${tc},2)` }]);
      filaTc.font = { name: fuenteExcel, italic: true };
    }
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

  const celda = { padding: "12px 14px", borderBottom: `1px solid ${C.slate100}`, verticalAlign: "middle" } as const;
  const cargando = cargandoCotizaciones || cargandoItems || cargandoEmpresa;

  const revision = `Rev. ${((cot as unknown as { revision?: string } | null)?.revision?.trim() || "00").padStart(2, "0")}`;

  function encabezadoHoja(numero: number, totalHojas: number) {
    const light = { fontFamily: DOC_FUENTE_CSS, fontWeight: 300 } as const;
    return (
      <div style={{ display: "flex", gap: 22, alignItems: "flex-start", borderBottom: `3px solid ${C.emerald700}`, paddingBottom: 14 }}>
        <div style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ maxWidth: 92, maxHeight: 54, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 9, background: C.emerald700, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              TX
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 76, textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
          <b style={{ fontSize: 11, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN SAC"}</b>
          <div style={{ ...light, fontSize: 8, marginTop: 2, lineHeight: 1.15, textAlign: "right" }}>
            {esloganDosLineas(empresa?.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL")}
          </div>
          <div style={{ ...light, fontSize: 8, marginTop: 2, lineHeight: 1.15, textAlign: "right" }}>{empresa?.direccion || "—"}</div>
          <div style={{ ...light, fontSize: 8, marginTop: 2, lineHeight: 1.15, textAlign: "right" }}>{empresa?.web || "—"}</div>
        </div>

        <div style={{ width: 248, textAlign: "center", flexShrink: 0 }}>
          <div style={{ background: C.emerald50, borderTop: `4px solid ${C.emerald700}`, borderRadius: 5, padding: "10px 8px", color: C.slate900 }}>
            <div style={{ ...light, fontSize: 10 }}>COTIZACIÓN</div>
            <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4 }}>RUC: {empresa?.ruc || "—"}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{cot?.codigo ?? "SIN CÓDIGO"}</div>
          </div>
          <div style={{ position: "relative", marginTop: 4, fontSize: 7.5, color: C.slate500, textAlign: "center" }}>
            <span>Hoja {numero} de {totalHojas}</span>
            <span style={{ position: "absolute", right: 0, top: 0 }}>{revision}</span>
          </div>
        </div>
      </div>
    );
  }

  function filaDato(etiqueta: string, valor: string) {
    return (
      <div className="flex" style={{ fontFamily: DOC_FUENTE_CSS, fontSize: "8pt", fontWeight: 300, lineHeight: 1.3 }}>
        <span style={{ width: 76, flexShrink: 0, fontWeight: 300, color: C.slate500, textTransform: "uppercase", letterSpacing: 0, paddingTop: 1 }}>{etiqueta}</span>
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
          <div className="flex flex-wrap items-center gap-2">
            <label className="no-print flex h-8 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-xs font-medium select-none" title="Imprimir y exportar la hoja en A4 horizontal">
              <Checkbox checked={horizontal} onCheckedChange={(v) => alternarHorizontal(v === true)} />
              A4 horizontal
            </label>
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
      <style>{horizontal ? "@page { size: A4 landscape; }" : "@page { size: A4 portrait; }"}</style>

      <div className="overflow-x-auto pb-8">
        <div className="mx-auto" style={{ width: interiorW }}>
        <div
          id="cotizacion-impresion"
          style={{ width: paginaW, background: C.white, color: C.slate900, fontFamily: DOC_FUENTE_CSS, fontSize: 12, boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)" }}
        >
          {paginas.map((itemsPagina, paginaIndex) => {
            const esPrimera = paginaIndex === 0;
            const esUltima = paginaIndex === paginas.length - 1;
            return (
              <section
                key={`hoja-${paginaIndex + 1}`}
                className="cotizacion-hoja"
                style={{ position: "relative", width: interiorW, height: paginaH, margin: "0 auto", padding: "34px 24px 38px", overflow: "hidden", background: C.white, pageBreakAfter: esUltima ? "auto" : "always", boxSizing: "border-box" }}
              >
                {encabezadoHoja(paginaIndex + 1, paginas.length)}

                {esPrimera && (
                  <div style={{ marginTop: 14 }}>
                    <div className="grid grid-cols-2" style={{ gap: "4px 28px", background: C.slate50, borderRadius: 10, padding: "10px 14px", fontFamily: DOC_FUENTE_CSS }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: C.emerald800, textTransform: "uppercase", borderBottom: `1px solid ${C.slate100}`, paddingBottom: 3, marginBottom: 5 }}>Datos del cliente</div>
                        {filaDato("Cliente", cliente?.razon_social || cot.cliente || "—")}
                        {filaDato("RUC / DNI", cliente?.numero_documento || "—")}
                        {filaDato("Atención", cliente?.contacto || "—")}
                        {filaDato("Ubicación", cot.ubicacion || cliente?.direccion || "—")}
                      </div>
                      <div style={{ justifySelf: "end", width: 234 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: C.emerald800, textTransform: "uppercase", borderBottom: `1px solid ${C.slate100}`, paddingBottom: 3, marginBottom: 5 }}>Emisión y contacto</div>
                        {filaDato("Emisión", F(cot.fecha_emision))}
                        {filaDato("Vence", F(vigenciaHasta(cot.fecha_emision, Number(cot.validez_dias))))}
                        {filaDato("Moneda", esUsd ? "Dólares (USD)" : "Soles (PEN)")}
                        {esUsd && tc > 0 && filaDato("T. cambio", tc.toFixed(3))}
                        {filaDato("Por", nombre || email || "—")}
                        {filaDato("Celular", empresa?.telefono || "—")}
                        {filaDato("E-mail", empresa?.email || "—")}
                      </div>
                    </div>
                    <div className="flex" style={{ marginTop: 8, alignItems: "center", background: C.white, color: C.slate900, border: `1px solid ${C.slate100}`, borderLeft: `3px solid ${DOC.accent}`, borderRadius: 4, padding: "4px 10px", fontFamily: DOC_FUENTE_CSS, fontSize: "8pt", lineHeight: 1.2 }}>
                      <span style={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 8, textTransform: "uppercase", marginRight: 10, flexShrink: 0 }}>Proyecto</span>
                      <span style={{ fontWeight: 400, textAlign: "justify" }}>{cot.nombre || "—"}</span>
                    </div>
                  </div>
                )}

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "46%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "11.5%" }} />
                    <col style={{ width: "11.5%" }} />
                  </colgroup>

                  <thead>
                    <tr style={{ background: C.slate900, color: C.white }}>
                      {[
                        { h: "Ítem", a: "left" },
                        { h: "Descripción", a: "left" },
                        { h: "Marca", a: "center" },
                        { h: "Unidad", a: "center" },
                        { h: "Cantidad", a: "center" },
                        { h: "C. Unitario", a: "right" },
                        { h: "Sub Total", a: "right" },
                      ].map(({ h, a }) => (
                        <th key={h} style={{ height: 24, padding: "4px 4px", fontSize: 7, lineHeight: 1.05, verticalAlign: "middle", textTransform: "uppercase", letterSpacing: 0, textAlign: a as "left" | "right" | "center" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: DOC_FUENTE_CSS, fontSize: "8pt", fontWeight: 300, lineHeight: 1.3 }}>
                    {itemsPagina.map((fila) => {
                      if (fila.clase !== "item") {
                        const esGrupo = fila.clase === "grupo";
                        return (
                          <tr key={fila.llave} style={{ pageBreakInside: "avoid" }}>
                            <td
                              style={{
                                padding: esGrupo ? "7px 6px" : "5px 6px",
                                background: esGrupo ? C.slate100 : C.slate50,
                                borderBottom: `1px solid ${C.slate100}`,
                                 color: esGrupo ? NIVEL.grupo : NIVEL.categoria,
                                fontWeight: esGrupo ? 700 : 600,
                                fontSize: "8pt",
                                textAlign: "left",
                              }}
                            >
                              {fila.numero}
                            </td>
                            <td
                              colSpan={5}
                              style={{
                                padding: esGrupo ? "7px 8px" : "5px 8px",
                                background: esGrupo ? C.slate100 : C.slate50,
                                borderBottom: `1px solid ${C.slate100}`,
                                color: esGrupo ? NIVEL.grupo : NIVEL.categoria,
                                fontWeight: esGrupo ? 700 : 600,
                                fontSize: "8pt",
                                letterSpacing: esGrupo ? 0.6 : 0.2,
                                textAlign: "left",
                              }}
                            >
                              {fila.texto}
                            </td>
                            <td
                              style={{
                                padding: esGrupo ? "7px 8px" : "5px 8px",
                                background: esGrupo ? C.slate100 : C.slate50,
                                borderBottom: `1px solid ${C.slate100}`,
                                color: esGrupo ? NIVEL.grupo : NIVEL.categoria,
                                fontWeight: esGrupo ? 700 : 600,
                                fontSize: "8pt",
                                textAlign: "right",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {S(sim, fila.total)}
                            </td>
                          </tr>
                        );
                      }
                      const it = fila.item;
                      return (
                        <tr key={fila.llave} style={{ pageBreakInside: "avoid" }}>
                          <td style={{ ...celda, padding: "6px 6px", textAlign: "left", color: C.slate500 }}>{it.codigo || fila.numero}</td>
                          <td style={{ ...celda, padding: "6px 8px", wordBreak: "break-word", color: NIVEL.partida }}>{it.nombre}</td>
                          <td style={{ ...celda, padding: "6px 6px", textAlign: "center", color: C.slate500, fontSize: "7pt", wordBreak: "break-word" }}>{it.marca?.trim() || "-"}</td>
                          <td style={{ ...celda, padding: "6px 4px", textAlign: "center", color: C.slate500 }}>{it.unidad}</td>
                          <td style={{ ...celda, padding: "6px 6px", textAlign: "center" }}>{Number(it.metrado).toLocaleString("es-PE", { maximumFractionDigits: 2 })}</td>
                          <td style={{ ...celda, padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{S(sim, Number(it.precio_unitario))}</td>
                          <td style={{ ...celda, padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{S(sim, Number(it.metrado) * Number(it.precio_unitario))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>


                {esUltima && (
                  <div className="bloque-final" style={{ pageBreakInside: "avoid" }}>
                    <div className="flex justify-end" style={{ marginTop: 14 }}>
                      <div style={{ width: 248, fontSize: "8.5pt" }}>

                        {porGrupo.length > 1 && porGrupo.map(([g, v]) => (
                          <div key={g} className="flex justify-between" style={{ padding: "3px 0", color: C.slate500, fontSize: "8pt" }}><span>{g.charAt(0) + g.slice(1).toLowerCase()}</span><span>{S(sim, v)}</span></div>
                        ))}
                        <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700 }}><span>Costo Directo</span><span>{S(sim, calculo.costoDirecto)}</span></div>
                        {calculo.gastosGenerales > 0 && <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700 }}><span style={{ display: "flex" }}><span style={{ display: "inline-block", width: 96 }}>Gastos Generales</span><span style={{ display: "inline-block", width: 44, textAlign: "right" }}>({Number(cot.pct_gastos_generales)}%)</span></span><span>{S(sim, calculo.gastosGenerales)}</span></div>}
                        {calculo.utilidad > 0 && <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700 }}><span style={{ display: "flex" }}><span style={{ display: "inline-block", width: 96 }}>Utilidad</span><span style={{ display: "inline-block", width: 44, textAlign: "right" }}>({Number(cot.pct_utilidad)}%)</span></span><span>{S(sim, calculo.utilidad)}</span></div>}
                        {(calculo.gastosGenerales > 0 || calculo.utilidad > 0) && <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700, fontWeight: 600 }}><span>Subtotal</span><span>{S(sim, subtotal)}</span></div>}
                        <div className="flex justify-between" style={{ padding: "5px 0", color: C.slate700, borderBottom: `1px solid ${C.slate100}` }}><span style={{ display: "flex" }}><span style={{ display: "inline-block", width: 96 }}>IGV</span><span style={{ display: "inline-block", width: 44, textAlign: "right" }}>{conIgv ? "(18%)" : "(0%)"}</span></span><span>{S(sim, igv)}</span></div>
                        <div className="flex justify-between" style={{ marginTop: 5, padding: "6px 12px", alignItems: "center", background: C.slate900, color: C.white, borderRadius: 6, fontFamily: DOC_FUENTE_CSS, fontSize: "9.5pt", lineHeight: 1.15, fontWeight: 400 }}>
                          <span>TOTAL</span><span>{S(sim, total)}</span>
                        </div>
                        {esUsd && tc > 0 && (
                          <div className="flex justify-between" style={{ marginTop: 5, padding: "5px 0", color: C.slate500, fontSize: "7.5pt" }}>
                            <span>Equivalente en soles (T.C. {tc.toFixed(3)})</span><span>{S("S/", total * tc)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 16, borderTop: `1px solid ${C.slate100}`, paddingTop: 10, fontSize: 8, color: C.slate500, lineHeight: 1.45, textAlign: "left" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.slate700, marginBottom: 5 }}>Términos y condiciones</div>
                      {([
                        ["Recursos humanos", (cot as unknown as Record<string, string>)["recursos_humanos"]],
                        ["Tiempo de ejecución", (cot as unknown as Record<string, string>)["tiempo_ejecucion"]],
                        ["Condiciones de pago", (cot as unknown as Record<string, string>)["condiciones_pago"]],
                        ["Condiciones comerciales", cot.condiciones],
                      ] as const).filter(([, v]) => (v ?? "").trim()).map(([t, v]) => (
                        <div key={t} style={{ marginTop: 5, textAlign: "left" }}>
                          <b style={{ color: C.slate700 }}>{t}:</b>
                          <ul style={{ margin: "2px 0 0 14px", padding: 0, listStyle: "disc" }}>
                            {String(v).split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
                          </ul>
                        </div>
                      ))}
                      <div style={{ marginTop: 7, color: C.slate400, textAlign: "left" }}>
                        {conIgv
                          ? `Precios expresados en ${esUsd ? "dólares americanos" : "soles"}, incluyen IGV (18%).`
                          : `Precios expresados en ${esUsd ? "dólares americanos" : "soles"}, no afectos a IGV.`}{" "}
                        Oferta válida hasta la fecha indicada.
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ position: "absolute", right: 24, width: 248, bottom: 15, textAlign: "center", fontSize: 9, color: C.slate400 }}>
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

/**
 * Hoja de preliquidación con el MISMO formato de la factura (comprobante-vista):
 * A4 de 794 px. En edición se amplía con zoom al ancho de la ventana y los
 * controles que no se imprimen van en una franja fuera de la hoja.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { calcularMontos, type TipoTributario } from "@/lib/preliquidacion-montos";
import { CuentasComprobante, cuentaDetraccionDe } from "@/components/facturacion/CuentasComprobante";

export type HojaPLLinea = { descripcion: string; unidad: string; cantidad: string; precio_unitario: string };
export type HojaPLEmpresa = {
  razon_social?: string;
  logo_url?: string | null;
  eslogan?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  web?: string | null;
};
export type HojaPLCliente = { razon_social: string; numero_documento?: string | null | undefined; direccion?: string | null | undefined } | null;
export type HojaPLCuenta = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };

const C = DOC;
const ROB = DOC_FUENTE_CSS;
const F = (v: string) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "");
const N = (v: number, dec = 2) => Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Separa el ítem jerárquico (01.02.01) de la descripción y lo vuelve código compacto (010201). */
export function separarCodigo(descripcion: string) {
  const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(descripcion || "");
  if (!m || !m[1] || !m[2]) return { codigo: "", texto: (descripcion || "").trim() };
  return { codigo: m[1].split(".").map((p) => p.padStart(2, "0")).join(""), texto: m[2].trim() };
}

function TextoCreciente({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...style, resize: "none", overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />;
}

type Props = {
  empresa: HojaPLEmpresa | null | undefined;
  codigo: string;
  estado: string;
  fecha: string;
  moneda: string;
  tipoCambio: number;
  cliente: HojaPLCliente;
  proyectoNombre: string;
  concepto: string;
  ordenCompra?: string;
  lineas: HojaPLLinea[];
  amortizacion: number;
  tipoTributario: TipoTributario;
  pctDetraccion: number;
  condicionPago: string;
  diasCredito: number;
  fechaVencimiento: string;
  observacion: string;
  cuentas: HojaPLCuenta[];
  editable?: boolean;
  /** true: edición a pantalla completa (hoja ampliada con zoom); false: A4 real. */
  anchoCompleto?: boolean;
  unidades?: { id: string; simbolo: string; activo: boolean }[];
  onCampo?: (campo: "fecha" | "moneda" | "tipo_cambio" | "concepto" | "orden_compra" | "observacion" | "amortizacion" | "dias_credito", valor: string) => void;
  onLinea?: (indice: number, cambios: Partial<HojaPLLinea>) => void;
  onQuitarLinea?: (indice: number) => void;
  onAgregarLinea?: () => void;
  accionesLineas?: ReactNode;
  editorCliente?: ReactNode;
  editorProyecto?: ReactNode;
  /** En edición se muestra en la franja fuera de la hoja (régimen, condición, plazo). */
  editorCondicion?: ReactNode;
  /** id del section para imprimir solo la hoja. */
  idHoja?: string;
};

export function HojaPreliquidacion(props: Props) {
  const {
    empresa, codigo, estado, fecha, moneda, tipoCambio, cliente, proyectoNombre, concepto, ordenCompra = "",
    lineas, amortizacion, tipoTributario, pctDetraccion, condicionPago, diasCredito,
    fechaVencimiento, observacion, cuentas, editable = false, anchoCompleto = false, unidades = [],
    onCampo, onLinea, onQuitarLinea, onAgregarLinea, accionesLineas, idHoja,
  } = props;

  const lienzo = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    if (!anchoCompleto || !lienzo.current) return;
    const ro = new ResizeObserver(([e]) => { if (e) setZoom(Math.max(1, Math.min(2, (e.contentRect.width - 8) / 794))); });
    ro.observe(lienzo.current);
    return () => ro.disconnect();
  }, [anchoCompleto]);

  const tc = moneda === "USD" ? tipoCambio : 1;
  const bruto = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0);
  const neto = bruto - amortizacion;
  const mm = calcularMontos(neto, pctDetraccion, tc, tipoTributario);
  const simbolo = moneda === "USD" ? "$" : "S/";
  const money = (v: number) => `${simbolo} ${N(v)}`;
  const det = tipoTributario === "detraccion";
  const ctaDet = cuentaDetraccionDe(cuentas)?.numero_cuenta;

  const ed: CSSProperties = { background: "transparent", border: "none", borderBottom: "1px solid transparent", font: "inherit", color: "inherit", width: "100%", padding: 0, outline: "none", textTransform: "inherit" };
  const CARD: CSSProperties = { background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10, textAlign: "left" };

  const filas: { etiqueta: string; valor: number; total?: boolean; editar?: boolean }[] = [
    { etiqueta: "VALOR EJECUTADO", valor: bruto },
    ...(amortizacion > 0 || editable ? [{ etiqueta: "AMORTIZACIÓN (−)", valor: amortizacion, editar: true }] : []),
    { etiqueta: "SUB TOTAL", valor: mm.neto },
    { etiqueta: "IGV 18%", valor: mm.igv },
    { etiqueta: "TOTAL", valor: mm.total, total: true },
  ];

  const hoja = (
    <section
      id={idHoja}
      className={editable ? "cpe-editor-sheet" : undefined}
      style={{ width: 794, minHeight: 1123, boxSizing: "border-box", margin: "0 auto", padding: "36px 38px 250px", background: C.white, color: C.ink, fontFamily: ROB, fontWeight: 400, fontSize: 9, boxShadow: "0 12px 35px rgba(15,23,42,.18)", position: "relative", zoom: anchoCompleto ? zoom : undefined }}
    >
      <header style={{ display: "flex", gap: 12, alignItems: "center", paddingBottom: 6, color: "#000", textTransform: "uppercase", lineHeight: 1.15 }}>
        <div style={{ width: 138, display: "flex", alignItems: "center" }}>
          {empresa?.logo_url ? <img src={empresa.logo_url} alt="" style={{ maxWidth: 132, maxHeight: 78 }} /> : <div style={{ width: 62, height: 62, borderRadius: 10, background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>TX</div>}
        </div>
        <div style={{ flex: 1, minHeight: 62, textAlign: "left", paddingLeft: 4, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <b style={{ fontSize: 13, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN SAC"}</b>
          <div style={{ fontWeight: 300, fontSize: 7, marginTop: 2, whiteSpace: "nowrap" }}>{empresa?.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL"}</div>
          <div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.direccion || "—"}</div>
          <div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.web || "—"}</div>
        </div>
        <div style={{ width: 248, textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ border: "1px solid #000", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5 }}>PRELIQUIDACIÓN</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5 }}>{codigo || "AUTOMÁTICO"}</div>
          </div>
          <div style={{ alignSelf: "center", marginTop: 6, fontSize: 8, fontWeight: 700, letterSpacing: ".05em", padding: "2px 10px", borderRadius: 999, background: C.accentSoft, color: C.accentText, border: `1px solid ${C.accent}` }}>{estado.toUpperCase()}</div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: 13, border: `1.5px solid ${C.gris}`, borderRadius: 10, marginTop: 8, fontSize: 9, textAlign: "left", textTransform: "uppercase", lineHeight: 1.15 }}>
        <div style={{ minWidth: 0, display: "grid", gridTemplateColumns: "74px 8px 1fr", columnGap: 2, alignItems: "baseline" }}>
          <b>RUC</b><span>:</span><span>{cliente?.numero_documento || "—"}</span>
          <b>Nombre</b><span>:</span><span style={{ fontWeight: 700 }}>{props.editorCliente ?? (cliente?.razon_social || "—")}</span>
          <b>Dirección</b><span>:</span><span>{cliente?.direccion || "—"}</span>
          <b>Proyecto</b><span>:</span><span>{props.editorProyecto ?? (proyectoNombre || "—")}</span>
          {(concepto || editable) && <><b>Descripción</b><span>:</span><span>{editable ? <input aria-label="Descripción de la preliquidación" value={concepto} onChange={(e) => onCampo?.("concepto", e.target.value)} style={ed} /> : concepto}</span></>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "52px 8px auto", columnGap: 2, alignItems: "baseline" }}>
          <b>Moneda</b><span>:</span>
          <span>{editable ? <select value={moneda} onChange={(e) => onCampo?.("moneda", e.target.value)} style={{ ...ed, width: "auto" }}><option value="PEN">PEN</option><option value="USD">USD</option></select> : moneda}</span>
          {moneda === "USD" && <><b>T. cambio</b><span>:</span><span>{N(tc, 3)}</span></>}
          <b>IGV</b><span>:</span><span>18.00%</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: `1.5px solid ${C.gris}`, borderRadius: 10, marginTop: 10, fontSize: 9, textAlign: "center", lineHeight: 1.15 }}>
        {([
          ["Fecha de Emisión", editable ? <input key="f" type="date" value={fecha} onChange={(e) => onCampo?.("fecha", e.target.value)} style={{ ...ed, textAlign: "center" }} /> : F(fecha)],
          ["Forma de Pago", condicionPago || "—"],
          ["Orden de Compra", editable ? <input key="o" aria-label="Orden de compra" value={ordenCompra} onChange={(e) => onCampo?.("orden_compra", e.target.value)} maxLength={160} style={{ ...ed, textAlign: "center" }} /> : ordenCompra],
          ["Fecha de Vencimiento", condicionPago === "Crédito" ? F(fechaVencimiento) : ""],
        ] as [string, ReactNode][]).map(([l, v], i) => (
          <div key={l} style={{ padding: "5px 4px", borderLeft: i ? `1.5px solid ${C.gris}` : "none" }}>
            <b style={{ display: "block" }}>{l}:</b>
            <div style={{ marginTop: 3, minHeight: 11 }}>{v}</div>
          </div>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 9, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "10%" }} /><col style={{ width: editable ? "44%" : "47%" }} /><col style={{ width: "8%" }} /><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} />
          {editable && <col style={{ width: "3%" }} />}
        </colgroup>
        <thead>
          <tr style={{ background: C.gris, color: C.white }}>
            {[["CÓDIGO", "left"], ["DESCRIPCIÓN", "left"], ["UNIDAD", "center"], ["CANTIDAD", "center"], ["P. UNITARIO", "center"], ["V. VENTA", "center"], ...(editable ? [["", "center"]] : [])].map(([h, a], i) => (
              <th key={i} style={{ padding: "4px 4px", fontWeight: 700, fontSize: 6.5, textAlign: a as "left" | "center" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 && <tr><td colSpan={editable ? 7 : 6} style={{ padding: 6, textAlign: "center", color: C.mute }}>Sin líneas registradas.</td></tr>}
          {lineas.map((l, i) => {
            const { codigo: cod, texto } = separarCodigo(l.descripcion);
            const td: CSSProperties = { padding: 6, verticalAlign: "top" };
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 ? C.soft : C.white }}>
                <td style={{ ...td, overflowWrap: "anywhere" }}>{cod || "—"}</td>
                <td style={{ ...td, paddingLeft: 12, fontSize: 7, lineHeight: 1.25, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {editable ? <TextoCreciente value={l.descripcion} onChange={(v) => onLinea?.(i, { descripcion: v })} placeholder="Descripción de la línea" style={{ ...ed, display: "block", fontSize: 7, lineHeight: 1.25 }} /> : texto}
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  {editable ? (
                    <select value={l.unidad} onChange={(e) => onLinea?.(i, { unidad: e.target.value })} style={{ ...ed, textAlign: "center" }}>
                      {!unidades.some((u) => u.simbolo === l.unidad) && <option value={l.unidad}>{l.unidad}</option>}
                      {unidades.filter((u) => u.activo).map((u) => <option key={u.id} value={u.simbolo}>{u.simbolo}</option>)}
                    </select>
                  ) : l.unidad}
                </td>
                <td style={{ ...td, textAlign: "right" }}>{editable ? <input type="number" step="0.01" min="0" value={l.cantidad} onChange={(e) => onLinea?.(i, { cantidad: e.target.value })} style={{ ...ed, textAlign: "right" }} /> : N(Number(l.cantidad))}</td>
                <td style={{ ...td, textAlign: "right" }}>{editable ? <input type="number" step="0.01" min="0" value={l.precio_unitario} onChange={(e) => onLinea?.(i, { precio_unitario: e.target.value })} style={{ ...ed, textAlign: "right" }} /> : money(Number(l.precio_unitario))}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(Number(l.cantidad || 0) * Number(l.precio_unitario || 0))}</td>
                {editable && (
                  <td style={{ ...td, padding: "6px 0", textAlign: "center" }}>
                    {lineas.length > 1 && <button type="button" onClick={() => onQuitarLinea?.(i)} aria-label="Quitar línea" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-bad)", padding: 0 }}><X size={10} /></button>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          <button type="button" onClick={onAgregarLinea} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 7.5, fontWeight: 700, color: C.green, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}><Plus size={9} /> Agregar línea</button>
          {accionesLineas}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "stretch", marginTop: 18 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", fontSize: 9, textAlign: "left", whiteSpace: "pre-wrap" }}>
          {(observacion || editable) && <><b style={{ fontSize: 8, color: C.green }}>OBSERVACIONES</b>
            {editable ? <TextoCreciente value={observacion} onChange={(v) => onCampo?.("observacion", v)} placeholder="Observaciones (opcional)" style={{ ...ed, marginTop: 3 }} /> : <div style={{ marginTop: 3 }}>{observacion}</div>}</>}
          {mm.aplica && (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 28, rowGap: 1, marginTop: "auto", paddingTop: 10, fontSize: 10, color: "#4B5563", whiteSpace: "normal", lineHeight: 1.2, fontWeight: 700 }}>
              {det && <><span>Cta. Cte. Banco de la Nación</span><span>{ctaDet || "—"}</span></>}
              <span>{det ? "Detracción" : "Retención"} ({N(pctDetraccion)}%)</span><span>S/ {N(det ? mm.detraccionPen : mm.retencionPen)}</span>
            </div>
          )}
        </div>
        <div style={{ width: 300, flexShrink: 0, marginLeft: "auto", fontSize: 10, display: "grid", gap: 3 }}>
          {filas.map((f) => {
            const col = f.total ? C.totalDesglose : C.gris;
            return (
              <div key={f.etiqueta} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ background: f.total ? col : C.grisClaro, color: C.ink, borderRadius: 7, padding: "3px 6px", textAlign: "center" }}>{f.etiqueta}</div>
                <div style={{ border: `1.5px solid ${col}`, borderRadius: 7, padding: "2px 8px", textAlign: "right", color: C.ink }}>
                  {f.editar && editable ? <input type="number" step="0.01" min="0" aria-label="Amortización" value={amortizacion || ""} onChange={(e) => onCampo?.("amortizacion", e.target.value)} style={{ ...ed, textAlign: "right" }} /> : money(f.valor)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: "absolute", left: 38, right: 38, bottom: 28 }}>
        <div style={{ ...CARD, padding: 8, fontSize: 10, lineHeight: 1.25 }}>
          <b>{condicionPago === "Crédito" ? "Información del crédito" : "Información del pago"}</b>
          <div style={{ display: "grid", gridTemplateColumns: "200px 14px 1fr", marginTop: 2 }}>
            <span>Monto neto pendiente de pago</span><span>:</span><span>{money(mm.cobrar)}</span>
            {condicionPago === "Crédito" && <><span>Plazo</span><span>:</span><span>{diasCredito} días</span><span>Fecha de vencimiento</span><span>:</span><span>{F(fechaVencimiento) || "—"}</span></>}
          </div>
        </div>
        {cuentas.length > 0 && <div style={{ ...CARD, padding: "0 8px 6px", marginTop: 8 }}><CuentasComprobante cuentas={cuentas} tipo="todas" compacto /></div>}
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 7, fontWeight: 300, fontSize: 8, color: C.ink }}>
          Documento referencial previo a la emisión del comprobante electrónico. No constituye comprobante de pago ni tiene valor tributario.
        </div>
      </div>
    </section>
  );

  if (!anchoCompleto) return hoja;
  return (
    <div>
      {props.editorCondicion && (
        <div className="mb-3 rounded-md border border-line bg-card px-3 py-2 text-xs" style={{ maxWidth: 520 }}>{props.editorCondicion}</div>
      )}
      <div ref={lienzo} style={{ width: "100%", overflow: "hidden", paddingBottom: 8 }}>{hoja}</div>
    </div>
  );
}

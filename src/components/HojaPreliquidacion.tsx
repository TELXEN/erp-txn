/**
 * Hoja de preliquidación compartida: la MISMA hoja se usa en la edición
 * (ancho completo, campos editables en línea) y en la vista previa/impresión
 * (A4 fijo de 794 px, solo lectura). Colores y letra vienen de documento-tema.
 */
import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { calcularMontos, type TipoTributario } from "@/lib/preliquidacion-montos";

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

const F = (v: string) => {
  if (!v) return "—";
  const [a, m, d] = v.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : v;
};
const N = (v: number, dec = 2) =>
  Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Separa el ítem jerárquico (01.02.01) de la descripción y lo vuelve código compacto (010201). */
export function separarCodigo(descripcion: string) {
  const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(descripcion || "");
  if (!m || !m[1] || !m[2]) return { codigo: "", texto: (descripcion || "").trim() };
  return {
    codigo: m[1].split(".").map((p) => p.padStart(2, "0")).join(""),
    texto: m[2].trim(),
  };
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
  /** true: campos editables en línea y hoja fluida; false: solo lectura. */
  editable?: boolean;
  /** true: la hoja ocupa todo el ancho disponible (edición); false: A4 fijo 794 px. */
  anchoCompleto?: boolean;
  unidades?: { id: string; simbolo: string; activo: boolean }[];
  onCampo?: (campo: "fecha" | "moneda" | "tipo_cambio" | "concepto" | "orden_compra" | "observacion" | "amortizacion" | "dias_credito", valor: string) => void;
  onLinea?: (indice: number, cambios: Partial<HojaPLLinea>) => void;
  onQuitarLinea?: (indice: number) => void;
  onAgregarLinea?: () => void;
  /** Botones extra bajo la tabla en modo edición (p. ej. «Cargar partidas de la obra»). */
  accionesLineas?: ReactNode;
  /** Controles en línea (edición) que sustituyen el texto de cliente, proyecto y condición comercial. */
  editorCliente?: ReactNode;
  editorProyecto?: ReactNode;
  editorCondicion?: ReactNode;
};

export function HojaPreliquidacion(props: Props) {
  const {
    empresa, codigo, estado, fecha, moneda, tipoCambio, cliente, proyectoNombre, concepto, ordenCompra = "",
    lineas, amortizacion, tipoTributario, pctDetraccion, condicionPago, diasCredito,
    fechaVencimiento, observacion, cuentas,
    editable = false, anchoCompleto = false, unidades = [],
    onCampo, onLinea, onQuitarLinea, onAgregarLinea, accionesLineas,
  } = props;

  const tc = moneda === "USD" ? tipoCambio : 1;
  const bruto = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0);
  const neto = bruto - amortizacion;
  const mm = calcularMontos(neto, pctDetraccion, tc, tipoTributario);
  const simbolo = moneda === "USD" ? "US$" : "S/";
  const D = (v: number) => `${simbolo} ${N(v)}`;
  const cuentasOrdenadas = [...cuentas].sort((a, b) => Number(a.tipo_cuenta === "Detracciones") - Number(b.tipo_cuenta === "Detracciones"));
  const descuento = mm.detraccionPen > 0 ? `S/ ${N(mm.detraccionPen, 0)}` : mm.retencionPen > 0 ? `S/ ${N(mm.retencionPen)}` : "No aplica";

  const etiqueta = { fontSize: 7.5, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase" as const, color: DOC.mute, marginBottom: 3 };
  const valor = { fontSize: 10, fontWeight: 700, color: DOC.green, lineHeight: 1.3 };
  const subvalor = { fontSize: 9, color: DOC.mute, lineHeight: 1.35, marginTop: 2 };
  const tituloSeccion = { fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" as const, color: DOC.green, marginBottom: 7 };
  const celda = { padding: "7px 7px", borderBottom: `1px solid ${DOC.line}`, fontSize: 9.5 };
  /** Campo editable en línea: mismo tamaño y posición que el texto, con subrayado punteado. */
  const ed: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: `1px dashed ${DOC.mute}`,
    font: "inherit",
    color: "inherit",
    width: "100%",
    padding: 0,
    outline: "none",
  };

  const eslogan = empresa?.eslogan?.trim();
  const idxEslogan = eslogan ? eslogan.indexOf(",") : -1;
  const eslogan1 = eslogan ? (idxEslogan >= 0 ? eslogan.slice(0, idxEslogan + 1) : eslogan) : "SOLUCIONES INTEGRALES EN ENERGÍA,";
  const eslogan2 = eslogan && idxEslogan >= 0 ? eslogan.slice(idxEslogan + 1).trim() : eslogan ? "" : "AUTOMATIZACIÓN Y CONTROL INDUSTRIAL";

  return (
    <section
      style={{
        width: anchoCompleto ? "100%" : 794,
        minHeight: anchoCompleto ? undefined : 1123,
        margin: anchoCompleto ? 0 : "0 auto",
        background: DOC.white,
        color: DOC.ink,
        fontFamily: DOC_FUENTE_CSS,
        fontSize: 9.5,
        padding: "38px 40px 34px",
        boxSizing: "border-box",
        boxShadow: anchoCompleto ? "none" : "0 10px 30px -12px rgba(15,23,42,.25)",
        border: anchoCompleto ? `1px solid ${DOC.line}` : "none",
        borderRadius: anchoCompleto ? 8 : 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-5" style={{ borderBottom: `2px solid ${DOC.green}`, paddingBottom: 14, marginBottom: 18 }}>
        <div className="flex items-center" style={{ minWidth: 150 }}>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ display: "block", maxWidth: 150, maxHeight: 62, objectFit: "contain" }} />
          ) : (
            <div className="flex items-center justify-center" style={{ width: 62, height: 62, borderRadius: 12, background: DOC.green, color: DOC.white, fontWeight: 700, fontSize: 20 }}>
              {(empresa?.razon_social || "TELXEN").split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, textAlign: "right", paddingTop: 2 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: DOC.green, letterSpacing: 0.4, lineHeight: 1.35, textAlign: "right" }}>
            {empresa?.razon_social || "TELXEN"}
          </div>
          <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontSize: 9.5, fontWeight: 300, color: DOC.green, letterSpacing: 0.4, lineHeight: 1.3, textAlign: "right" }}>
            <span style={{ display: "block" }}>{eslogan1}</span>
            {eslogan2 && <span style={{ display: "block" }}>{eslogan2}</span>}
          </div>
          {empresa?.direccion && (
            <div style={{ marginTop: 4, fontFamily: DOC_FUENTE_CSS, fontWeight: 300, fontSize: 9.5, color: DOC.ink }}>Dirección: {empresa.direccion}</div>
          )}
          {empresa?.telefono && (
            <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontWeight: 300, fontSize: 9.5, color: DOC.ink }}>Teléfono: {empresa.telefono}</div>
          )}
          {empresa?.web && <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontWeight: 300, fontSize: 9.5, color: DOC.green }}>{empresa.web}</div>}
        </div>

        <div style={{ width: 210, flexShrink: 0 }}>
          <div style={{ background: DOC.white, border: `1px solid ${DOC.line}`, borderTop: `4px solid ${DOC.green}`, borderRadius: 6, padding: "10px 16px", textAlign: "center", color: DOC.green }}>
            <div style={{ fontSize: editable ? 20 : 18, fontWeight: 800, letterSpacing: 0.8, lineHeight: 1.15, whiteSpace: "nowrap" }}>PRELIQUIDACIÓN</div>
            <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
            <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800, letterSpacing: 0.6 }}>{codigo || "AUTOMÁTICO"}</div>
          </div>
          <div className="flex justify-between" style={{ marginTop: 5, fontSize: 9.5, color: DOC.mute }}>
            <span>{estado.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Cliente / proyecto / fecha */}
      <div
        className="flex"
        style={{ gap: 18, padding: 13, background: DOC.soft, border: `1px solid ${DOC.line}`, borderLeft: `3px solid ${DOC.accent}`, borderRadius: 6, marginBottom: 14 }}
      >
        <div style={{ flex: 1 }}>
          <div style={etiqueta}>Cliente</div>
          {props.editorCliente ?? <div style={valor}>{cliente?.razon_social || "—"}</div>}
          <div style={subvalor}>RUC {cliente?.numero_documento || "—"}</div>
          <div style={subvalor}>{cliente?.direccion || "Dirección no registrada"}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={etiqueta}>Proyecto / obra</div>
          {props.editorProyecto ?? <div style={valor}>{proyectoNombre || "—"}</div>}
          <div style={{ ...etiqueta, marginTop: 8 }}>Orden de compra</div>
          {editable ? (
            <input aria-label="Orden de compra" value={ordenCompra} onChange={(e) => onCampo?.("orden_compra", e.target.value)} maxLength={160} placeholder="Número del documento" style={{ ...ed, ...valor }} />
          ) : (
            <div style={valor}>{ordenCompra || "—"}</div>
          )}
        </div>
        <div style={{ width: "23%" }}>
          <div style={etiqueta}>Fecha de emisión</div>
          {editable ? (
            <input type="date" value={fecha} onChange={(e) => onCampo?.("fecha", e.target.value)} style={{ ...ed, ...valor }} />
          ) : (
            <div style={valor}>{F(fecha)}</div>
          )}
          <div style={{ ...etiqueta, marginTop: 8 }}>Moneda</div>
          {editable ? (
            <select value={moneda} onChange={(e) => onCampo?.("moneda", e.target.value)} style={{ ...ed, ...valor }}>
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          ) : (
            <div style={valor}>{moneda === "USD" ? "Dólares (USD)" : "Soles (PEN)"}</div>
          )}
          {moneda === "USD" && <div style={subvalor} title="Tipo de cambio SUNAT (Decolecta), solo para calcular la detracción o retención">T.C. detracción {N(tc, 3)}</div>}
        </div>
      </div>

      {/* Detalle */}
      {(concepto || editable) && <div className="mb-4">
        <div style={etiqueta}>Descripción</div>
        {editable ? <input aria-label="Descripción de la preliquidación" value={concepto} onChange={(e) => onCampo?.("concepto", e.target.value)} style={{ ...ed, ...valor }} /> : <div style={valor}>{concepto}</div>}
      </div>}
      <div style={tituloSeccion}>Detalle de la preliquidación</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: editable ? 4 : 16, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: editable ? "33%" : "35%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "16%" }} />
          {editable && <col style={{ width: "4%" }} />}
        </colgroup>
        <thead>
          <tr style={{ background: DOC.green, color: DOC.white }}>
            {[
              { h: "#", a: "center" },
              { h: "Código", a: "left" },
              { h: "Descripción", a: "left" },
              { h: "Und.", a: "center" },
              { h: "Cant.", a: "right" },
              { h: "P. Unit.", a: "right" },
              { h: "Subtotal", a: "right" },
              ...(editable ? [{ h: "", a: "center" }] : []),
            ].map(({ h, a }) => (
              <th key={h || "acc"} style={{ padding: "8px 7px", fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.3, textAlign: a as "left" | "right" | "center" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 && (
            <tr><td colSpan={editable ? 8 : 7} style={{ ...celda, textAlign: "center", color: DOC.mute }}>Sin líneas registradas.</td></tr>
          )}
          {lineas.map((l, i) => {
            const { codigo: cod, texto } = separarCodigo(l.descripcion);
            return (
              <tr key={i} style={{ background: i % 2 === 1 ? DOC.soft : DOC.white }}>
                <td style={{ ...celda, textAlign: "center" }}>{i + 1}</td>
                <td style={{ ...celda, textAlign: "left", color: DOC.mute, whiteSpace: "nowrap" }}>{cod || "—"}</td>
                <td style={{ ...celda, wordBreak: "break-word" }}>
                  {editable ? (
                    <input value={l.descripcion} onChange={(e) => onLinea?.(i, { descripcion: e.target.value })} maxLength={200} placeholder="Descripción de la línea" style={ed} />
                  ) : (
                    texto
                  )}
                </td>
                <td style={{ ...celda, textAlign: "center" }}>
                  {editable ? (
                    <select value={l.unidad} onChange={(e) => onLinea?.(i, { unidad: e.target.value })} style={{ ...ed, textAlign: "center" }}>
                      {!unidades.some((u) => u.simbolo === l.unidad) && <option value={l.unidad}>{l.unidad}</option>}
                      {unidades.filter((u) => u.activo).map((u) => (
                        <option key={u.id} value={u.simbolo}>{u.simbolo}</option>
                      ))}
                    </select>
                  ) : (
                    l.unidad
                  )}
                </td>
                <td style={{ ...celda, textAlign: "right" }}>
                  {editable ? (
                    <input type="number" step="0.01" min="0" value={l.cantidad} onChange={(e) => onLinea?.(i, { cantidad: e.target.value })} style={{ ...ed, textAlign: "right" }} />
                  ) : (
                    N(Number(l.cantidad))
                  )}
                </td>
                <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>
                  {editable ? (
                    <input type="number" step="0.01" min="0" value={l.precio_unitario} onChange={(e) => onLinea?.(i, { precio_unitario: e.target.value })} style={{ ...ed, textAlign: "right" }} />
                  ) : (
                    D(Number(l.precio_unitario))
                  )}
                </td>
                <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{D(Number(l.cantidad || 0) * Number(l.precio_unitario || 0))}</td>
                {editable && (
                  <td style={{ ...celda, textAlign: "center" }}>
                    {lineas.length > 1 && (
                      <button type="button" onClick={() => onQuitarLinea?.(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-bad)", padding: 0 }} aria-label="Quitar línea">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={onAgregarLinea}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 700, color: DOC.green, background: DOC.soft, border: `1px solid ${DOC.line}`, borderRadius: 5, padding: "5px 10px", cursor: "pointer" }}
          >
            <Plus size={12} /> Agregar línea
          </button>
          {accionesLineas}
        </div>
      )}

      {/* Condición comercial + totales */}
      <div className="flex items-start justify-between" style={{ marginBottom: 18 }}>
        <div style={{ width: "52%", padding: 12, border: `1px solid ${DOC.line}`, borderRadius: 5 }}>
          <div style={tituloSeccion}>Condición comercial</div>
          {props.editorCondicion ?? (<>
          <div className="flex justify-between" style={{ marginTop: 5 }}><span>Condición de pago</span><span style={valor}>{condicionPago}</span></div>
          {condicionPago === "Crédito" && (
            <>
              <div className="flex justify-between" style={{ marginTop: 5 }}>
                <span>Plazo</span>
                {editable ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input type="number" min="0" value={diasCredito || ""} onChange={(e) => onCampo?.("dias_credito", e.target.value)} style={{ ...ed, width: 50, textAlign: "right" }} /> días
                  </span>
                ) : (
                  <span>{diasCredito} días</span>
                )}
              </div>
              <div className="flex justify-between" style={{ marginTop: 5 }}><span>Vencimiento estimado</span><span>{F(fechaVencimiento)}</span></div>
            </>
          )}
          </>)}
        </div>
        <div style={{ width: "42%" }}>
          <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${DOC.line}` }}><span>Valor ejecutado</span><span>{D(bruto)}</span></div>
          {(amortizacion > 0 || editable) && (
            <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${DOC.line}` }}>
              <span>Amortización (−)</span>
              {editable ? (
                <input type="number" step="0.01" min="0" value={amortizacion || ""} onChange={(e) => onCampo?.("amortizacion", e.target.value)} style={{ ...ed, width: 110, textAlign: "right" }} />
              ) : (
                <span>{D(amortizacion)}</span>
              )}
            </div>
          )}
          <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${DOC.line}` }}><span>Valor neto</span><span>{D(mm.neto)}</span></div>
          <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${DOC.line}` }}><span>IGV 18%</span><span>{D(mm.igv)}</span></div>
          <div className="flex justify-between" style={{ marginTop: 6, padding: "6px 4px", color: DOC.green, borderTop: `1px solid ${DOC.green}`, fontWeight: 700, fontSize: 11 }}>
            <span>TOTAL</span><span>{D(mm.total)}</span>
          </div>
        </div>
      </div>

      {/* Liquidación y cobro */}
      <div style={tituloSeccion}>Liquidación y cobro</div>
      <div className="flex" style={{ gap: 9, marginBottom: 16 }}>
        {[
          { t: "Régimen tributario", v: mm.aplica ? `${tipoTributario === "detraccion" ? "Detracción" : "Retención"} ${N(pctDetraccion)}%` : "No aplica" },
          { t: mm.aplica ? (tipoTributario === "detraccion" ? "Detracción" : "Retención") : "Importe descontado", v: descuento },
          { t: "Neto a depositar", v: D(mm.cobrar) },
        ].map((c) => (
          <div key={c.t} style={{ flex: 1, padding: 11, border: `1px solid ${DOC.line}`, borderRadius: 6 }}>
            <div style={etiqueta}>{c.t}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: DOC.green, marginTop: 4 }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Observaciones */}
      {(observacion || editable) && (
        <div style={{ padding: 11, borderLeft: `3px solid ${DOC.accent}`, background: DOC.soft, borderRadius: 6, marginBottom: 14 }}>
          <div style={etiqueta}>Observaciones</div>
          {editable ? (
            <input value={observacion} onChange={(e) => onCampo?.("observacion", e.target.value)} maxLength={300} placeholder="Observaciones (opcional)" style={ed} />
          ) : (
            <div>{observacion}</div>
          )}
        </div>
      )}

      {/* Datos bancarios (pie) */}
      <div style={{ padding: "8px 10px", background: DOC.soft, marginTop: "auto", marginBottom: 12, border: `1px solid ${DOC.line}`, borderRadius: 6 }}>
        <div style={{ ...tituloSeccion, fontSize: 7.5, marginBottom: 4 }}>Datos bancarios</div>
        {cuentasOrdenadas.length === 0 && <div style={{ ...valor, fontSize: 8 }}>NO HAY CUENTAS BANCARIAS REGISTRADAS.</div>}
        {(() => {
          const esDet = (c: (typeof cuentasOrdenadas)[number]) => c.tipo_cuenta === "Detracciones";
          const grupoMoneda = (m: string) => (/USD|D[ÓO]LAR/i.test(m) ? "DÓLARES" : "SOLES");
          const normales = cuentasOrdenadas.filter((c) => !esDet(c));
          const detracciones = cuentasOrdenadas.filter(esDet);
          const grupos = (["SOLES", "DÓLARES"] as const)
            .map((mon) => ({ moneda: mon, cuentas: normales.filter((c) => grupoMoneda(c.monedas) === mon) }))
            .filter((g) => g.cuentas.length > 0);
          const columnas = grupos.length + (detracciones.length > 0 ? 1 : 0);
          return (
            <div style={{ display: "grid", gridTemplateColumns: columnas > 1 ? `repeat(${columnas}, 1fr)` : "1fr", columnGap: 14, rowGap: 4, textTransform: "uppercase" }}>
              {grupos.map((g) => (
                <div key={g.moneda}>
                  <div style={{ ...etiqueta, fontSize: 6.5, marginBottom: 2 }}>{g.moneda}</div>
                  {g.cuentas.map((c, i) => (
                    <div key={i} style={{ ...valor, fontSize: 8, lineHeight: 1.25, marginTop: 1 }}>
                      {`${c.nombre} · ${c.tipo_cuenta} · Cta. ${c.numero_cuenta || "—"} · CCI ${c.cci || "—"}`}
                    </div>
                  ))}
                </div>
              ))}
              {detracciones.length > 0 && (
                <div>
                  <div style={{ ...etiqueta, fontSize: 6.5, marginBottom: 2 }}>Detracciones</div>
                  {detracciones.map((c, i) => (
                    <div key={i} style={{ ...valor, fontSize: 8, lineHeight: 1.25, marginTop: 1 }}>
                      {`${c.nombre} · ${c.tipo_cuenta} · Cta. ${c.numero_cuenta || "—"}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <div style={{ fontSize: 8, lineHeight: 1.45, color: DOC.mute, paddingTop: 12, borderTop: `1px solid ${DOC.line}` }}>
        Documento referencial previo a la emisión del comprobante electrónico. No constituye comprobante de pago ni tiene valor tributario.
      </div>
      <div className="flex justify-between" style={{ marginTop: 10, fontSize: 7.5, color: DOC.mute }}>
        <span>{empresa?.razon_social || "TELXEN SAC"} · {codigo || "—"}</span>
        <span>Página 1 de 1</span>
      </div>
    </section>
  );
}

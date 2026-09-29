import { useState, type CSSProperties, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2 } from "lucide-react";
import { consultarDocumentoSunat, consultarTipoCambio } from "@/lib/decolecta.functions";
import { CODIGOS_SPOT, MODALIDADES_TRASLADO, MOTIVOS_BAJA, MOTIVOS_NOTA_CREDITO, MOTIVOS_NOTA_DEBITO, MOTIVOS_TRASLADO, PESTANAS_CPE, TASAS_IGV, TASAS_PERCEPCION, TASAS_RETENCION, TIPOS_DOC_RELACIONADO, UNIDADES_SUNAT, calcularItem, cuotaVacia, docRelacionadoVacio, itemComprobanteVacio, repartirCuotas, usaImportes, usaItems, usaRelacionados, type CuotaEditor, type DocRelacionado, type ItemEditor, type OperacionTipo, type TipoComprobante, type TipoTributarioCpe } from "@/lib/facturacion";
import { hoy } from "@/lib/format";

export const C = { ink: "#0f172a", text: "#334155", muted: "#64748b", line: "#cbd5e1", soft: "#f8fafc", green: "#047857", greenDark: "#065f46", greenSoft: "#ecfdf5", white: "#ffffff" };
const N = (n: number) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type FormCpe = ReturnType<typeof nuevoFormCpe>;
export function nuevoFormCpe(tipo: TipoComprobante, serie: string) {
  return {
    tipo_comprobante: tipo, serie, correlativo_inicial: "", cliente_id: "", proyecto_id: "", referencia_id: "", motivo_nota_codigo: tipo === "07" ? "01" : tipo === "08" ? "01" : "",
    motivo_nota_descripcion: "", fecha_emision: hoy(), moneda: "PEN" as "PEN" | "USD", tipo_cambio: "3.750", operacion_tipo: "gravada" as OperacionTipo,
    condicion_pago: "Contado", dias_credito: "0", tipo_tributario: "ninguno" as TipoTributarioCpe, pct_detraccion: "0", codigo_spot: "", orden_compra: "", observacion: "",
    cliente_numero_documento: "", cliente_razon_social: "", cliente_direccion: "", cliente_ciudad: "", cliente_estado_sunat: "", cliente_condicion_sunat: "",
    fecha_vencimiento: hoy(), guia_remision_numero: "", igv_tasa: "18", anticipo_tipo: "ninguno", anticipo_documento: "", anticipo_monto: "",
    guia_motivo: "01", guia_modalidad: "02", guia_fecha_traslado: hoy(), guia_transportista: "", guia_transportista_doc: "", guia_placa: "", guia_licencia: "",
    guia_peso: "", guia_bultos: "", guia_partida: "", guia_partida_ubigeo: "", guia_llegada: "", guia_llegada_ubigeo: "",
    regimen_tasa: tipo === "40" ? "2" : "3", motivo_baja: "01",
  };
}

const ed: CSSProperties = { border: "none", borderBottom: `1px dashed ${C.line}`, background: "transparent", font: "inherit", color: "inherit", width: "100%", padding: "2px 0", outline: "none" };
const edSel: CSSProperties = { ...ed, cursor: "pointer" };
const cel: CSSProperties = { ...ed, borderBottom: "none", padding: "4px 2px" };

function Bloque({ titulo, children, style }: { titulo: string; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...style }}><b style={{ fontSize: 8, color: C.muted, letterSpacing: ".04em" }}>{titulo}</b><div style={{ marginTop: 5, display: "grid", gap: 4 }}>{children}</div></div>;
}
function Linea({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <label style={{ display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "center", gap: 6 }}><span style={{ fontSize: 8.5, color: C.muted, textTransform: "uppercase" }}>{etiqueta}</span>{children}</label>;
}

export type Empresa = { razon_social?: string; eslogan?: string; ruc?: string; direccion?: string; telefono?: string; web?: string; logo_url?: string } | null | undefined;

export function HojaComprobante(props: {
  form: FormCpe; setForm: (f: FormCpe) => void; items: ItemEditor[]; setItems: (i: ItemEditor[]) => void;
  docs: DocRelacionado[]; setDocs: (d: DocRelacionado[]) => void; empresa: Empresa;
  clientes: { id: string; razon_social: string; numero_documento: string; direccion: string | null; tipo_documento: string }[];
  proyectos: { id: string; nombre: string; codigo: string }[];
  refs: { id: string; numero: string; tipo_comprobante: string; total: number }[];
  series: { id: string; serie: string; tipo_comprobante: string }[];
  cuotas: CuotaEditor[]; setCuotas: (c: CuotaEditor[]) => void;
  numeroPreview: string; montos: { valorVenta: number; igv: number; anticipo: number; total: number; montoDetraccion: number; montoRetencion: number };
  totalRegimen: number; importeRegimen: number; onTipoChange: (t: TipoComprobante) => void; bloqueado: boolean;
}) {
  const { form, setForm, items, setItems, docs, setDocs, cuotas, setCuotas, empresa, clientes, proyectos, refs, series, numeroPreview, montos, totalRegimen, importeRegimen, onTipoChange, bloqueado } = props;
  const buscarDoc = useServerFn(consultarDocumentoSunat); const buscarTc = useServerFn(consultarTipoCambio);
  const [aviso, setAviso] = useState(""); const [buscando, setBuscando] = useState(false);
  const tipo = form.tipo_comprobante as TipoComprobante;
  const etiquetaTipo = PESTANAS_CPE.find((p) => p.tipo === tipo)?.corto ?? "";
  const sym = form.moneda === "USD" ? "US$" : "S/";
  const money = (n: number) => `${sym} ${N(n)}`;
  const set = (k: keyof FormCpe, v: string) => setForm({ ...form, [k]: v });

  async function buscarCliente() {
    const numero = form.cliente_numero_documento.replace(/\D/g, "");
    if (numero.length !== 8 && numero.length !== 11) { setAviso("Escribe 8 dígitos (DNI) u 11 dígitos (RUC)."); return; }
    const local = clientes.find((c) => c.numero_documento === numero);
    if (local) { setForm({ ...form, cliente_id: local.id, cliente_numero_documento: numero, cliente_razon_social: local.razon_social, cliente_direccion: local.direccion ?? "" }); setAviso("Cliente encontrado en el ERP."); return; }
    setBuscando(true); setAviso("");
    try {
      const r = await buscarDoc({ data: { numero } });
      if (r.encontrado) setForm({ ...form, cliente_id: "", cliente_numero_documento: numero, cliente_razon_social: r.razonSocial, cliente_direccion: r.direccion, cliente_estado_sunat: r.estado, cliente_condicion_sunat: r.condicion });
      setAviso(r.mensaje || (r.encontrado ? "Datos obtenidos de los registros oficiales." : ""));
    } catch { setAviso("No se pudo completar la consulta."); } finally { setBuscando(false); }
  }
  async function traerTipoCambio() {
    setBuscando(true); setAviso("");
    try { const r = await buscarTc({ data: { fecha: form.fecha_emision } }); if (r.encontrado) setForm({ ...form, tipo_cambio: String(r.venta) }); setAviso(r.mensaje || (r.encontrado ? `Tipo de cambio oficial del ${form.fecha_emision}: ${r.venta}` : "")); }
    catch { setAviso("No se pudo consultar el tipo de cambio."); } finally { setBuscando(false); }
  }
  const actualizarItem = (i: number, k: keyof ItemEditor, v: string) => setItems(items.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const actualizarDoc = (i: number, k: keyof DocRelacionado, v: string) => setDocs(docs.map((x, n) => (n === i ? { ...x, [k]: v } : x)));

  return (
    <div style={{ overflowX: "auto", paddingBottom: 18 }}>
      <section style={{ width: 794, minHeight: 1123, margin: "0 auto", padding: "36px 38px", background: C.white, color: C.ink, fontFamily: "Helvetica,Arial,sans-serif", boxShadow: "0 12px 35px rgba(15,23,42,.18)" }}>
        <header style={{ display: "flex", gap: 18, borderBottom: `3px solid ${C.green}`, paddingBottom: 14 }}>
          <div style={{ width: 108, display: "flex", alignItems: "center", justifyContent: "center" }}>{empresa?.logo_url ? <img src={empresa.logo_url} alt="" style={{ maxWidth: 100, maxHeight: 54 }} /> : <div style={{ width: 52, height: 52, borderRadius: 9, background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>TX</div>}</div>
          <div style={{ flex: 1, textAlign: "right", fontFamily: '"Calibri Light",Calibri,Arial,sans-serif' }}>
            <b style={{ fontSize: 12, color: C.greenDark }}>{empresa?.razon_social || "TELXEN SAC"}</b>
            <div style={{ fontSize: 9, color: C.greenDark, marginTop: 4 }}>{empresa?.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL"}</div>
            <div style={{ fontSize: 9, color: C.text, marginTop: 5 }}>{empresa?.direccion}</div>
            <div style={{ fontSize: 9, color: C.text }}>{empresa?.telefono} · {empresa?.web}</div>
          </div>
          <div style={{ width: 316, textAlign: "center" }}>
            <div style={{ background: C.greenSoft, borderTop: `4px solid ${C.green}`, borderRadius: 5, padding: "11px 12px" }}>
              <select value={tipo} disabled={bloqueado} onChange={(e) => onTipoChange(e.target.value as TipoComprobante)} style={{ ...edSel, textAlign: "center", fontSize: 10.5, fontWeight: 800, borderBottom: "none", whiteSpace: "nowrap" }}>
                {PESTANAS_CPE.map((p) => <option key={p.tipo} value={p.tipo}>{p.corto}</option>)}
              </select>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 5 }}>RUC: {empresa?.ruc || "—"}</div>
              <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center", marginTop: 3 }}>
                <input value={form.serie} disabled={bloqueado} onChange={(e) => set("serie", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))} list="cpe-series" title="Serie editable (4 caracteres)" style={{ ...ed, width: 52, fontSize: 13, fontWeight: 800, borderBottom: "none", textAlign: "right" }} />
                <datalist id="cpe-series">{series.filter((s) => s.tipo_comprobante === tipo).map((s) => <option key={s.id} value={s.serie} />)}</datalist>
                <span style={{ fontSize: 13, fontWeight: 800 }}>-</span>
                {bloqueado
                  ? <span style={{ fontSize: 13, fontWeight: 800 }}>{numeroPreview}</span>
                  : <input value={form.correlativo_inicial} onChange={(e) => set("correlativo_inicial", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="AUTOMÁTICO" title="Correlativo editable: si lo defines, la numeración continúa desde aquí" style={{ ...ed, width: 118, fontSize: 13, fontWeight: 800, borderBottom: "none", textAlign: "left" }} />}
              </div>
            </div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, marginTop: 5 }}>{etiquetaTipo}</div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr .8fr", gap: 16, background: C.soft, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: 13, marginTop: 17, fontSize: 10 }}>
          <Bloque titulo={tipo === "09" ? "DESTINATARIO" : "CLIENTE"}>
            <Linea etiqueta="RUC / DNI">
              <span style={{ display: "flex", gap: 4 }}>
                <input value={form.cliente_numero_documento} onChange={(e) => set("cliente_numero_documento", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void buscarCliente(); } }} placeholder="20601234567" style={ed} />
                <button type="button" onClick={() => void buscarCliente()} disabled={buscando} title="Consultar en SUNAT / RENIEC" style={{ border: `1px solid ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "0 6px", cursor: "pointer" }}><Search size={12} /></button>
              </span>
            </Linea>
            <Linea etiqueta="Nombre"><input value={form.cliente_razon_social} onChange={(e) => set("cliente_razon_social", e.target.value)} placeholder="Razón social del cliente" style={{ ...ed, fontWeight: 700 }} /></Linea>
            <Linea etiqueta="Dirección"><input value={form.cliente_direccion} onChange={(e) => set("cliente_direccion", e.target.value)} placeholder="Dirección fiscal" style={ed} /></Linea>
            <Linea etiqueta="Registrado">
              <select value={form.cliente_id} onChange={(e) => { const c = clientes.find((x) => x.id === e.target.value); setForm({ ...form, cliente_id: e.target.value, cliente_numero_documento: c?.numero_documento ?? form.cliente_numero_documento, cliente_razon_social: c?.razon_social ?? form.cliente_razon_social, cliente_direccion: c?.direccion ?? form.cliente_direccion }); }} style={edSel}>
                <option value="">Cliente nuevo / no registrado</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </Linea>
            {(form.cliente_estado_sunat || form.cliente_condicion_sunat) && <div style={{ fontSize: 8.5, fontWeight: 700, color: form.cliente_condicion_sunat === "HABIDO" ? C.green : C.muted }}>{form.cliente_estado_sunat} · {form.cliente_condicion_sunat}</div>}
          </Bloque>
          <Bloque titulo="PROYECTO / REFERENCIA">
            <Linea etiqueta="Proyecto"><select value={form.proyecto_id} onChange={(e) => set("proyecto_id", e.target.value)} style={edSel}><option value="">Sin proyecto</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</select></Linea>
            <Linea etiqueta="O. de compra"><input value={form.orden_compra} onChange={(e) => set("orden_compra", e.target.value)} style={ed} /></Linea>
            {(tipo === "07" || tipo === "08") && <>
              <Linea etiqueta="Modifica a"><select value={form.referencia_id} onChange={(e) => set("referencia_id", e.target.value)} style={edSel}><option value="">Selecciona...</option>{refs.map((r) => <option key={r.id} value={r.id}>{r.numero}</option>)}</select></Linea>
              <Linea etiqueta="Motivo"><select value={form.motivo_nota_codigo} onChange={(e) => set("motivo_nota_codigo", e.target.value)} style={edSel}>{(tipo === "07" ? MOTIVOS_NOTA_CREDITO : MOTIVOS_NOTA_DEBITO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
              <Linea etiqueta="Sustento"><input value={form.motivo_nota_descripcion} onChange={(e) => set("motivo_nota_descripcion", e.target.value)} style={ed} /></Linea>
            </>}
          </Bloque>
          <Bloque titulo="EMISIÓN">
            <Linea etiqueta="Fecha"><input type="date" value={form.fecha_emision} onChange={(e) => set("fecha_emision", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Moneda"><select value={form.moneda} onChange={(e) => set("moneda", e.target.value)} style={edSel}><option value="PEN">Soles</option><option value="USD">Dólares</option></select></Linea>
            <Linea etiqueta="T. cambio">
              <span style={{ display: "flex", gap: 4 }}>
                <input type="number" step="0.001" value={form.tipo_cambio} disabled={form.moneda === "PEN"} onChange={(e) => set("tipo_cambio", e.target.value)} style={ed} />
                <button type="button" onClick={() => void traerTipoCambio()} disabled={buscando} title="Tipo de cambio oficial del día" style={{ border: `1px solid ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "0 6px", cursor: "pointer" }}><Search size={12} /></button>
              </span>
            </Linea>
          </Bloque>
        </div>
        {aviso && <div style={{ fontSize: 9, color: C.greenDark, background: C.greenSoft, padding: "5px 9px", marginTop: 6 }}>{aviso}</div>}

        {tipo === "09" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 15, fontSize: 10, border: `1px solid ${C.line}`, padding: 12 }}>
          <Bloque titulo="TRASLADO">
            <Linea etiqueta="Motivo"><select value={form.guia_motivo} onChange={(e) => set("guia_motivo", e.target.value)} style={edSel}>{MOTIVOS_TRASLADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
            <Linea etiqueta="Modalidad"><select value={form.guia_modalidad} onChange={(e) => set("guia_modalidad", e.target.value)} style={edSel}>{MODALIDADES_TRASLADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
            <Linea etiqueta="Fecha"><input type="date" value={form.guia_fecha_traslado} onChange={(e) => set("guia_fecha_traslado", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Peso (kg)"><input type="number" step="0.01" value={form.guia_peso} onChange={(e) => set("guia_peso", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Bultos"><input type="number" value={form.guia_bultos} onChange={(e) => set("guia_bultos", e.target.value)} style={ed} /></Linea>
          </Bloque>
          <Bloque titulo="TRANSPORTISTA / VEHÍCULO">
            <Linea etiqueta="Transportista"><input value={form.guia_transportista} onChange={(e) => set("guia_transportista", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="RUC"><input value={form.guia_transportista_doc} onChange={(e) => set("guia_transportista_doc", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Placa"><input value={form.guia_placa} onChange={(e) => set("guia_placa", e.target.value.toUpperCase())} style={ed} /></Linea>
            <Linea etiqueta="Licencia"><input value={form.guia_licencia} onChange={(e) => set("guia_licencia", e.target.value.toUpperCase())} style={ed} /></Linea>
          </Bloque>
          <Bloque titulo="PUNTOS DE PARTIDA Y LLEGADA">
            <Linea etiqueta="Partida"><input value={form.guia_partida} onChange={(e) => set("guia_partida", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Ubigeo"><input value={form.guia_partida_ubigeo} onChange={(e) => set("guia_partida_ubigeo", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Llegada"><input value={form.guia_llegada} onChange={(e) => set("guia_llegada", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Ubigeo"><input value={form.guia_llegada_ubigeo} onChange={(e) => set("guia_llegada_ubigeo", e.target.value)} style={ed} /></Linea>
          </Bloque>
        </div>}

        {(tipo === "20" || tipo === "40") && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 15, fontSize: 10, border: `1px solid ${C.line}`, padding: 12 }}>
          <Bloque titulo={tipo === "20" ? "RÉGIMEN DE RETENCIONES" : "RÉGIMEN DE PERCEPCIONES"}>
            <Linea etiqueta="Tasa"><select value={form.regimen_tasa} onChange={(e) => set("regimen_tasa", e.target.value)} style={edSel}>{(tipo === "20" ? TASAS_RETENCION : TASAS_PERCEPCION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
            <Linea etiqueta="Observación"><input value={form.observacion} onChange={(e) => set("observacion", e.target.value)} style={ed} /></Linea>
          </Bloque>
          <Bloque titulo="IMPORTES DEL RÉGIMEN">
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Importe total de los comprobantes</span><b>{money(totalRegimen)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{tipo === "20" ? "Importe retenido" : "Importe percibido"} ({form.regimen_tasa}%)</span><b>{money(importeRegimen)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 4 }}><span>{tipo === "20" ? "Neto a pagar" : "Total a cobrar"}</span><b>{money(tipo === "20" ? totalRegimen - importeRegimen : totalRegimen + importeRegimen)}</b></div>
          </Bloque>
        </div>}

        {tipo === "RA" && <div style={{ marginTop: 15, fontSize: 10, border: `1px solid ${C.line}`, padding: 12 }}>
          <Bloque titulo="COMUNICACIÓN DE BAJA">
            <Linea etiqueta="Motivo"><select value={form.motivo_baja} onChange={(e) => set("motivo_baja", e.target.value)} style={edSel}>{MOTIVOS_BAJA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
            <Linea etiqueta="Sustento"><input value={form.observacion} onChange={(e) => set("observacion", e.target.value)} placeholder="Detalle del motivo de anulación" style={ed} /></Linea>
          </Bloque>
        </div>}

        {usaItems(tipo) && <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 9 }}>
          <thead><tr style={{ background: C.ink, color: C.white, textAlign: "left" }}>{["#", "Código", "Descripción", "Und.", "Cantidad", ...(usaImportes(tipo) ? ["V. unitario", "Dscto.", "Subtotal"] : []), ""].map((x, i) => <th key={i} style={{ padding: "7px 6px" }}>{x}</th>)}</tr></thead>
          <tbody>{items.map((x, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 ? C.soft : C.white }}>
            <td style={{ padding: 4, width: 22 }}>{i + 1}</td>
            <td style={{ padding: 4, width: 70 }}><input value={x.codigo} onChange={(e) => actualizarItem(i, "codigo", e.target.value)} style={cel} /></td>
            <td style={{ padding: 4 }}><input value={x.descripcion} onChange={(e) => actualizarItem(i, "descripcion", e.target.value)} placeholder="Descripción del bien o servicio" style={cel} /></td>
            <td style={{ padding: 4, width: 74 }}><select value={x.unidad_sunat} onChange={(e) => actualizarItem(i, "unidad_sunat", e.target.value)} style={{ ...cel, cursor: "pointer" }}>{UNIDADES_SUNAT.map(([v, l]) => <option key={v} value={v}>{v} · {l}</option>)}</select></td>
            <td style={{ padding: 4, width: 62 }}><input type="number" step="0.001" value={x.cantidad} onChange={(e) => actualizarItem(i, "cantidad", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
            {usaImportes(tipo) && <>
              <td style={{ padding: 4, width: 74 }}><input type="number" step="0.01" value={x.valor_unitario} onChange={(e) => actualizarItem(i, "valor_unitario", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
              <td style={{ padding: 4, width: 60 }}><input type="number" step="0.01" value={x.descuento} onChange={(e) => actualizarItem(i, "descuento", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
              <td style={{ padding: 6, width: 82, textAlign: "right", fontWeight: 700 }}>{money(calcularItem(x, form.operacion_tipo).subtotal)}</td>
            </>}
            <td style={{ width: 22 }}><button type="button" title="Quitar" onClick={() => setItems(items.length === 1 ? [itemComprobanteVacio()] : items.filter((_, n) => n !== i))} style={{ border: "none", background: "transparent", color: C.muted, cursor: "pointer" }}><Trash2 size={13} /></button></td>
          </tr>)}</tbody>
        </table>}
        {usaItems(tipo) && <button type="button" onClick={() => setItems([...items, itemComprobanteVacio()])} style={{ marginTop: 7, fontSize: 9.5, border: `1px dashed ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "4px 9px", cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}><Plus size={12} />Agregar línea</button>}

        {usaRelacionados(tipo) && <><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 9 }}>
          <thead><tr style={{ background: C.ink, color: C.white, textAlign: "left" }}>{["#", "Tipo", "Serie", "Número", "Fecha", "Importe", ""].map((x, i) => <th key={i} style={{ padding: "7px 6px" }}>{x}</th>)}</tr></thead>
          <tbody>{docs.map((d, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 ? C.soft : C.white }}>
            <td style={{ padding: 4, width: 22 }}>{i + 1}</td>
            <td style={{ padding: 4, width: 110 }}><select value={d.tipo} onChange={(e) => actualizarDoc(i, "tipo", e.target.value)} style={{ ...cel, cursor: "pointer" }}>{TIPOS_DOC_RELACIONADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
            <td style={{ padding: 4, width: 70 }}><input value={d.serie} onChange={(e) => actualizarDoc(i, "serie", e.target.value.toUpperCase())} style={cel} /></td>
            <td style={{ padding: 4, width: 100 }}><input value={d.numero} onChange={(e) => actualizarDoc(i, "numero", e.target.value)} style={cel} /></td>
            <td style={{ padding: 4, width: 110 }}><input type="date" value={d.fecha} onChange={(e) => actualizarDoc(i, "fecha", e.target.value)} style={cel} /></td>
            <td style={{ padding: 4, width: 96 }}><input type="number" step="0.01" value={d.importe} onChange={(e) => actualizarDoc(i, "importe", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
            <td style={{ width: 22 }}><button type="button" title="Quitar" onClick={() => setDocs(docs.length === 1 ? [docRelacionadoVacio()] : docs.filter((_, n) => n !== i))} style={{ border: "none", background: "transparent", color: C.muted, cursor: "pointer" }}><Trash2 size={13} /></button></td>
          </tr>)}</tbody>
        </table>
          <button type="button" onClick={() => setDocs([...docs, docRelacionadoVacio()])} style={{ marginTop: 7, fontSize: 9.5, border: `1px dashed ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "4px 9px", cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}><Plus size={12} />Agregar comprobante</button></>}

        {usaImportes(tipo) && <>
          <div style={{ width: 320, marginLeft: "auto", marginTop: 18, fontSize: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 6, borderBottom: `1px solid ${C.line}` }}>
              <select value={form.operacion_tipo} onChange={(e) => set("operacion_tipo", e.target.value)} style={{ ...edSel, width: 160, borderBottom: "none" }}><option value="gravada">Op. gravada</option><option value="exonerada">Op. exonerada</option><option value="inafecta">Op. inafecta</option></select>
              <span>{money(montos.valorVenta)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: 6, borderBottom: `1px solid ${C.line}` }}><span>IGV {form.operacion_tipo === "gravada" ? "18%" : "0%"}</span><span>{money(montos.igv)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: 11, background: C.ink, color: C.white, fontWeight: 800, fontSize: 12 }}><span>IMPORTE TOTAL</span><span>{money(montos.total)}</span></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14, fontSize: 9.5 }}>
            <div style={{ background: C.greenSoft, borderTop: `3px solid ${C.green}`, padding: 11 }}>
              <b style={{ fontSize: 8, color: C.muted }}>FORMA DE PAGO</b>
              <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                <Linea etiqueta="Condición"><select value={form.condicion_pago} onChange={(e) => set("condicion_pago", e.target.value)} style={edSel}><option>Contado</option><option>Crédito</option></select></Linea>
                {form.condicion_pago === "Crédito" && <Linea etiqueta="Días"><input type="number" min="0" value={form.dias_credito} onChange={(e) => set("dias_credito", e.target.value)} style={ed} /></Linea>}
              </div>
            </div>
            <div style={{ background: C.greenSoft, borderTop: `3px solid ${C.green}`, padding: 11 }}>
              <b style={{ fontSize: 8, color: C.muted }}>RÉGIMEN TRIBUTARIO</b>
              <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                <Linea etiqueta="Régimen"><select value={`${form.tipo_tributario}|${form.pct_detraccion}`} onChange={(e) => { const [t, p] = e.target.value.split("|"); setForm({ ...form, tipo_tributario: t as TipoTributarioCpe, pct_detraccion: p ?? "0", codigo_spot: t === "detraccion" ? "037" : "" }); }} style={edSel}>
                  <option value="ninguno|0">No aplica</option><option value="detraccion|4">Detracción 4% · construcción</option><option value="detraccion|12">Detracción 12% · otros servicios</option><option value="retencion|3">Retención 3%</option>
                </select></Linea>
                {form.tipo_tributario === "detraccion" && <Linea etiqueta="Código SPOT"><select value={form.codigo_spot} onChange={(e) => set("codigo_spot", e.target.value)} style={edSel}>{CODIGOS_SPOT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>}
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Importe</span><b>{money(montos.montoDetraccion + montos.montoRetencion)}</b></div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 9.5 }}><b style={{ fontSize: 8, color: C.muted }}>OBSERVACIONES</b><input value={form.observacion} onChange={(e) => set("observacion", e.target.value)} placeholder="Texto adicional que se imprime en el comprobante" style={{ ...ed, marginTop: 4 }} /></div>
        </>}

        <div style={{ marginTop: 24, borderTop: `1px solid ${C.line}`, paddingTop: 12, fontSize: 9, color: C.muted }}>
          <b>REPRESENTACIÓN IMPRESA DEL COMPROBANTE ELECTRÓNICO</b>
          <div style={{ marginTop: 5 }}>Vista de captura: lo que escribes aquí es exactamente lo que saldrá impreso.</div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DOC } from "@/lib/documento-tema";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CuentasComprobante, cuentaDetraccionDe, type CuentaCpe } from "@/components/facturacion/CuentasComprobante";
import { Plus, Search, Trash2 } from "lucide-react";
import { consultarDocumentoSunat, consultarTipoCambio } from "@/lib/decolecta.functions";
import { fechaLima, useTipoCambioHoy } from "@/lib/tipo-cambio";
import { filasDesglose } from "@/lib/desglose-comprobante";
import { CODIGOS_SPOT, columnasCuotas, MODALIDADES_TRASLADO, MOTIVOS_BAJA, MOTIVOS_NOTA_CREDITO, MOTIVOS_NOTA_DEBITO, MOTIVOS_TRASLADO, PESTANAS_CPE, TASAS_PERCEPCION, TASAS_RETENCION, TIPOS_DOC_RELACIONADO, UNIDADES_SUNAT, calcularItem, cuotaVacia, datosAnticipo, docRelacionadoVacio, itemComprobanteVacio, montoEnLetras, repartirCuotas, usaImportes, usaItems, usaRelacionados, type AnticipoTipo, type CuotaEditor, type DocRelacionado, type ItemEditor, type OperacionTipo, type TipoComprobante, type TipoTributarioCpe } from "@/lib/facturacion";
import { hoy } from "@/lib/format";
import { nombreConductor, useTransportistas, vencido } from "@/lib/transportistas";
import { VentanaTransportista } from "@/components/TransportistasPanel";
import { VentanaPartidasGuia, unidadSunat } from "@/components/facturacion/PartidasGuia";
import { FechaComprobante } from "@/components/facturacion/FechaComprobante";

export const C = DOC;
const CARD: CSSProperties = { background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 2px rgba(16,24,40,.06)", padding: 14, textAlign: "left" };
const N = (n: number) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type FormCpe = ReturnType<typeof nuevoFormCpe>;
export function nuevoFormCpe(tipo: TipoComprobante, serie: string) {
  return {
    tipo_comprobante: tipo, serie, correlativo_inicial: "", cliente_id: "", proyecto_id: "", referencia_id: "", motivo_nota_codigo: tipo === "07" ? "01" : tipo === "08" ? "01" : "",
    motivo_nota_descripcion: "", fecha_emision: hoy(), moneda: "PEN" as "PEN" | "USD", tipo_cambio: "3.750", operacion_tipo: "gravada" as OperacionTipo,
    condicion_pago: "Contado", dias_credito: "0", tipo_tributario: "ninguno" as TipoTributarioCpe, pct_detraccion: "0", codigo_spot: "", orden_compra: "", observacion: "",
    cliente_numero_documento: "", cliente_razon_social: "", cliente_direccion: "", cliente_departamento: "", cliente_provincia: "", cliente_distrito: "", cliente_estado_sunat: "", cliente_condicion_sunat: "",
    fecha_vencimiento: hoy(), guia_remision_numero: "", igv_tasa: "18", anticipo_tipo: "ninguno", anticipo_documento: "", anticipo_monto: "",
    isc: "0", icbper: "0", otros_cargos: "0", otros_tributos: "0",
    guia_motivo: "01", guia_modalidad: "02", guia_fecha_traslado: hoy(), guia_transportista: "", guia_transportista_doc: "", guia_placa: "", guia_licencia: "",
    guia_peso: "", guia_bultos: "", guia_origen: "libre", guia_transportista_id: "", guia_mtc: "", guia_certificado: "", guia_entidad_autorizacion: "", guia_autorizacion: "", guia_placa_secundaria: "", guia_conductor_nombre: "", guia_conductor_doc_tipo: "DNI", guia_conductor_doc: "", guia_licencia_categoria: "", guia_vehiculo_propio_id: "", guia_conductor_propio_id: "", guia_partida: "", guia_partida_ubigeo: "", guia_llegada: "", guia_llegada_ubigeo: "",
    regimen_tasa: tipo === "40" ? "2" : "3", motivo_baja: "01",
  };
}

const ed: CSSProperties = { border: "none", borderBottom: "1px solid transparent", background: "transparent", fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit", fontStyle: "inherit", textTransform: "inherit", lineHeight: "inherit", color: "inherit", width: "100%", padding: "2px 0", outline: "none" };
const edSel: CSSProperties = { ...ed, cursor: "pointer", appearance: "none" };
const cel: CSSProperties = { ...ed, borderBottom: "none", padding: "4px 2px" };

function Bloque({ titulo, children, style }: { titulo: string; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...style }}>{titulo && <span style={{ fontSize: 9, color: C.green, fontFamily: "var(--font-global)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{titulo}</span>}<div style={{ marginTop: titulo ? 5 : 0, display: "grid", gap: 4 }}>{children}</div></div>;
}
function Linea({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <label style={{ display: "grid", gridTemplateColumns: "74px 8px 1fr", alignItems: "center", columnGap: 2 }}><b style={{ textTransform: "uppercase" }}>{etiqueta}</b><span>:</span>{children}</label>;
}
/** Campo de texto que crece hacia abajo con el contenido, sin barra ni texto cortado. */
function TextoCreciente({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...style, resize: "none", overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />;
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
  numeroPreview: string; montos: { subTotalVentas: number; descuentos: number; valorVenta: number; isc: number; igv: number; icbper: number; otrosCargos: number; otrosTributos: number; redondeo: number; anticipo: number; total: number; montoDetraccion: number; montoRetencion: number; detraccionBase?: number; detraccionUsd?: number; retencionBase?: number; retencionUsd?: number; netoPagar?: number };
  totalRegimen: number; importeRegimen: number; onTipoChange: (t: TipoComprobante) => void; bloqueado: boolean;
  tipos?: { tipo: TipoComprobante; etiqueta: string; corto: string }[];
}) {
  const { form, setForm, items, setItems, docs, setDocs, cuotas, setCuotas, empresa, clientes, proyectos, refs, series, numeroPreview, montos, totalRegimen, importeRegimen, onTipoChange, bloqueado, tipos = PESTANAS_CPE } = props;
  const simbolo = form.moneda === "USD" ? "US$" : "S/";
  const baseCuotas = montos.netoPagar ?? montos.total;
  function cambiarCondicion(v: string) { setForm({ ...form, condicion_pago: v }); setCuotas(v === "Crédito" ? (cuotas.length ? cuotas : repartirCuotas(baseCuotas, [form.fecha_vencimiento])) : []); }
  useEffect(() => {
    if (form.condicion_pago !== "Crédito" || cuotas.length > 1) return;
    const monto = baseCuotas.toFixed(2);
    if (cuotas.length === 1 && cuotas[0]?.monto === monto) return;
    setCuotas([{ fecha: cuotas[0]?.fecha || form.fecha_vencimiento, monto }]);
  }, [baseCuotas, form.condicion_pago, form.fecha_vencimiento, cuotas, setCuotas]);
  const { data: cuentas = [] } = useQuery({ queryKey: ["bancos-cpe"], queryFn: async () => { const { data, error } = await supabase.from("bancos").select("nombre,numero_cuenta,cci,monedas,tipo_cuenta").eq("activo", true).order("nombre"); if (error) throw error; return (data ?? []) as CuentaCpe[]; } });
  const buscarDoc = useServerFn(consultarDocumentoSunat); const buscarTc = useServerFn(consultarTipoCambio); const { data: tcHoy } = useTipoCambioHoy();
  const [aviso, setAviso] = useState(""); const [buscando, setBuscando] = useState(false);
  const [verPartidas, setVerPartidas] = useState(false); const [nuevoTransp, setNuevoTransp] = useState(false); const [pendienteTransp, setPendienteTransp] = useState("");
  const { data: transportistas = [] } = useTransportistas();
  const esGuia = form.tipo_comprobante === "09";
  const { data: flota = [] } = useQuery({ queryKey: ["vehiculos", "propios"], enabled: esGuia, queryFn: async () => { const { data, error } = await supabase.from("vehiculos").select("id,placa,marca,modelo").eq("propiedad", "Propio").order("placa"); if (error) throw error; return data ?? []; } });
  const { data: personal = [] } = useQuery({ queryKey: ["trabajadores", "conductores"], enabled: esGuia, queryFn: async () => { const { data, error } = await supabase.from("trabajadores").select("id,nombre,dni").eq("activo", true).order("nombre"); if (error) throw error; return data ?? []; } });
  const transpSel = transportistas.find((t) => t.id === form.guia_transportista_id);
  function elegirTransportista(id: string) {
    const t = transportistas.find((x) => x.id === id);
    setForm({ ...form, guia_transportista_id: id, guia_transportista: t?.razon_social ?? "", guia_transportista_doc: t?.ruc ?? "", guia_mtc: t?.registro_mtc ?? "", guia_certificado: t?.certificado_habilitacion ?? "", guia_entidad_autorizacion: t?.entidad_autorizacion ?? "", guia_autorizacion: t?.numero_autorizacion ?? "", guia_placa: "", guia_placa_secundaria: "", guia_conductor_nombre: "", guia_conductor_doc: "", guia_licencia: "", guia_licencia_categoria: "" });
    if (t && vencido(t.certificado_vencimiento)) setAviso(`El certificado de habilitación de ${t.razon_social} está vencido.`);
  }
  useEffect(() => { if (pendienteTransp && transportistas.some((t) => t.id === pendienteTransp)) { elegirTransportista(pendienteTransp); setPendienteTransp(""); } }, [pendienteTransp, transportistas]); // eslint-disable-line react-hooks/exhaustive-deps
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
      if (r.encontrado) setForm({ ...form, cliente_id: "", cliente_numero_documento: numero, cliente_razon_social: r.razonSocial, cliente_direccion: r.direccion, cliente_departamento: r.departamento, cliente_provincia: r.provincia, cliente_distrito: r.distrito, cliente_estado_sunat: r.estado, cliente_condicion_sunat: r.condicion });
      setAviso(r.mensaje || (r.encontrado ? "Datos obtenidos de los registros oficiales." : ""));
    } catch { setAviso("No se pudo completar la consulta."); } finally { setBuscando(false); }
  }
  async function traerTipoCambio() {
    if (form.fecha_emision === fechaLima() && tcHoy?.esHoy && tcHoy.venta > 0) { setForm({ ...form, tipo_cambio: String(tcHoy.venta) }); setAviso(`Tipo de cambio oficial de hoy: ${tcHoy.venta}`); return; }
    setBuscando(true); setAviso("");
    try { const r = await buscarTc({ data: { fecha: form.fecha_emision } }); if (r.encontrado) setForm({ ...form, tipo_cambio: String(r.venta) }); setAviso(r.mensaje || (r.encontrado ? `Tipo de cambio oficial del ${form.fecha_emision}: ${r.venta}` : "")); }
    catch { setAviso("No se pudo consultar el tipo de cambio."); } finally { setBuscando(false); }
  }
  const actualizarItem = (i: number, k: keyof ItemEditor, v: string) => setItems(items.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const actualizarDoc = (i: number, k: keyof DocRelacionado, v: string) => setDocs(docs.map((x, n) => (n === i ? { ...x, [k]: v } : x)));

  const lienzo = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => { const el = lienzo.current; if (!el) return; const ro = new ResizeObserver(([e]) => e && setZoom(Math.max(1, Math.min(2, (e.contentRect.width - 8) / 794)))); ro.observe(el); return () => ro.disconnect(); }, []);

  return (
    <div ref={lienzo} className="cpe-editor-canvas" style={{ paddingBottom: 18 }}>
      <div style={{ width: 794 * zoom, maxWidth: "100%", margin: "0 auto 10px", display: "flex", flexWrap: "wrap", gap: "8px 18px", alignItems: "center", fontSize: 12, padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.white, boxSizing: "border-box" }}>
        {usaImportes(tipo) && <label style={{ display: "flex", gap: 6, alignItems: "center" }}><b>Forma de pago</b><select value={form.condicion_pago} onChange={(e) => cambiarCondicion(e.target.value)}><option>Contado</option><option>Crédito</option></select></label>}
        {usaImportes(tipo) && <label style={{ display: "flex", gap: 6, alignItems: "center" }}><b>Forma de pago</b><select value={form.condicion_pago} onChange={(e) => cambiarCondicion(e.target.value)}><option>Contado</option><option>Crédito</option></select></label>}
        {usaImportes(tipo) && <label style={{ display: "flex", gap: 6, alignItems: "center" }}><b>Régimen</b><select value={`${form.tipo_tributario}|${form.pct_detraccion}`} onChange={(e) => { const [t, p] = e.target.value.split("|"); setForm({ ...form, tipo_tributario: t as TipoTributarioCpe, pct_detraccion: p ?? "0", codigo_spot: t === "detraccion" ? (p === "4" ? "030" : "037") : "" }); }} style={{ ...edSel, width: "auto", borderBottom: `1px solid ${C.line}` }}><option value="ninguno|0">No aplica</option><option value="detraccion|4">Detracción 4% · construcción</option><option value="detraccion|12">Detracción 12% · otros servicios</option><option value="retencion|3">Retención 3%</option></select></label>}
        {usaImportes(tipo) && <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={form.anticipo_tipo !== "ninguno"} onChange={(e) => setForm({ ...form, anticipo_tipo: e.target.checked ? "anticipo" : "ninguno", anticipo_documento: "", anticipo_monto: "" })} /><b>Anticipo</b></label>}
        {usaImportes(tipo) && form.anticipo_tipo !== "ninguno" && <>
          <select aria-label="Modalidad" value={form.anticipo_tipo} onChange={(e) => { const v = e.target.value as AnticipoTipo; setForm({ ...form, anticipo_tipo: v, ...datosAnticipo(v, form.anticipo_documento, form.anticipo_monto) }); }} style={{ ...edSel, width: "auto", borderBottom: `1px solid ${C.line}` }}><option value="anticipo">Factura por pago anticipado</option><option value="deduccion">Factura que resta anticipos</option></select>
          {form.anticipo_tipo === "deduccion" && <>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><b>Comprobante</b><input value={form.anticipo_documento} onChange={(e) => set("anticipo_documento", e.target.value.toUpperCase())} placeholder="F001-00000012" style={{ ...ed, width: 130, borderBottom: `1px solid ${C.line}` }} /></label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><b>Importe</b><input type="number" step="0.01" min="0" value={form.anticipo_monto} onChange={(e) => set("anticipo_monto", e.target.value)} style={{ ...ed, width: 110, borderBottom: `1px solid ${C.line}` }} /></label>
          </>}
        </>}
        {(form.cliente_estado_sunat || form.cliente_condicion_sunat) && <span style={{ fontWeight: 700, color: form.cliente_condicion_sunat === "HABIDO" ? C.green : C.muted }}>SUNAT: {form.cliente_estado_sunat} · {form.cliente_condicion_sunat}</span>}
        {aviso && <span style={{ color: C.greenDark }}>{aviso}</span>}
      </div>
      <section className="cpe-editor-sheet" style={{ width: 794, zoom, minHeight: 1123, boxSizing: "border-box", margin: "0 auto", padding: "36px 38px", background: C.white, color: C.ink, fontFamily: "var(--font-global)", fontWeight: 400, fontSize: 9, boxShadow: "0 12px 35px rgba(26,43,76,.14)", display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", gap: 12, alignItems: "center", paddingBottom: 6, color: "#000" }}>
          <div style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>{empresa?.logo_url ? <img src={empresa.logo_url} alt="" style={{ maxWidth: 92, maxHeight: 54 }} /> : <div style={{ width: 52, height: 52, borderRadius: 9, background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>TX</div>}</div>
          <div style={{ flex: 1, minHeight: 62, textAlign: "left", paddingLeft: 4, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <b style={{ fontSize: 13, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN SAC"}</b>
            <div style={{ fontFamily: "var(--font-global)", fontWeight: 300, fontSize: 7, marginTop: 2, lineHeight: 1.15, textAlign: "left" }}>{empresa?.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL"}</div>
            <div style={{ fontFamily: "var(--font-global)", fontWeight: 300, fontSize: 7.5, marginTop: 2, lineHeight: 1.15, textAlign: "left" }}>{empresa?.direccion || "—"}</div>
            <div style={{ fontFamily: "var(--font-global)", fontWeight: 300, fontSize: 7.5, marginTop: 2, lineHeight: 1.15, textAlign: "left" }}>{empresa?.web || "—"}</div>
          </div>
          <div style={{ width: 248, textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ background: "#B5E6BE", border: `1px solid ${"#000"}`, borderRadius: 8, padding: "10px 10px", color: "#000", fontSize: 12, lineHeight: 1.15 }}>
              <div style={{ fontSize: 10, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
              <select value={tipo} disabled={bloqueado} onChange={(e) => onTipoChange(e.target.value as TipoComprobante)} title="Tipo de comprobante" style={{ ...edSel, textAlign: "center", fontFamily: "var(--font-global)", fontSize: 12, fontWeight: 700, borderBottom: "none", whiteSpace: "nowrap", marginTop: 5 }}>
                {tipos.map((p) => <option key={p.tipo} value={p.tipo}>{p.corto}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center", marginTop: 5 }}>
                <input value={form.serie} disabled={bloqueado} onChange={(e) => set("serie", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))} list="cpe-series" title="Serie editable (4 caracteres)" style={{ ...ed, width: 52, fontSize: 13, fontWeight: 700, borderBottom: "none", textAlign: "right" }} />
                <datalist id="cpe-series">{series.filter((s) => s.tipo_comprobante === tipo).map((s) => <option key={s.id} value={s.serie} />)}</datalist>
                <span style={{ fontSize: 13, fontWeight: 700 }}>-</span>
                {bloqueado
                  ? <span style={{ fontSize: 13, fontWeight: 700 }}>{numeroPreview}</span>
                  : <input value={form.correlativo_inicial} onChange={(e) => set("correlativo_inicial", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="AUTOMÁTICO" title="Correlativo editable: si lo defines, la numeración continúa desde aquí" style={{ ...ed, width: 110, fontSize: 13, fontWeight: 700, borderBottom: "none", textAlign: "left" }} />}
              </div>
            </div>
            <div style={{ alignSelf: "center", marginTop: 6, fontSize: 8, fontWeight: 700, letterSpacing: ".05em", padding: "2px 10px", borderRadius: 999, background: "#FEF9E7", color: "#7D6608", border: `1px solid ${C.accent}` }}>{etiquetaTipo}</div>
          </div>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, ...CARD, padding: 13, background: "transparent", border: `1.5px solid ${C.gris}`, borderRadius: 10, marginTop: 8, fontSize: 9, textAlign: "left", textTransform: "uppercase", lineHeight: 1.15 }}>
          <Bloque titulo="">
            <Linea etiqueta="RUC">
              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input value={form.cliente_numero_documento} onChange={(e) => set("cliente_numero_documento", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void buscarCliente(); } }} placeholder="20601234567" style={ed} />
                <button type="button" onClick={() => void buscarCliente()} disabled={buscando} title="Consultar en SUNAT / RENIEC" style={{ border: "none", color: C.muted, background: "transparent", padding: 0, cursor: "pointer", display: "flex" }}><Search size={10} /></button>
              </span>
            </Linea>
            <Linea etiqueta="Nombre"><input value={form.cliente_razon_social} onChange={(e) => set("cliente_razon_social", e.target.value)} placeholder="Razón social del cliente" style={{ ...ed, fontWeight: 700 }} /></Linea>
            <Linea etiqueta="Dirección"><input value={form.cliente_direccion} onChange={(e) => set("cliente_direccion", e.target.value)} placeholder="Dirección fiscal" style={ed} /></Linea>
            <Linea etiqueta="Departamento"><div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 4, alignItems: "center" }}><input value={form.cliente_departamento} onChange={(e) => set("cliente_departamento", e.target.value)} placeholder="Lima" style={ed} /><b>Provincia:</b><input value={form.cliente_provincia} onChange={(e) => set("cliente_provincia", e.target.value)} placeholder="Lima" style={ed} /><b>Distrito:</b><input value={form.cliente_distrito} onChange={(e) => set("cliente_distrito", e.target.value)} placeholder="Miraflores" style={ed} /></div></Linea>
            <Linea etiqueta="Proyecto"><select value={form.proyecto_id} onChange={(e) => set("proyecto_id", e.target.value)} style={edSel}><option value="">—</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Linea>
            {(tipo === "07" || tipo === "08") && <>
              <Linea etiqueta="Modifica a"><select value={form.referencia_id} onChange={(e) => set("referencia_id", e.target.value)} style={edSel}><option value="">Selecciona...</option>{refs.map((r) => <option key={r.id} value={r.id}>{r.numero}</option>)}</select></Linea>
              <Linea etiqueta="Motivo"><select value={form.motivo_nota_codigo} onChange={(e) => set("motivo_nota_codigo", e.target.value)} style={edSel}>{(tipo === "07" ? MOTIVOS_NOTA_CREDITO : MOTIVOS_NOTA_DEBITO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
              <Linea etiqueta="Sustento"><input value={form.motivo_nota_descripcion} onChange={(e) => set("motivo_nota_descripcion", e.target.value)} style={ed} /></Linea>
            </>}
          </Bloque>
          <div style={{ display: "grid", gridTemplateColumns: "52px 8px auto", columnGap: 2, alignItems: "center", alignContent: "start", lineHeight: 1.15 }}>
            <b>Moneda</b><span>:</span><select value={form.moneda} onChange={(e) => set("moneda", e.target.value)} style={{ ...edSel, width: "auto" }}><option value="PEN">PEN</option><option value="USD">USD</option></select>
            {form.moneda === "USD" && <><b>T. cambio</b><span>:</span><span style={{ display: "flex", gap: 3, alignItems: "center" }}><input type="number" step="0.001" value={form.tipo_cambio} onChange={(e) => set("tipo_cambio", e.target.value)} style={{ ...ed, width: 52 }} /><button type="button" onClick={() => void traerTipoCambio()} disabled={buscando} title="Tipo de cambio oficial del día" style={{ border: "none", color: C.muted, background: "transparent", padding: 0, cursor: "pointer", display: "flex" }}><Search size={10} /></button></span></>}
            <b>IGV</b><span>:</span><select value={form.igv_tasa} onChange={(e) => set("igv_tasa", e.target.value)} style={{ ...edSel, width: "auto" }}><option value="18">18%</option><option value="10.5">10.5%</option><option value="10">10%</option></select>
          </div>
        </div>
        {(() => {
          const celdas: [string, ReactNode][] = [
            ["Fecha de Emisión", <FechaComprobante etiqueta="Fecha de emisión" value={form.fecha_emision} onChange={(v) => set("fecha_emision", v)} style={{ ...ed, textAlign: "center" }} />],
            ["Forma de Pago", <select value={form.condicion_pago} onChange={(e) => cambiarCondicion(e.target.value)} style={{ ...edSel, textAlign: "center" }}><option>Contado</option><option>Crédito</option></select>],
            ["Orden de Compra", <input value={form.orden_compra} onChange={(e) => set("orden_compra", e.target.value)} style={{ ...ed, textAlign: "center" }} />],
            ["Fecha de Vencimiento", <FechaComprobante etiqueta="Fecha de vencimiento" value={form.fecha_vencimiento} onChange={(v) => set("fecha_vencimiento", v)} style={{ ...ed, textAlign: "center" }} />],
            ...(tipo !== "09" ? [["N° Guía de Remisión", <input value={form.guia_remision_numero} onChange={(e) => set("guia_remision_numero", e.target.value.toUpperCase())} placeholder="T001-00000045" style={{ ...ed, textAlign: "center" }} />] as [string, ReactNode]] : []),
          ];
          return <div style={{ display: "grid", gridTemplateColumns: `repeat(${celdas.length}, 1fr)`, border: `1.5px solid ${C.gris}`, borderRadius: 10, marginTop: 10, fontSize: 9, textAlign: "center", lineHeight: 1.15 }}>{celdas.map(([l, v], i) => <div key={l} style={{ padding: "5px 4px", borderLeft: i ? `1.5px solid ${C.gris}` : "none" }}><b style={{ display: "block", marginBottom: 3 }}>{l}:</b>{v}</div>)}</div>;
        })()}

        {tipo === "09" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 15, fontSize: 10, border: `1px solid ${C.line}`, padding: 12 }}>
          <Bloque titulo="TRASLADO">
            <Linea etiqueta="Motivo"><select value={form.guia_motivo} onChange={(e) => set("guia_motivo", e.target.value)} style={edSel}>{MOTIVOS_TRASLADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
            <Linea etiqueta="Modalidad"><select value={form.guia_modalidad} onChange={(e) => set("guia_modalidad", e.target.value)} style={edSel}>{MODALIDADES_TRASLADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Linea>
            <Linea etiqueta="Fecha"><FechaComprobante etiqueta="Fecha de traslado" value={form.guia_fecha_traslado} onChange={(v) => set("guia_fecha_traslado", v)} style={ed} /></Linea>
            <Linea etiqueta="Peso (kg)"><input type="number" step="0.01" value={form.guia_peso} onChange={(e) => set("guia_peso", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Bultos"><input type="number" value={form.guia_bultos} onChange={(e) => set("guia_bultos", e.target.value)} style={ed} /></Linea>
          </Bloque>
          {form.guia_modalidad === "01" ? <Bloque titulo="TRANSPORTISTA (TRANSPORTE PÚBLICO)">
            <Linea etiqueta="Catálogo"><span style={{ display: "flex", gap: 4 }}><select value={form.guia_transportista_id} onChange={(e) => elegirTransportista(e.target.value)} style={edSel}><option value="">Selecciona transportista…</option>{transportistas.filter((t) => t.activo || t.id === form.guia_transportista_id).map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}</select><button type="button" onClick={() => setNuevoTransp(true)} title="Registrar transportista" style={{ border: `1px solid ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "0 6px", cursor: "pointer" }}><Plus size={11} /></button></span></Linea>
            <Linea etiqueta="RUC"><input value={form.guia_transportista_doc} onChange={(e) => set("guia_transportista_doc", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Razón social"><input value={form.guia_transportista} onChange={(e) => set("guia_transportista", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Registro MTC"><input value={form.guia_mtc} onChange={(e) => set("guia_mtc", e.target.value.toUpperCase())} style={ed} /></Linea>
            <Linea etiqueta="Cert. habilit."><input value={form.guia_certificado} onChange={(e) => set("guia_certificado", e.target.value.toUpperCase())} style={ed} /></Linea>
            <Linea etiqueta="Entidad autoriz."><input value={form.guia_entidad_autorizacion} onChange={(e) => set("guia_entidad_autorizacion", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="N° autoriz."><input value={form.guia_autorizacion} onChange={(e) => set("guia_autorizacion", e.target.value.toUpperCase())} style={ed} /></Linea>
            {transpSel && <>
              <Linea etiqueta="Vehículo"><select value={transpSel.vehiculos.find((v) => v.placa === form.guia_placa)?.id ?? ""} onChange={(e) => { const v = transpSel.vehiculos.find((x) => x.id === e.target.value); setForm({ ...form, guia_placa: v?.placa ?? "", guia_placa_secundaria: v?.placa_secundaria ?? "" }); }} style={edSel}><option value="">(Opcional)</option>{transpSel.vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}{v.placa_secundaria ? ` / ${v.placa_secundaria}` : ""}</option>)}</select></Linea>
              <Linea etiqueta="Conductor"><select value={transpSel.conductores.find((c) => c.numero_documento === form.guia_conductor_doc)?.id ?? ""} onChange={(e) => { const c = transpSel.conductores.find((x) => x.id === e.target.value); setForm({ ...form, guia_conductor_nombre: c ? nombreConductor(c) : "", guia_conductor_doc_tipo: c?.tipo_documento ?? "DNI", guia_conductor_doc: c?.numero_documento ?? "", guia_licencia: c?.licencia ?? "", guia_licencia_categoria: c?.categoria_licencia ?? "" }); if (c && vencido(c.licencia_vencimiento)) setAviso(`La licencia de ${nombreConductor(c)} está vencida.`); }} style={edSel}><option value="">(Opcional)</option>{transpSel.conductores.map((c) => <option key={c.id} value={c.id}>{nombreConductor(c)}</option>)}</select></Linea>
            </>}
            {(form.guia_placa || form.guia_conductor_doc) && <div style={{ fontSize: 8.5, color: C.muted }}>{form.guia_placa && `Placa ${form.guia_placa}${form.guia_placa_secundaria ? ` / ${form.guia_placa_secundaria}` : ""}`}{form.guia_conductor_doc && ` · ${form.guia_conductor_nombre} · ${form.guia_conductor_doc_tipo} ${form.guia_conductor_doc} · Lic. ${form.guia_licencia} ${form.guia_licencia_categoria}`}</div>}
          </Bloque> : <Bloque titulo="VEHÍCULO Y CONDUCTOR (TRANSPORTE PRIVADO)">
            <Linea etiqueta="Vehículo"><select value={form.guia_vehiculo_propio_id} onChange={(e) => { const v = flota.find((x) => x.id === e.target.value); setForm({ ...form, guia_vehiculo_propio_id: e.target.value, guia_placa: v?.placa ?? form.guia_placa }); }} style={edSel}><option value="">Flota TELXEN…</option>{flota.map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</option>)}</select></Linea>
            <Linea etiqueta="Placa *"><input value={form.guia_placa} onChange={(e) => set("guia_placa", e.target.value.toUpperCase())} style={ed} /></Linea>
            <Linea etiqueta="Conductor"><select value={form.guia_conductor_propio_id} onChange={(e) => { const t = personal.find((x) => x.id === e.target.value); setForm({ ...form, guia_conductor_propio_id: e.target.value, guia_conductor_nombre: t?.nombre ?? form.guia_conductor_nombre, guia_conductor_doc_tipo: "DNI", guia_conductor_doc: t?.dni ?? form.guia_conductor_doc }); }} style={edSel}><option value="">Personal TELXEN…</option>{personal.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></Linea>
            <Linea etiqueta="Nombre *"><input value={form.guia_conductor_nombre} onChange={(e) => set("guia_conductor_nombre", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="DNI *"><input value={form.guia_conductor_doc} onChange={(e) => set("guia_conductor_doc", e.target.value.replace(/\D/g, "").slice(0, 8))} style={ed} /></Linea>
            <Linea etiqueta="Licencia *"><input value={form.guia_licencia} onChange={(e) => set("guia_licencia", e.target.value.toUpperCase())} style={ed} /></Linea>
            <Linea etiqueta="Categoría"><input value={form.guia_licencia_categoria} onChange={(e) => set("guia_licencia_categoria", e.target.value.toUpperCase())} placeholder="A-IIb" style={ed} /></Linea>
          </Bloque>}
          <Bloque titulo="PUNTOS DE PARTIDA Y LLEGADA">
            <Linea etiqueta="Partida"><input value={form.guia_partida} onChange={(e) => set("guia_partida", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Ubigeo"><input value={form.guia_partida_ubigeo} onChange={(e) => set("guia_partida_ubigeo", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Llegada"><input value={form.guia_llegada} onChange={(e) => set("guia_llegada", e.target.value)} style={ed} /></Linea>
            <Linea etiqueta="Ubigeo"><input value={form.guia_llegada_ubigeo} onChange={(e) => set("guia_llegada_ubigeo", e.target.value)} style={ed} /></Linea>
          </Bloque>
        </div>}

        {tipo === "09" && form.proyecto_id && <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={() => setVerPartidas(true)} style={{ border: `1px solid ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Cargar partidas del proyecto</button></div>}
        {verPartidas && <VentanaPartidasGuia proyectoId={form.proyecto_id} onCerrar={() => setVerPartidas(false)} onCargar={(ps) => { const actuales = items.filter((x) => x.descripcion.trim()); setItems([...actuales, ...ps.map((p) => ({ ...itemComprobanteVacio(), descripcion: p.nombre, unidad_sunat: unidadSunat(p.unidad), cantidad: String(Number(p.metrado ?? 0)) }))]); setVerPartidas(false); }} />}
        {nuevoTransp && <VentanaTransportista inicial={null} onCerrar={() => setNuevoTransp(false)} onGuardado={(id) => setPendienteTransp(id)} />}

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

        {usaItems(tipo) && <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 9, tableLayout: "fixed" }}>
          {usaImportes(tipo) && <colgroup><col style={{ width: "8%" }} /><col style={{ width: "40%" }} /><col style={{ width: "7%" }} /><col style={{ width: "9%" }} /><col style={{ width: "13%" }} /><col style={{ width: "9%" }} /><col style={{ width: "14%" }} /><col style={{ width: 0 }} /></colgroup>}
          <thead><tr style={{ background: C.gris, color: C.white }}><th style={{ padding: "4px 2px", fontWeight: 700, fontSize: 6.5, textAlign: "left" }}>CÓDIGO</th><th style={{ padding: "4px 4px", fontWeight: 700, fontSize: 6.5, textAlign: "left" }}>DESCRIPCIÓN</th><th style={{ padding: "4px 2px", fontWeight: 700, fontSize: 6.5, textAlign: "center" }}>UNIDAD</th><th style={{ padding: "4px 2px", fontWeight: 700, fontSize: 6.5, textAlign: "center" }}>CANTIDAD</th>{usaImportes(tipo) && <><th style={{ padding: "3px 2px", fontWeight: 700, fontSize: 6.5, textAlign: "center", lineHeight: 1.1 }}>V. UNITARIO</th><th style={{ padding: "4px 2px", fontWeight: 700, fontSize: 6.5, textAlign: "center" }}>DESCUENTO</th><th style={{ padding: "3px 2px", fontWeight: 700, fontSize: 6.5, textAlign: "center", lineHeight: 1.1 }}>V. VENTA</th></>}<th /></tr></thead>
          <tbody>{items.map((x, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: i % 2 ? C.soft : C.white, verticalAlign: "top" }}>
            <td style={{ padding: 6, verticalAlign: "top" }}><input value={x.codigo} onChange={(e) => actualizarItem(i, "codigo", e.target.value)} style={cel} /></td>
            <td style={{ padding: 6, paddingLeft: 12, verticalAlign: "top" }}><TextoCreciente value={x.descripcion} onChange={(v) => actualizarItem(i, "descripcion", v)} placeholder="Descripción del bien o servicio" style={{ ...cel, padding: 0, display: "block", fontSize: 7, fontWeight: 400, lineHeight: 1.25 }} /></td>
            <td style={{ padding: 6, verticalAlign: "top" }}><select value={x.unidad_sunat} onChange={(e) => actualizarItem(i, "unidad_sunat", e.target.value)} style={{ ...cel, cursor: "pointer" }}>{UNIDADES_SUNAT.map(([v, l]) => <option key={v} value={v} title={l}>{v}</option>)}</select></td>
            <td style={{ padding: 6, verticalAlign: "top" }}><input type="number" step="0.001" value={x.cantidad} onChange={(e) => actualizarItem(i, "cantidad", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
            {usaImportes(tipo) && <>
              <td style={{ padding: 6, verticalAlign: "top" }}><input type="number" step="0.01" value={x.valor_unitario} onChange={(e) => actualizarItem(i, "valor_unitario", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
              <td style={{ padding: 6, verticalAlign: "top" }}><input type="number" step="0.01" value={x.descuento} onChange={(e) => actualizarItem(i, "descuento", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
              <td style={{ padding: 6, textAlign: "right", fontWeight: 700, verticalAlign: "top" }}>{money(calcularItem(x, form.operacion_tipo, Number(form.igv_tasa)).subtotal)}</td>
            </>}
            <td style={{ width: 0, padding: 0, position: "relative" }}><button type="button" title="Quitar" onClick={() => setItems(items.length === 1 ? [itemComprobanteVacio()] : items.filter((_, n) => n !== i))} style={{ position: "absolute", left: 2, top: 6, border: "none", background: "transparent", color: "var(--color-bad)", cursor: "pointer", padding: 0 }}><Trash2 size={10} /></button></td>
          </tr>)}</tbody>
        </table>}
        {usaItems(tipo) && <button type="button" onClick={() => setItems([...items, itemComprobanteVacio()])} style={{ alignSelf: "flex-start", marginTop: 4, fontSize: 8, border: `1px dashed ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "4px 9px", cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}><Plus size={12} />Agregar línea</button>}

        {usaRelacionados(tipo) && <><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 9 }}>
          <thead><tr style={{ background: "#f8fafc", color: C.ink, textAlign: "left", borderBottom: `1px solid ${C.line}` }}>{["#", "Tipo", "Serie", "Número", "Fecha", "Importe", ""].map((x, i) => <th key={i} style={{ padding: "7px 6px" }}>{x}</th>)}</tr></thead>
          <tbody>{docs.map((d, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.line}`, background: C.white }}>
            <td style={{ padding: 4, width: 22 }}>{i + 1}</td>
            <td style={{ padding: 4, width: 110 }}><select value={d.tipo} onChange={(e) => actualizarDoc(i, "tipo", e.target.value)} style={{ ...cel, cursor: "pointer" }}>{TIPOS_DOC_RELACIONADO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
            <td style={{ padding: 4, width: 70 }}><input value={d.serie} onChange={(e) => actualizarDoc(i, "serie", e.target.value.toUpperCase())} style={cel} /></td>
            <td style={{ padding: 4, width: 100 }}><input value={d.numero} onChange={(e) => actualizarDoc(i, "numero", e.target.value)} style={cel} /></td>
            <td style={{ padding: 4, width: 110 }}><FechaComprobante etiqueta={`Fecha de documento ${i + 1}`} value={d.fecha} onChange={(v) => actualizarDoc(i, "fecha", v)} style={cel} /></td>
            <td style={{ padding: 4, width: 96 }}><input type="number" step="0.01" value={d.importe} onChange={(e) => actualizarDoc(i, "importe", e.target.value)} style={{ ...cel, textAlign: "right" }} /></td>
            <td style={{ width: 22 }}><button type="button" title="Quitar" onClick={() => setDocs(docs.length === 1 ? [docRelacionadoVacio()] : docs.filter((_, n) => n !== i))} style={{ border: "none", background: "transparent", color: "var(--color-bad)", cursor: "pointer" }}><Trash2 size={13} /></button></td>
          </tr>)}</tbody>
        </table>
          <button type="button" onClick={() => setDocs([...docs, docRelacionadoVacio()])} style={{ marginTop: 7, fontSize: 9.5, border: `1px dashed ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "4px 9px", cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}><Plus size={12} />Agregar comprobante</button></>}

        {usaImportes(tipo) && <div style={{ display: "flex", gap: 14, alignItems: "stretch", marginTop: 18 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", fontSize: 9, textAlign: "left" }}><b style={{ fontSize: 8, color: C.green }}>OBSERVACIONES</b><TextoCreciente value={form.observacion} onChange={(v) => set("observacion", v)} placeholder="Texto adicional que se imprime en el comprobante" style={{ ...ed, marginTop: 3, textAlign: "left" }} />
            {form.tipo_tributario !== "ninguno" && (() => { const det = form.tipo_tributario === "detraccion"; const L = (a: string, v: string) => <><b>{a}</b><b>{v}</b></>; return <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 28, rowGap: 1, marginTop: "auto", paddingTop: 10, fontSize: 10, color: "#4B5563", lineHeight: 1.2 }}>{det && L("Cta. Cte. Banco de la Nación", cuentaDetraccionDe(cuentas)?.numero_cuenta || "—")}{L(`${det ? "Detracción" : "Retención"} (${form.pct_detraccion}%)`, `S/ ${(det ? montos.montoDetraccion : montos.montoRetencion).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}{det && <><b>Bien o Servicio</b><select value={form.codigo_spot} onChange={(e) => set("codigo_spot", e.target.value)} title="Bien o servicio sujeto a detracción" style={{ ...edSel, fontWeight: 700, color: "#4B5563" }}>{CODIGOS_SPOT.filter(([v]) => v).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></>}</div>; })()}
          </div>
          <div style={{ width: 300, flexShrink: 0, marginLeft: "auto", fontSize: 10, display: "grid", gap: 3, alignContent: "start" }}>{filasDesglose({ operacionTipo: form.operacion_tipo, valorVenta: montos.valorVenta, descuentos: montos.descuentos, anticipo: montos.anticipo, isc: montos.isc, icbper: montos.icbper, igv: montos.igv, otrosCargos: montos.otrosCargos, total: montos.total, detraccion: form.tipo_tributario === "detraccion" ? (form.moneda === "USD" ? (montos.detraccionUsd ?? 0) : montos.montoDetraccion) : 0, retencion: form.tipo_tributario === "retencion" ? (form.moneda === "USD" ? (montos.retencionUsd ?? 0) : montos.montoRetencion) : 0 }).map((f) => { const col = f.total ? C.totalDesglose : C.gris; return <div key={f.etiqueta} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ background: f.total ? col : C.grisClaro, color: f.total ? C.white : C.ink, borderRadius: 7, padding: "3px 6px", textAlign: "center" }}>{f.etiqueta}</div><div style={{ border: `1.5px solid ${col}`, borderRadius: 7, padding: "2px 8px", textAlign: "right", color: f.total ? col : C.ink }}>{money(f.valor)}</div></div>; })}</div>
        </div>}

        <div style={{ marginTop: "auto", paddingTop: 18 }}>
          {usaImportes(tipo) && <div style={{ padding: "4px 0", fontSize: 9, fontWeight: 700, textAlign: "justify", width: "100%" }}>{montoEnLetras(montos.total, form.moneda)}</div>}
          {usaImportes(tipo) && <div style={{ ...CARD, padding: 8, marginTop: 8, fontSize: 9 }}>
            {form.condicion_pago !== "Crédito" ? <b style={{ fontSize: 10 }}>{form.condicion_pago}</b> : <div style={{ fontSize: 10, lineHeight: 1.25 }}>
              <b>Información del crédito</b>
              <div style={{ display: "grid", gridTemplateColumns: "200px 14px 1fr", marginTop: 2 }}><span>Monto neto pendiente de pago</span><span>:</span><span>{money(baseCuotas)}</span><span>Total de Cuotas</span><span>:</span><span>{cuotas.length}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnasCuotas(cuotas.length)}, 56px 74px 80px)`, columnGap: 10, marginTop: 6, alignItems: "center" }}>
                {Array.from({ length: columnasCuotas(cuotas.length) }).flatMap((_, i) => [<b key={"a" + i} style={{ textAlign: "center" }}>Nº Cuota</b>, <b key={"b" + i}>Fec. Venc.</b>, <b key={"c" + i} style={{ textAlign: "right" }}>Monto</b>])}
                {cuotas.flatMap((q, i) => [
                  <span key={i + "a"} style={{ textAlign: "center", display: "inline-flex", gap: 3, justifyContent: "center", alignItems: "center" }}>{i + 1}{cuotas.length > 1 && <button type="button" title="Quitar cuota" onClick={() => setCuotas(repartirCuotas(baseCuotas, cuotas.filter((_, n) => n !== i).map((c) => c.fecha)))} style={{ border: "none", background: "transparent", color: "var(--color-bad)", cursor: "pointer", padding: 0, display: "flex" }}><Trash2 size={9} /></button>}</span>,
                  <FechaComprobante key={i + "b"} etiqueta={`Fecha de cuota ${i + 1}`} value={q.fecha} onChange={(v) => setCuotas(cuotas.map((c, n) => (n === i ? { ...c, fecha: v } : c)))} style={{ ...ed, width: 70, padding: 0 }} />,
                  <input key={i + "c"} type="number" step="0.01" aria-label={`Importe de cuota ${i + 1}`} readOnly={cuotas.length === 1} value={q.monto} onChange={(e) => setCuotas(cuotas.map((c, n) => (n === i ? { ...c, monto: e.target.value } : c)))} style={{ ...ed, width: 80, padding: 0, textAlign: "right" }} />,
                ])}
              </div>
            </div>}
            {form.condicion_pago === "Crédito" && <>
              <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", fontSize: 8 }}>
                <button type="button" onClick={() => setCuotas(repartirCuotas(baseCuotas, [...cuotas.map((c) => c.fecha), form.fecha_vencimiento]))} style={{ border: `1px dashed ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "1px 6px", cursor: "pointer", display: "inline-flex", gap: 3, alignItems: "center", fontSize: 8 }}><Plus size={9} />Cuota</button>
                {cuotas.length > 1 && <button type="button" onClick={() => setCuotas(repartirCuotas(baseCuotas, cuotas.map((c) => c.fecha || form.fecha_vencimiento)))} title="Repartir el neto a pagar en partes iguales" style={{ border: `1px solid ${C.green}`, color: C.green, background: C.white, borderRadius: 4, padding: "1px 6px", cursor: "pointer", fontSize: 8 }}>Repartir</button>}
                {Math.abs(cuotas.reduce((s, c) => s + Number(c.monto || 0), 0) - baseCuotas) > 0.005 && <span style={{ color: "var(--color-bad)", fontWeight: 700 }}>Las cuotas suman {money(cuotas.reduce((s, c) => s + Number(c.monto || 0), 0))}; el neto es {money(baseCuotas)}</span>}
              </div>
            </>}
          </div>}
          {usaImportes(tipo) && cuentas.length > 0 && <div style={{ ...CARD, padding: "0 8px 6px", marginTop: 8 }}><CuentasComprobante cuentas={cuentas} tipo="todas" compacto /></div>}
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 7, fontWeight: 300, fontSize: 8, color: C.ink }}>
            <b style={{ fontWeight: 700 }}>REPRESENTACIÓN IMPRESA DEL COMPROBANTE ELECTRÓNICO</b>
            <div style={{ marginTop: 3, fontSize: 7.5 }}>BORRADOR SIN VALIDEZ TRIBUTARIA.</div>
          </div>
        </div>
      </section>
    </div>
  );
}


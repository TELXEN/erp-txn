import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/lib/empresa";
import { useTipoCambioHoy } from "@/lib/tipo-cambio";
import { convertirMonedaCotizacion, vigenciaHasta, type Cotizacion } from "@/lib/cotizaciones";
import { supabase } from "@/integrations/supabase/client";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { formatearTexto } from "@/lib/formato-texto";
import { useAuth } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { consultarDocumentoSunat } from "@/lib/decolecta.functions";
import { TextoAjustado } from "@/components/TextoAjustado";
import { direccionSinUbicacion } from "@/lib/direccion-documento";

type Cliente = { id: string; razon_social: string; numero_documento: string };

/** Una cabecera documental para edición, vista previa y todas las páginas impresas. */
export function EncabezadoCotizacion({ cot, editable = false, clientes = [], numero = 1, totalHojas = 1 }: {
  cot: Cotizacion; editable?: boolean; clientes?: Cliente[]; numero?: number; totalHojas?: number;
}) {
  const { data: empresa } = useEmpresa();
  const { nombre: nombreUsuario, email: correoUsuario } = useAuth();
  const { data: cambio } = useTipoCambioHoy();
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const consultarDocumento = useServerFn(consultarDocumentoSunat);
  const [consultandoRuc, setConsultandoRuc] = useState(false);
  const rucActual = useRef(cot.ruc_cliente || "");
  const timerRuc = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRuc.current), []);
  const { data: cliente } = useQuery({
    queryKey: ["tercero-cotizacion", cot.cliente_id], enabled: Boolean(cot.cliente_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("terceros").select("razon_social, numero_documento, direccion, contacto, telefono, celular_contacto").eq("id", cot.cliente_id ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  async function actualizar() {
    await Promise.all([qc.invalidateQueries({ queryKey: ["cotizaciones"] }), qc.invalidateQueries({ queryKey: ["cotizacion"] }), qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] }), qc.invalidateQueries({ queryKey: ["cotizacion_gg", cot.id] })]);
  }
  async function guardar(campos: Record<string, unknown>) {
    const { error } = await supabase.from("cotizaciones").update(campos as never).eq("id", cot.id);
    if (error) { setError("No se pudo guardar el encabezado."); return; }
    setError(""); await actualizar();
  }
  async function completarRuc(numero: string) {
    if (!/^\d{11}$/.test(numero)) {
      setError("Ingresa un RUC de 11 dígitos.");
      return;
    }
    setConsultandoRuc(true); setError("");
    try {
      const resultado = await qc.fetchQuery({
        queryKey: ["decolecta-documento", numero],
        queryFn: () => consultarDocumento({ data: { numero } }),
        staleTime: 5 * 60 * 1000, retry: false,
      });
      if (rucActual.current !== numero) return;
      const registrado = clientes.find((c) => c.numero_documento === numero);
      let contacto: { contacto?: string | null; telefono?: string | null; celular_contacto?: string | null } | null = null;
      if (registrado) {
        const { data } = await supabase.from("terceros").select("contacto, telefono, celular_contacto").eq("id", registrado.id).maybeSingle();
        contacto = data;
      }
      if (!resultado.encontrado) {
        setError(resultado.mensaje || "No se encontró el RUC. Puedes completar los datos manualmente.");
        return;
      }
      await guardar({
        ruc_cliente: numero, cliente_id: registrado?.id ?? null, cliente: resultado.razonSocial, ubicacion: resultado.direccion,
        cliente_departamento: resultado.departamento, cliente_provincia: resultado.provincia, cliente_distrito: resultado.distrito,
        ...(contacto ? { atencion: formatearTexto(contacto.contacto || "", "titulo"), telefono: contacto.celular_contacto || contacto.telefono || "" } : {}),
      });
    } catch {
      if (rucActual.current === numero) setError("No se pudo consultar Decolecta. Reintenta o completa los datos manualmente.");
    } finally { setConsultandoRuc(false); }
  }
  const campo = (nombre: string, valor: string | number, tipo = "text", formatear?: (v: string) => string) => editable
    ? <input key={`${nombre}-${valor}`} aria-label={nombre === "nombre" ? "Proyecto" : nombre} type={tipo} defaultValue={valor} className="min-w-0 w-full border-0 border-b border-transparent bg-transparent py-0 text-inherit uppercase outline-none hover:border-muted-foreground focus:border-muted-foreground" style={{ font: "inherit", textAlign: "inherit" }} onBlur={(e) => {
      const escrito = tipo === "number" ? Number(e.target.value) : formatear ? formatear(e.target.value) : e.target.value;
      if (String(valor) !== String(escrito)) { e.target.value = String(escrito); void guardar({ [nombre]: escrito }); }
    }} />
    : <span>{valor || "—"}</span>;
  function menu(label: string, valor: string, opciones: [string, string][], cambiar: (v: string) => void) {
    return <Select value={valor} onValueChange={cambiar}><SelectTrigger aria-label={label} className="h-6 min-w-0 w-full rounded-sm px-1 py-0 text-xs shadow-none"><SelectValue placeholder="Elegir" /></SelectTrigger><SelectContent className="z-[200]"><SelectItem value={opciones[0]?.[0] ?? ""}>{opciones[0]?.[1]}</SelectItem><SelectItem value={opciones[1]?.[0] ?? ""}>{opciones[1]?.[1]}</SelectItem></SelectContent></Select>;
  }
  async function moneda(valor: string) {
    if (valor === cot.moneda) return;
    const tc = cot.fecha_envio ? Number(cot.tipo_cambio) : Number(cambio?.venta);
    if (!(tc > 0)) { setError("No hay tipo de cambio disponible para convertir la moneda."); return; }
    if (!window.confirm(`Se convertirán los precios a ${valor === "USD" ? "dólares" : "soles"} con T.C. ${tc}. ¿Continuar?`)) return;
    try { await convertirMonedaCotizacion(cot.id, valor as "PEN" | "USD", tc); await actualizar(); setError(""); }
    catch { setError("No se pudo cambiar la moneda."); }
  }
  const tc = cot.fecha_envio ? Number(cot.tipo_cambio) : Number(cambio?.venta) || Number(cot.tipo_cambio);
  const fecha = (v: string) => v.split("-").reverse().join("/");
  const fila = (label: string, valor: ReactNode, ancho = 74) => <div key={label} style={{ display: "flex", alignItems: "center", minHeight: editable ? 14 : undefined }}><b style={{ width: ancho, flexShrink: 0 }}>{label}</b><span style={{ width: 8, flexShrink: 0 }}>:</span><div style={{ flex: 1, minWidth: 0 }}>{valor}</div></div>;
  const ruc = cot.ruc_cliente || cliente?.numero_documento || "";
  return <div style={{ fontFamily: DOC_FUENTE_CSS, color: "#000", fontSize: 9, lineHeight: 1.15, textTransform: "uppercase" }}>
    <header style={{ display: "flex", gap: 12, alignItems: "center", paddingBottom: 6 }}>
      <div style={{ width: 132, flexShrink: 0, display: "flex", alignItems: "center", alignSelf: "flex-start" }}>{empresa?.logo_url ? <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ maxWidth: 132, maxHeight: 78, objectFit: "contain" }} /> : <b style={{ fontSize: 20 }}>TELXEN</b>}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left", paddingLeft: 4, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignSelf: "flex-start" }}><b style={{ fontSize: 13, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN S.A.C"}</b><div style={{ fontWeight: 300, marginTop: 2 }}><TextoAjustado texto={empresa?.eslogan} basePt={5.5} minimoPt={4} /></div><div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.direccion || "—"}</div><div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.web || "—"}</div></div>
      <div style={{ width: 248, flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ border: "1px solid #000", borderRadius: 8, padding: "10px", lineHeight: 1.15 }}><div style={{ fontSize: 10, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div><div style={{ fontSize: 12, fontWeight: 700, marginTop: 5 }}>COTIZACIÓN</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 5 }}>{cot.codigo || "SIN CÓDIGO"}</div></div><div style={{ alignSelf: "center", marginTop: 6, fontSize: 8, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: DOC.accentSoft, color: DOC.accentText, border: `1px solid ${DOC.accent}` }}>REV. {(cot.revision || "00").padStart(2, "0")} · HOJA {numero} DE {totalHojas}</div></div>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 12, padding: 13, border: `1.5px solid ${DOC.gris}`, borderRadius: 10, marginTop: 8, textAlign: "left" }}>
      <div style={{ minWidth: 0 }}>
        {fila("RUC", editable ? <><input aria-label="RUC" aria-busy={consultandoRuc} inputMode="numeric" maxLength={11} list={`ruc-${cot.id}`} defaultValue={ruc} key={ruc} className="w-full border-0 border-b border-transparent bg-transparent py-0 outline-none hover:border-muted-foreground focus:border-muted-foreground" style={{ font: "inherit" }} onChange={(e) => {
          const numero = e.target.value.trim(); rucActual.current = numero;
          clearTimeout(timerRuc.current);
          if (/^\d{11}$/.test(numero)) timerRuc.current = setTimeout(() => void completarRuc(numero), 400);
        }} onBlur={(e) => {
          const numero = e.target.value.trim(); rucActual.current = numero;
          if (numero === ruc) return;
          if (!/^\d{11}$/.test(numero)) { setError("Ingresa un RUC de 11 dígitos."); return; }
          // The pending automatic lookup saves all client fields together.
          if (!timerRuc.current) void completarRuc(numero);
        }} /><datalist id={`ruc-${cot.id}`}>{clientes.map((c) => <option key={c.id} value={c.numero_documento}>{c.razon_social}</option>)}</datalist></> : ruc || "—")}
        {fila("NOMBRE", <b>{campo("cliente", cot.cliente || cliente?.razon_social || "")}</b>)}
        {fila("DIRECCIÓN", campo("ubicacion", direccionSinUbicacion(cot.ubicacion || cliente?.direccion || "", cot.cliente_departamento || "", cot.cliente_provincia || "", cot.cliente_distrito || "")))}
        {fila("DEPARTAMENTO", <span style={{ display: "flex", gap: 8, whiteSpace: "nowrap", alignItems: "center" }}>
          <span style={{ minWidth: 0, flex: editable ? 1 : undefined }}>{campo("cliente_departamento", cot.cliente_departamento || "")}</span>
          <b>PROVINCIA:</b><span style={{ minWidth: 0, flex: editable ? 1 : undefined }}>{campo("cliente_provincia", cot.cliente_provincia || "")}</span>
          <b>DISTRITO:</b><span style={{ minWidth: 0, flex: editable ? 1 : undefined }}>{campo("cliente_distrito", cot.cliente_distrito || "")}</span>
        </span>)}
        {fila("ATENCIÓN", campo("atencion", cot.atencion || cliente?.contacto || "", "text", (v) => formatearTexto(v, "titulo")))}
        {fila("TELÉFONO", campo("telefono", cot.telefono || cliente?.celular_contacto || cliente?.telefono || ""))}
        {fila("PROYECTO", campo("nombre", cot.nombre))}
      </div>
      <div>
        {fila("MONEDA", editable ? menu("Moneda", cot.moneda, [["USD", "Dólares"], ["PEN", "Soles"]], (v) => void moneda(v)) : cot.moneda === "USD" ? "DÓLARES" : "SOLES", 60)}
        {cot.moneda === "USD" && fila("T. CAMBIO", tc > 0 ? tc.toFixed(3) : "—", 60)}
        {cot.aplica_igv !== false && fila("IGV", "18.00%", 60)}
        {editable && fila("HOJA", menu("Orientación", cot.orientacion || "vertical", [["vertical", "Vertical"], ["horizontal", "Horizontal"]], (v) => void guardar({ orientacion: v })), 60)}
      </div>
    </div>
    {consultandoRuc && <p role="status" className="mt-2 text-xs text-muted-foreground">Consultando RUC…</p>}
    {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
  </div>;
}

/** Pie de página de la hoja: quién elaboró la cotización, con correo y teléfono opcional. */
export function PieCotizacion({ cot, editable = false }: { cot: Cotizacion; editable?: boolean }) {
  const { nombre: nombreUsuario, email: correoUsuario } = useAuth();
  const qc = useQueryClient();
  async function guardar(campos: Record<string, unknown>) {
    const { error } = await supabase.from("cotizaciones").update(campos as never).eq("id", cot.id);
    if (error) return;
    await Promise.all([qc.invalidateQueries({ queryKey: ["cotizaciones"] }), qc.invalidateQueries({ queryKey: ["cotizacion"] })]);
  }
  const campo = (nombre: string, valor: string, tipo = "text", formatear?: (v: string) => string) => editable
    ? <input key={`${nombre}-${valor}`} aria-label={nombre} type={tipo} defaultValue={valor} className="min-w-0 w-full border-0 border-b border-transparent bg-transparent py-0 text-inherit outline-none hover:border-muted-foreground focus:border-muted-foreground" style={{ font: "inherit", textAlign: "inherit" }} onBlur={(e) => {
      const escrito = formatear ? formatear(e.target.value) : e.target.value;
      if (String(valor) !== String(escrito)) { e.target.value = String(escrito); void guardar({ [nombre]: escrito }); }
    }} />
    : <span>{valor || "—"}</span>;
  const fila = (label: string, valor: ReactNode) => (
    <div key={label} style={{ display: "flex", alignItems: "center", minHeight: editable ? 14 : undefined }}>
      <span style={{ width: 56, flexShrink: 0 }}>{label}</span>
      <span style={{ width: 12, flexShrink: 0, textAlign: "center" }}>:</span>
      <div style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{valor}</div>
    </div>
  );
  return (
    <div style={{ fontFamily: DOC_FUENTE_CSS, color: DOC.dark, fontSize: "7pt", lineHeight: 1.15 }}>
      {fila("Nombre", campo("elaborado_por", cot.elaborado_por || nombreUsuario, "text", (v) => formatearTexto(v, "titulo")))}
      {fila("Correo", campo("correo_elaborado", cot.correo_elaborado || correoUsuario, "email"))}
      {fila("Celular", campo("telefono_elaborado", cot.telefono_elaborado || ""))}
    </div>
  );
}
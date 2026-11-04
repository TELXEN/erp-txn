import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/lib/empresa";
import { useTipoCambioHoy } from "@/lib/tipo-cambio";
import { convertirMonedaCotizacion, vigenciaHasta, type Cotizacion } from "@/lib/cotizaciones";
import { supabase } from "@/integrations/supabase/client";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { consultarDocumentoSunat } from "@/lib/decolecta.functions";

type Cliente = { id: string; razon_social: string; numero_documento: string };

/** Una cabecera documental para edición, vista previa y todas las páginas impresas. */
export function EncabezadoCotizacion({ cot, editable = false, clientes = [], numero = 1, totalHojas = 1 }: {
  cot: Cotizacion; editable?: boolean; clientes?: Cliente[]; numero?: number; totalHojas?: number;
}) {
  const { data: empresa } = useEmpresa();
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
        ...(contacto ? { atencion: contacto.contacto || "", telefono: contacto.celular_contacto || contacto.telefono || "" } : {}),
      });
    } catch {
      if (rucActual.current === numero) setError("No se pudo consultar Decolecta. Reintenta o completa los datos manualmente.");
    } finally { setConsultandoRuc(false); }
  }
  const campo = (nombre: string, valor: string | number, tipo = "text") => editable
    ? <input key={`${nombre}-${valor}`} aria-label={nombre === "nombre" ? "Proyecto" : nombre} type={tipo} defaultValue={valor} className="min-w-0 w-full border-0 border-b border-dashed border-line bg-transparent py-0.5 font-semibold outline-none focus:border-primary" onBlur={(e) => { if (String(valor) !== e.target.value) void guardar({ [nombre]: tipo === "number" ? Number(e.target.value) : e.target.value }); }} />
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
  const fila = (label: string, valor: ReactNode, ancho = 70) => <div key={label} style={{ display: "flex", alignItems: "center", minHeight: editable ? 27 : undefined }}><span style={{ width: ancho, flexShrink: 0 }}>{label}</span><span style={{ width: 12, flexShrink: 0, textAlign: "center" }}>:</span><div style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{valor}</div></div>;
  const ruc = cot.ruc_cliente || cliente?.numero_documento || "";
  return <div style={{ fontFamily: DOC_FUENTE_CSS, color: DOC.dark, fontSize: "8pt", lineHeight: 1.35 }}>
    <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
      <div style={{ width: 120, height: 76, flexShrink: 0, display: "flex", alignItems: "center" }}>{empresa?.logo_url ? <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ maxWidth: 120, maxHeight: 64, objectFit: "contain" }} /> : <b style={{ fontSize: 20 }}>Telxen</b>}</div>
      <div style={{ flex: 1, minWidth: 0, fontSize: "8.5pt" }}><b style={{ fontSize: 12 }}>{empresa?.razon_social || "TELXEN S.A.C"}</b><div>{empresa?.eslogan}</div><div>{empresa?.direccion || "—"}</div><div>{empresa?.web || "—"}</div></div>
      <div style={{ width: 200, flexShrink: 0, textAlign: "right" }}><div className="rounded-md" style={{ border: `3px solid ${DOC.dark}`, padding: "8px 6px", textAlign: "center" }}><div style={{ fontSize: 15 }}>COTIZACIÓN</div><div style={{ fontSize: 10, marginTop: 3 }}>{cot.codigo || "SIN CÓDIGO"}</div></div><div style={{ marginTop: 3 }}>Rev. {(cot.revision || "00").padStart(2, "0")}</div><div style={{ fontSize: 7.5 }}>Hoja {numero} de {totalHojas}</div></div>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,270px)]">
      <div>
        {fila("RUC", editable ? <><input aria-label="RUC" aria-busy={consultandoRuc} inputMode="numeric" maxLength={11} list={`ruc-${cot.id}`} defaultValue={ruc} key={ruc} className="w-full border-b border-dashed border-line bg-transparent py-0.5 outline-none" onChange={(e) => {
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
        {fila("CLIENTE", campo("cliente", cot.cliente || cliente?.razon_social || ""))}
        {fila("DIRECCIÓN", campo("ubicacion", cot.ubicacion || cliente?.direccion || ""))}
        {fila("ATENCIÓN", campo("atencion", cot.atencion || cliente?.contacto || ""))}
        {fila("TELÉFONO", campo("telefono", cot.telefono || cliente?.celular_contacto || cliente?.telefono || ""))}
      </div>
      <div>
        {fila("FECHA DE EMISIÓN", editable ? campo("fecha_emision", cot.fecha_emision, "date") : fecha(cot.fecha_emision), 118)}
        {fila("MONEDA", editable ? menu("Moneda", cot.moneda, [["USD", "Dólares"], ["PEN", "Soles"]], (v) => void moneda(v)) : cot.moneda === "USD" ? "Dólares" : "Soles", 118)}
        {fila("CONDICIÓN DE VENTA", editable ? menu("Condición de venta", cot.condicion_venta || "", [["Crédito", "Crédito"], ["Contado", "Contado"]], (v) => void guardar({ condicion_venta: v })) : cot.condicion_venta || "—", 118)}
        {fila("VALIDEZ DE OFERTA", editable ? campo("validez_dias", cot.validez_dias, "number") : `${cot.validez_dias} días (hasta ${fecha(vigenciaHasta(cot.fecha_emision, cot.validez_dias))})`, 118)}
        {cot.moneda === "USD" && fila("TIPO CAMBIO", tc > 0 ? `${tc.toFixed(3)}${cot.tipo_cambio_fecha ? ` · ${fecha(cot.tipo_cambio_fecha)}` : ""}` : "No disponible", 118)}
        {editable && fila("ORIENTACIÓN", menu("Orientación", cot.orientacion || "vertical", [["vertical", "Vertical"], ["horizontal", "Horizontal"]], (v) => void guardar({ orientacion: v })), 118)}
      </div>
    </div>
    <div className="mt-2">{fila("PROYECTO", <div style={{ border: `1.5px solid ${DOC.dark}`, padding: "4px 8px" }}>{campo("nombre", cot.nombre)}</div>)}</div>
    {consultandoRuc && <p role="status" className="mt-2 text-xs text-muted-foreground">Consultando RUC…</p>}
    {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
  </div>;
}
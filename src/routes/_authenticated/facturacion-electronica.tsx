import { useRecordado } from "@/lib/recordado";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { BotonIcono } from "@/components/ui-kit";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FilePlus2, Landmark, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, MenuFiltros, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { calcularVencimiento } from "@/components/CondicionPago";
import { ConfigDecolecta } from "@/components/facturacion/ConfigDecolecta";
import { RegistrarVentaExterna } from "@/components/facturacion/RegistrarVentaExterna";
import { HojaComprobante, nuevoFormCpe, type FormCpe } from "@/components/facturacion/HojaComprobante";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { calcularComprobante, calcularItem, docRelacionadoVacio, itemComprobanteVacio, montoEnLetras, PESTANAS_CPE, repartirCuotas, SERIE_DEFECTO, TIPOS_COMPROBANTE, usaImportes, type Comprobante, type CuotaEditor, type DocRelacionado, type ItemEditor, type OperacionTipo, type TipoComprobante, type TipoTributarioCpe } from "@/lib/facturacion";
import { actualizarBorradorComprobante, crearComprobanteElectronico, eliminarBorradorComprobante } from "@/lib/facturacion.functions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/facturacion-electronica")({ validateSearch: (s: Record<string, unknown>) => ({ preliquidacion: typeof s["preliquidacion"] === "string" ? s["preliquidacion"] : "" }), head: () => ({ meta: [{ title: "Facturación Electrónica — ERP TELXEN" }, { name: "description", content: "Emisión y control de comprobantes de pago electrónicos: facturas, boletas, notas y retenciones y percepciones." }, { property: "og:title", content: "Facturación Electrónica — ERP TELXEN" }, { property: "og:description", content: "Comprobantes electrónicos, estados fiscales y cobranza." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: FacturacionElectronica });

export function FacturacionElectronica({ modo = "completo" }: { modo?: "completo" | "guias" } = {}) {
  const esGuias = modo === "guias";
  const { rol } = useAuth(); const preliquidacion = (useSearch({ strict: false }) as { preliquidacion?: string }).preliquidacion ?? ""; const navigate = useNavigate(); const qc = useQueryClient();
  const crear = useServerFn(crearComprobanteElectronico); const actualizar = useServerFn(actualizarBorradorComprobante); const eliminar = useServerFn(eliminarBorradorComprobante);
  const pestanaInicial: TipoComprobante = esGuias ? "09" : "01";
  const [sel, setSel] = useState("");
  const [pestana, setPestana] = useState<TipoComprobante>(pestanaInicial);
  const [abierto, setAbierto] = useState(Boolean(preliquidacion));
  const [origenAbierto, setOrigenAbierto] = useState(false);
  const [origen, setOrigen] = useState<"libre" | "preliquidacion">("libre");
  const [seleccionPl, setSeleccionPl] = useState("");
  const [preliquidacionOrigen, setPreliquidacionOrigen] = useState(preliquidacion);
  const [form, setForm] = useState<FormCpe>(() => nuevoFormCpe(pestanaInicial, SERIE_DEFECTO[pestanaInicial]));
  const [items, setItems] = useState<ItemEditor[]>([itemComprobanteVacio()]);
  const [docs, setDocs] = useState<DocRelacionado[]>([docRelacionadoVacio()]);
  const [cuotas, setCuotas] = useState<CuotaEditor[]>([]);
  const [busqueda, setBusqueda] = useRecordado("facturacion:busqueda", ""); const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false); const [cargado, setCargado] = useState("");
  const [ventaExt, setVentaExt] = useState(false);
  const [origenGuiaAbierto, setOrigenGuiaAbierto] = useState(false); const [origenGuia, setOrigenGuia] = useState<"libre" | "cliente">("libre"); const [guiaCliente, setGuiaCliente] = useState(""); const [guiaProyecto, setGuiaProyecto] = useState("");
  const [editando, setEditando] = useState<Comprobante | null>(null); const [porEliminar, setPorEliminar] = useState<Comprobante | null>(null);

  const { data: empresa } = useEmpresa();
  const { data: clientes = [] } = useQuery({ queryKey: ["terceros", "clientes-cpe"], queryFn: async () => { const { data, error } = await supabase.from("terceros").select("id,razon_social,numero_documento,direccion,tipo_documento").eq("es_cliente", true).eq("activo", true).order("razon_social"); if (error) throw error; return data ?? []; } });
  const { data: proyectos = [] } = useQuery({ queryKey: ["proyectos"], queryFn: async () => { const { data, error } = await supabase.from("proyectos").select("id,nombre,codigo").order("nombre"); if (error) throw error; return data ?? []; } });
  const { data: series = [] } = useQuery({ queryKey: ["series_comprobante"], queryFn: async () => { const { data, error } = await supabase.from("series_comprobante").select("*").eq("activo", true).order("serie"); if (error) throw error; return data ?? []; } });
  const { data: lista = [] } = useQuery({ queryKey: ["comprobantes_electronicos"], queryFn: async () => { const { data, error } = await supabase.from("comprobantes_electronicos").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as Comprobante[]; } });
  const { data: refs = [] } = useQuery({ queryKey: ["comprobantes-referencia"], queryFn: async () => { const { data, error } = await supabase.from("comprobantes_electronicos").select("id,numero,tipo_comprobante,total").in("tipo_comprobante", ["01", "03"]).neq("estado_fiscal", "Borrador").order("fecha_emision", { ascending: false }); if (error) throw error; return data ?? []; } });
  const { data: preliquidacionesDisponibles = [], isPending: buscandoPl, error: errorListaPl } = useQuery({ queryKey: ["preliquidaciones", "para-facturar"], enabled: origenAbierto, queryFn: async () => { const { data, error } = await supabase.from("preliquidaciones").select("id,codigo,concepto,proyecto_id,cliente_id,moneda").eq("estado", "Aprobada").order("fecha", { ascending: false }); if (error) throw error; return data ?? []; } });
  const { data: pl, isFetching: cargandoPl, error: errorPl } = useQuery({ queryKey: ["preliquidacion-facturar", preliquidacionOrigen], enabled: Boolean(preliquidacionOrigen), queryFn: async () => { const [{ data: p, error }, { data: ls, error: e2 }] = await Promise.all([supabase.from("preliquidaciones").select("*").eq("id", preliquidacionOrigen).single(), supabase.from("preliquidacion_items").select("*").eq("preliquidacion_id", preliquidacionOrigen).order("orden")]); if (error) throw error; if (e2) throw e2; return { p, ls: ls ?? [] }; } });

  useEffect(() => {
    if (!pl || !preliquidacionOrigen || cargado === preliquidacionOrigen || (pl.p.cliente_id && !clientes.length)) return;
    setCargado(preliquidacionOrigen); const p = pl.p; const cliente = clientes.find((c) => c.id === p.cliente_id);
    setForm((f) => ({ ...f, cliente_id: p.cliente_id ?? "", cliente_numero_documento: cliente?.numero_documento ?? "", cliente_razon_social: cliente?.razon_social ?? "", cliente_direccion: cliente?.direccion ?? "", proyecto_id: p.proyecto_id, fecha_emision: hoy(), moneda: p.moneda as "PEN" | "USD", tipo_cambio: String(p.tipo_cambio), condicion_pago: p.condicion_pago, dias_credito: String(p.dias_credito), tipo_tributario: p.tipo_tributario as TipoTributarioCpe, pct_detraccion: String(p.pct_detraccion), codigo_spot: p.tipo_tributario === "detraccion" ? "037" : "", orden_compra: p.concepto, observacion: p.observacion }));
    setItems(pl.ls.map((x) => { const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(x.descripcion); return { codigo: m?.[1]?.replaceAll(".", "") ?? "", descripcion: m?.[2] ?? x.descripcion, unidad_sunat: "ZZ", cantidad: String(x.cantidad), valor_unitario: String(x.precio_unitario), descuento: "0" }; }));
  }, [pl, preliquidacionOrigen, cargado, clientes]);

  const tipo = form.tipo_comprobante as TipoComprobante;
  const tc = form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1;
  const anticipoDeducido = form.anticipo_tipo === "deduccion" ? Number(form.anticipo_monto || 0) : 0;
  const montos = calcularComprobante(items, form.operacion_tipo, tc, form.tipo_tributario, Number(form.pct_detraccion), Number(form.igv_tasa || 18), anticipoDeducido, { isc: Number(form.isc || 0), icbper: Number(form.icbper || 0), otrosCargos: Number(form.otros_cargos || 0), otrosTributos: Number(form.otros_tributos || 0) });
  const totalRegimen = docs.reduce((s, d) => s + Number(d.importe || 0), 0);
  const importeRegimen = Number(((totalRegimen * Number(form.regimen_tasa || 0)) / 100).toFixed(2));
  const filtrados = lista.filter((x) => x.tipo_comprobante === pestana && coincide(busqueda, x.numero, TIPOS_COMPROBANTE[x.tipo_comprobante as TipoComprobante], x.estado_fiscal, clientes.find((c) => c.id === x.cliente_id)?.razon_social));
  // Precarga desde SIRE (+ Emitir en filas "Faltante en ERP")
  useEffect(() => {
    const raw = sessionStorage.getItem("sire-prefill-cpe"); if (!raw) return;
    sessionStorage.removeItem("sire-prefill-cpe");
    try {
      const x = JSON.parse(raw) as { fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string; base: number; igv: number; total: number | null; moneda: string; tipo_cambio: number; vencimiento: string };
      const t = (["01", "03", "07", "08"].includes(x.tipo) ? x.tipo : "01") as TipoComprobante;
      const [serie = "", corr = ""] = x.serie_numero.split("-");
      const cli = clientes.find((c) => c.numero_documento === x.ruc);
      const usd = x.moneda === "USD";
      setPestana(t); setEditando(null); setPreliquidacionOrigen(""); setCargado(""); setError("");
      setForm({ ...nuevoFormCpe(t, serie || SERIE_DEFECTO[t]), correlativo_inicial: String(Number(corr) || ""), fecha_emision: x.fecha, fecha_vencimiento: x.vencimiento || x.fecha, cliente_id: cli?.id ?? "", cliente_numero_documento: x.ruc, cliente_razon_social: cli?.razon_social ?? x.razon, cliente_direccion: cli?.direccion ?? "", moneda: usd ? "USD" : "PEN", tipo_cambio: usd ? String(x.tipo_cambio || 3.75) : "3.750", operacion_tipo: x.igv > 0 ? "gravada" : "exonerada", observacion: `Importado desde SIRE SUNAT: ${x.serie_numero}` });
      setItems([{ ...itemComprobanteVacio(), descripcion: `Comprobante ${x.serie_numero} (registro SIRE)`, cantidad: "1", valor_unitario: String(x.base) }]);
      setDocs([docRelacionadoVacio()]); setCuotas([]); setAbierto(true);
      toast.success(`Datos de ${x.serie_numero} precargados desde SUNAT`);
    } catch { /* ignorar */ }
  }, [clientes.length]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function abrirNuevo(t: TipoComprobante) {
    const serie = series.find((s) => s.tipo_comprobante === t)?.serie ?? SERIE_DEFECTO[t];
    setEditando(null); setError(""); setPreliquidacionOrigen(""); setCargado(""); setForm(nuevoFormCpe(t, serie)); setItems([itemComprobanteVacio()]); setDocs([docRelacionadoVacio()]); setCuotas([]);
    if (t === "01") { setOrigen("libre"); setSeleccionPl(""); setOrigenAbierto(true); setAbierto(false); }
    else if (t === "09") { setOrigenGuia("libre"); setGuiaCliente(""); setGuiaProyecto(""); setOrigenGuiaAbierto(true); setAbierto(false); }
    else setAbierto(true);
  }
  function cambiarTipo(t: TipoComprobante) {
    const serie = series.find((s) => s.tipo_comprobante === t)?.serie ?? SERIE_DEFECTO[t];
    setPestana(t); setForm({ ...form, tipo_comprobante: t, serie, referencia_id: t === "07" || t === "08" ? form.referencia_id : "" });
  }
  function cerrar() { setAbierto(false); setEditando(null); setPreliquidacionOrigen(""); setCargado(""); setForm(nuevoFormCpe(pestana, SERIE_DEFECTO[pestana])); setItems([itemComprobanteVacio()]); setDocs([docRelacionadoVacio()]); setCuotas([]); }

  async function editarBorrador(x: Comprobante) {
    setError(""); setGuardando(true);
    try {
      const [{ data: filas, error: itemsError }, { data: filasCuotas, error: cuotasError }] = await Promise.all([
        supabase.from("comprobante_items").select("*").eq("comprobante_id", x.id).order("orden"),
        supabase.from("comprobante_cuotas").select("*").eq("comprobante_id", x.id).order("numero"),
      ]);
      if (itemsError) throw itemsError;
      if (cuotasError) throw cuotasError;
      const guia = (x.datos_guia ?? {}) as Record<string, string>; const regimen = (x.datos_regimen ?? {}) as Record<string, string>;
      const base = nuevoFormCpe(x.tipo_comprobante as TipoComprobante, x.serie);
      setEditando(x); setPreliquidacionOrigen(""); setCargado(""); setPestana(x.tipo_comprobante as TipoComprobante);
      setForm({ ...base, ...guia, tipo_comprobante: x.tipo_comprobante as TipoComprobante, serie: x.serie, cliente_id: x.cliente_id ?? "", proyecto_id: x.proyecto_id ?? "", referencia_id: x.comprobante_referencia_id ?? "", motivo_nota_codigo: x.motivo_nota_codigo, motivo_nota_descripcion: x.motivo_nota_descripcion, fecha_emision: x.fecha_emision, fecha_vencimiento: x.fecha_vencimiento ?? x.fecha_emision, moneda: x.moneda as "PEN" | "USD", tipo_cambio: String(x.tipo_cambio), operacion_tipo: x.operacion_tipo as OperacionTipo, condicion_pago: x.condicion_pago, dias_credito: String(x.dias_credito), tipo_tributario: x.tipo_tributario as TipoTributarioCpe, pct_detraccion: String(x.pct_detraccion), codigo_spot: x.codigo_spot, orden_compra: x.orden_compra, observacion: x.observacion, cliente_numero_documento: x.cliente_numero_documento ?? "", cliente_razon_social: x.cliente_razon_social ?? "", cliente_direccion: x.cliente_direccion ?? "", cliente_ciudad: x.cliente_ciudad ?? "", cliente_estado_sunat: x.cliente_estado_sunat ?? "", cliente_condicion_sunat: x.cliente_condicion_sunat ?? "", guia_remision_numero: x.guia_remision_numero ?? "", igv_tasa: String(x.igv_tasa ?? 18), anticipo_tipo: x.anticipo_tipo ?? "ninguno", anticipo_documento: x.anticipo_documento ?? "", anticipo_monto: Number(x.anticipo_monto ?? 0) ? String(x.anticipo_monto) : "", isc: String(x.isc ?? 0), icbper: String(x.icbper ?? 0), otros_cargos: String(x.otros_cargos ?? 0), otros_tributos: String(x.otros_tributos ?? 0), regimen_tasa: regimen["tasa"] ?? base.regimen_tasa, motivo_baja: x.motivo_baja ?? base.motivo_baja });
      setItems((filas ?? []).map((i) => ({ codigo: i.codigo, descripcion: i.descripcion, unidad_sunat: i.unidad_sunat, cantidad: String(i.cantidad), valor_unitario: String(i.valor_unitario), descuento: String(i.descuento) })));
      setCuotas((filasCuotas ?? []).map((q) => ({ fecha: q.fecha_vencimiento, monto: String(q.monto) })));
      const rel = (x.documentos_relacionados ?? []) as unknown as DocRelacionado[];
      setDocs(rel.length ? rel : [docRelacionadoVacio()]);
      setAbierto(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el borrador."); } finally { setGuardando(false); }
  }

  async function guardar(emitir: boolean) {
    setError("");
    if (preliquidacionOrigen && (cargandoPl || errorPl || cargado !== preliquidacionOrigen)) return setError("Espera a que se carguen los datos de la preliquidación.");
    if (emitir && form.tipo_comprobante === "09") {
      if (form.guia_modalidad === "01" && !/^\d{11}$/.test(form.guia_transportista_doc.trim())) return setError("Transporte público: elige un transportista con RUC válido.");
      if (form.guia_modalidad === "02" && (!form.guia_placa.trim() || !/^\d{8}$/.test(form.guia_conductor_doc.trim()) || !form.guia_licencia.trim())) return setError("Transporte privado: placa, DNI del conductor y licencia son obligatorios.");
    }
    const validos = items.filter((x) => x.descripcion.trim() && Number(x.cantidad) > 0);
    const relValidos = docs.filter((d) => d.numero.trim() && Number(d.importe) > 0);
    if (!form.cliente_razon_social.trim()) return setError("Indica el nombre o razón social del cliente.");
    if (tipo === "01" && form.cliente_numero_documento.replace(/\D/g, "").length !== 11) return setError("La factura requiere un cliente con RUC de 11 dígitos.");
    if (["01", "03", "07", "08", "09"].includes(tipo) && !validos.length) return setError("Agrega al menos un concepto.");
    if (["20", "40", "RA"].includes(tipo) && !relValidos.length) return setError("Agrega al menos un comprobante relacionado.");
    if ((tipo === "07" || tipo === "08") && !form.referencia_id) return setError("Selecciona el comprobante que modifica la nota.");
    setGuardando(true);
    try {
      const conImportes = usaImportes(tipo);
      const esCredito = conImportes && form.condicion_pago === "Crédito";
      const fechaVenc = form.fecha_vencimiento || (esCredito ? calcularVencimiento(form.fecha_emision, Number(form.dias_credito)) : form.fecha_emision);
      const baseCuotas = Number(montos.netoPagar ?? montos.total);
      const sumaActual = cuotas.reduce((s, q) => s + Number(q.monto || 0), 0);
      const cuotasValidas = cuotas.length > 0 && cuotas.every((q) => Number(q.monto || 0) > 0) && Math.abs(sumaActual - baseCuotas) <= 0.05;
      const listaCuotas = cuotasValidas ? cuotas : repartirCuotas(baseCuotas, cuotas.length ? cuotas.map((q) => q.fecha || fechaVenc) : [fechaVenc]);
      const cuotasPayload = esCredito && baseCuotas > 0 ? listaCuotas.map((q, i) => ({ numero: i + 1, fecha_vencimiento: q.fecha || fechaVenc, monto: Number(q.monto || 0) })).filter((q) => q.monto > 0) : [];
      const totalDoc = conImportes ? montos.total : tipo === "20" || tipo === "40" ? importeRegimen : 0;
      const datosGuia: Record<string, string> = tipo === "09" ? Object.fromEntries(Object.entries(form).filter(([k, v]) => k.startsWith("guia_") && k !== "guia_remision_numero" && typeof v === "string")) as Record<string, string> : {};
      const datosRegimen = tipo === "20" || tipo === "40" ? { tasa: form.regimen_tasa, total_comprobantes: String(totalRegimen), importe: String(importeRegimen) } : {};
      const payload = {
        tipo_comprobante: tipo, serie: form.serie, correlativo_inicial: form.correlativo_inicial ? Number(form.correlativo_inicial) : null, preliquidacion_id: preliquidacionOrigen || editando?.preliquidacion_id || null, proyecto_id: form.proyecto_id || null, cliente_id: form.cliente_id || null,
        comprobante_referencia_id: form.referencia_id || null, motivo_nota_codigo: form.motivo_nota_codigo, motivo_nota_descripcion: form.motivo_nota_descripcion,
        fecha_emision: form.fecha_emision, fecha_vencimiento: fechaVenc, moneda: form.moneda, tipo_cambio: tc, operacion_tipo: form.operacion_tipo,
        cliente_ciudad: form.cliente_ciudad, guia_remision_numero: form.guia_remision_numero, igv_tasa: Number(form.igv_tasa || 18),
        anticipo_tipo: form.anticipo_tipo, anticipo_documento: form.anticipo_tipo === "ninguno" ? "" : form.anticipo_documento, anticipo_monto: conImportes ? montos.anticipo : 0,
        isc: conImportes ? montos.isc : 0, icbper: conImportes ? montos.icbper : 0, otros_cargos: conImportes ? montos.otrosCargos : 0, otros_tributos: conImportes ? montos.otrosTributos : 0, redondeo: conImportes ? montos.redondeo : 0,
        valor_venta: conImportes ? montos.valorVenta : 0, total_descuentos: conImportes ? montos.descuentos : 0, igv: conImportes ? montos.igv : 0,
        total: totalDoc, total_soles: totalDoc * (tc > 0 ? tc : 1), total_letras: montoEnLetras(totalDoc, form.moneda),
        condicion_pago: form.condicion_pago as "Contado" | "Crédito", dias_credito: Number(form.dias_credito || 0),
        tipo_tributario: form.tipo_tributario, codigo_spot: form.codigo_spot, pct_detraccion: Number(form.pct_detraccion || 0),
        monto_detraccion: conImportes ? montos.montoDetraccion : 0, monto_retencion: conImportes ? montos.montoRetencion : 0,
        orden_compra: form.orden_compra, observacion: form.observacion,
        cliente_numero_documento: form.cliente_numero_documento, cliente_razon_social: form.cliente_razon_social, cliente_direccion: form.cliente_direccion, cliente_estado_sunat: form.cliente_estado_sunat, cliente_condicion_sunat: form.cliente_condicion_sunat,
        datos_guia: datosGuia, datos_regimen: datosRegimen, documentos_relacionados: relValidos.map((d) => ({ tipo: d.tipo, serie: d.serie, numero: d.numero, fecha: d.fecha || form.fecha_emision, importe: Number(d.importe || 0) })),
        motivo_baja: tipo === "RA" ? form.motivo_baja : "",
        items: validos.map((x) => { const m = calcularItem(x, form.operacion_tipo, Number(form.igv_tasa || 18)); return { codigo: x.codigo, descripcion: x.descripcion.trim(), unidad_sunat: x.unidad_sunat, ...m, valor_unitario: m.valorUnitario, afectacion_igv: form.operacion_tipo === "gravada" ? ("10" as const) : form.operacion_tipo === "exonerada" ? ("20" as const) : ("30" as const) }; }),
        cuotas: cuotasPayload,
      };
      const res = editando ? await actualizar({ data: { ...payload, id: editando.id } }) : await crear({ data: { ...payload, emitir } });
      qc.invalidateQueries(); cerrar();
      navigate({ to: "/comprobante-vista", search: { id: res.id } });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el comprobante."); } finally { setGuardando(false); }
  }

  async function confirmarEliminar() {
    if (!porEliminar) return; setGuardando(true); setError("");
    try { await eliminar({ data: { id: porEliminar.id } }); await qc.invalidateQueries({ queryKey: ["comprobantes_electronicos"] }); setPorEliminar(null); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar el borrador."); setPorEliminar(null); } finally { setGuardando(false); }
  }

  const tiposVisibles = esGuias ? PESTANAS_CPE.filter((p) => p.tipo === "09") : PESTANAS_CPE;
  const gruposFacturacion = [
    { titulo: "Comprobantes emitidos", icono: ReceiptText, tipos: tiposVisibles.filter((p) => ["01", "03", "07", "08", "09"].includes(p.tipo)) },
    { titulo: "Operaciones especiales", icono: Landmark, tipos: tiposVisibles.filter((p) => ["20", "40", "RA"].includes(p.tipo)) },
  ].filter((g) => g.tipos.length > 0);
  const grupoActivo = gruposFacturacion.find((g) => g.tipos.some((p) => p.tipo === pestana)) ?? gruposFacturacion[0];
  const ETIQUETA_BOTON: Record<string, string> = { "01": "Crear Factura", "03": "Crear Boleta", "07": "Crear Notas de Crédito", "08": "Crear Notas de Débito", "20": "Crear Retenciones", "40": "Crear Percepciones", RA: "Nueva comunicación de baja" };
  return <><Encabezado titulo={esGuias ? "Guías de Remisión" : "Facturación Electrónica"} subtitulo={esGuias ? "Logística · guías de remisión remitente y traslados" : "Comercial · comprobantes, estados SUNAT y cobranza"} acciones={<div className="flex items-center gap-2"><RegistrarVentaExterna abierta={ventaExt} onCerrar={() => setVentaExt(false)} />{!esGuias && (rol === "gerente" || rol === "administrador") && <ConfigDecolecta />}{!esGuias && !abierto && <Boton variante="accion" title="Registrar ventas de facturas emitidas por terceros" onClick={() => setVentaExt(true)}><ReceiptText size={14} />Registrar venta</Boton>}{abierto ? <Boton variante="linea" onClick={cerrar}>Cerrar editor</Boton> : <Boton onClick={() => abrirNuevo(pestana)}><FilePlus2 size={14} />{esGuias ? "Nueva guía de remisión" : ETIQUETA_BOTON[pestana] ?? "Nuevo comprobante"}</Boton>}</div>} />
    <div className={`flex flex-col ${abierto ? "md:h-[calc(100dvh-3rem)] md:-my-3 md:min-h-0 md:overflow-hidden" : ""}`}>
    {!esGuias && <>
      <div className="mb-3 flex flex-wrap gap-1">
        {gruposFacturacion.map((g) => {
          const Icono = g.icono;
          const activo = g === grupoActivo;
          return <Boton key={g.titulo} variante={activo ? "primario" : "linea"} onClick={() => {
            const primero = g.tipos[0];
            if (!primero) return;
            setPestana(primero.tipo as TipoComprobante); if (abierto) cambiarTipo(primero.tipo as TipoComprobante);
          }}><Icono size={13} />{g.titulo}</Boton>;
        })}
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        {grupoActivo?.tipos.map((p) => {
          const activo = pestana === p.tipo;
          return <button key={p.tipo} type="button" onClick={() => {
            setPestana(p.tipo as TipoComprobante); if (abierto) cambiarTipo(p.tipo as TipoComprobante);
          }} className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${activo ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}>{p.etiqueta}</button>;
        })}
      </div>
    </>}


    <VentanaFlotante titulo="Crear factura" abierta={origenAbierto} onCerrar={() => setOrigenAbierto(false)} ancho="max-w-xl">
      <div className="space-y-4 p-5">
        <div className="flex gap-2" role="group" aria-label="Origen de la factura">
          <Boton variante={origen === "libre" ? "primario" : "linea"} aria-pressed={origen === "libre"} onClick={() => setOrigen("libre")}><FilePlus2 size={14} />Factura libre</Boton>
          <Boton variante={origen === "preliquidacion" ? "primario" : "linea"} aria-pressed={origen === "preliquidacion"} onClick={() => setOrigen("preliquidacion")}><ReceiptText size={14} />Desde preliquidación</Boton>
        </div>
        {origen === "preliquidacion" && <Campo etiqueta="Preliquidación aprobada">
          <Select aria-label="Preliquidación aprobada" value={seleccionPl} onChange={(e) => setSeleccionPl(e.target.value)} disabled={buscandoPl}>
            <option value="">{buscandoPl ? "Cargando…" : "Selecciona una preliquidación"}</option>
            {preliquidacionesDisponibles.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {clientes.find((c) => c.id === p.cliente_id)?.razon_social ?? proyectos.find((x) => x.id === p.proyecto_id)?.nombre ?? ""} · {p.concepto}</option>)}
          </Select>
          {errorListaPl && <p role="alert" className="mt-2 text-xs text-bad">No se pudieron cargar las preliquidaciones.</p>}
          {!buscandoPl && !errorListaPl && !preliquidacionesDisponibles.length && <p className="mt-2 text-xs text-muted-foreground">No hay preliquidaciones aprobadas pendientes de facturar.</p>}
        </Campo>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Boton variante="linea" onClick={() => setOrigenAbierto(false)}>Cancelar</Boton>
          <Boton disabled={origen === "preliquidacion" && (!seleccionPl || buscandoPl || Boolean(errorListaPl))} onClick={() => { setPreliquidacionOrigen(origen === "preliquidacion" ? seleccionPl : ""); setOrigenAbierto(false); setAbierto(true); }}>{origen === "preliquidacion" ? "Cargar datos" : "Continuar"}</Boton>
        </div>
      </div>
    </VentanaFlotante>
    <VentanaFlotante titulo="Crear guía de remisión" abierta={origenGuiaAbierto} onCerrar={() => setOrigenGuiaAbierto(false)} ancho="max-w-xl">
      <div className="space-y-4 p-5">
        <div className="flex gap-2" role="group" aria-label="Origen de la guía">
          <Boton variante={origenGuia === "libre" ? "primario" : "linea"} aria-pressed={origenGuia === "libre"} onClick={() => setOrigenGuia("libre")}><FilePlus2 size={14} />Libre</Boton>
          <Boton variante={origenGuia === "cliente" ? "primario" : "linea"} aria-pressed={origenGuia === "cliente"} onClick={() => setOrigenGuia("cliente")}><ReceiptText size={14} />Cliente</Boton>
        </div>
        {origenGuia === "cliente" && <div className="grid gap-3">
          <Campo etiqueta="Cliente"><Select aria-label="Cliente" value={guiaCliente} onChange={(e) => setGuiaCliente(e.target.value)}><option value="">Selecciona un cliente</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</Select></Campo>
          <Campo etiqueta="Proyecto (opcional)"><Select aria-label="Proyecto" value={guiaProyecto} onChange={(e) => setGuiaProyecto(e.target.value)}><option value="">Sin proyecto</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</Select></Campo>
          <p className="text-xs text-muted-foreground">Con proyecto podrás cargar sus partidas en el detalle de la guía.</p>
        </div>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Boton variante="linea" onClick={() => setOrigenGuiaAbierto(false)}>Cancelar</Boton>
          <Boton disabled={origenGuia === "cliente" && !guiaCliente} onClick={() => {
            const c = clientes.find((x) => x.id === guiaCliente);
            setForm((f) => origenGuia === "cliente" && c ? { ...f, guia_origen: "cliente", cliente_id: c.id, cliente_numero_documento: c.numero_documento, cliente_razon_social: c.razon_social, cliente_direccion: c.direccion ?? "", proyecto_id: guiaProyecto } : { ...f, guia_origen: "libre" });
            setOrigenGuiaAbierto(false); setAbierto(true);
          }}>Continuar</Boton>
        </div>
      </div>
    </VentanaFlotante>
    {abierto && <div className="-mx-3 flex flex-1 flex-col bg-background sm:-mx-4 md:min-h-0">
      <Panel
        titulo={editando ? `Editar borrador ${editando.numero}` : preliquidacionOrigen ? `Facturar preliquidación ${pl?.p.codigo ?? ""}` : esGuias ? "Nueva guía de remisión" : "Nuevo comprobante electrónico"}
        extra={<Boton variante="linea" onClick={cerrar}>Cerrar editor</Boton>}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/60 px-4 py-2 sm:px-6">
        {preliquidacionOrigen && cargandoPl && <p role="status" className="py-2 text-sm text-muted-foreground">Cargando preliquidación…</p>}
        {errorPl && <p role="alert" className="py-2 text-sm text-bad">No se pudo cargar la preliquidación: {errorPl.message}</p>}
        <HojaComprobante form={form} setForm={setForm} items={items} setItems={setItems} docs={docs} setDocs={setDocs} cuotas={cuotas} setCuotas={setCuotas} empresa={empresa} clientes={clientes} proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre, codigo: p.codigo ?? "" }))} refs={refs} series={series} numeroPreview={editando ? String(editando.correlativo).padStart(8, "0") : "[AUTOGENERADO]"} montos={montos} totalRegimen={totalRegimen} importeRegimen={importeRegimen} onTipoChange={cambiarTipo} bloqueado={Boolean(editando)} tipos={tiposVisibles} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-card p-3">
        <Boton disabled={guardando} onClick={() => void guardar(false)}>{editando ? "Guardar cambios" : "Guardar borrador"}</Boton>
        {!editando && <Boton variante="accion" disabled={guardando} onClick={() => void guardar(true)}><ReceiptText size={14} />Emitir comprobante</Boton>}
        <Boton variante="linea" type="button" onClick={cerrar}>Cancelar</Boton>
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
      </Panel>
    </div>}
    </div>}

    {!abierto && <div className="flex items-start gap-3"><Panel className="min-w-0 flex-1" titulo={PESTANAS_CPE.find((p) => p.tipo === pestana)?.etiqueta ?? "Comprobantes"}>
      {filtrados.length === 0 ? <Vacio texto="Aún no hay documentos de este tipo." /> : <div className="overflow-x-auto"><table className="w-full font-mono text-xs"><thead><tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground"><th className="px-5 py-2">Comprobante</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Emisión</th><th className="px-3 py-2">Condición</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Estado fiscal</th></tr></thead><tbody>{filtrados.map((x) => <tr key={x.id} onClick={() => setSel(x.id)} onDoubleClick={() => { if (x.estado_fiscal === "Borrador") void editarBorrador(x); }} className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel === x.id ? "bg-primary/10" : ""}`}>
        <td className="px-5 py-2.5"><b><Resaltar texto={x.numero} termino={busqueda} /></b><div className="text-[10px] text-muted-foreground">{TIPOS_COMPROBANTE[x.tipo_comprobante as TipoComprobante]}</div></td>
        <td className="px-3 py-2.5">{x.cliente_razon_social || clientes.find((c) => c.id === x.cliente_id)?.razon_social || "—"}</td>
        <td className="px-3 py-2.5">{fmtFecha(x.fecha_emision)}</td>
        <td className="px-3 py-2.5">{x.condicion_pago}</td>
        <td className="px-3 py-2.5 text-right font-semibold">{x.moneda === "USD" ? `US$ ${Number(x.total).toFixed(2)}` : soles(Number(x.total))}</td>
        <td className="px-3 py-2.5"><Etiqueta tono={x.estado_fiscal === "Aceptado con CDR" ? "good" : x.estado_fiscal === "Rechazado" ? "bad" : "neutro"}>{x.estado_fiscal}</Etiqueta></td>
        
      </tr>)}</tbody></table></div>}
    </Panel><BarraIconosHoja objeto="borrador" filtros={<MenuFiltros activos={busqueda ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={filtrados.length} placeholder="Buscar número, cliente o estado..." /></MenuFiltros>} haySeleccion={filtrados.some((x) => x.id === sel && x.estado_fiscal === "Borrador")} onEditar={() => { const x = filtrados.find((x) => x.id === sel); if (x?.estado_fiscal === "Borrador") void editarBorrador(x); }} onEliminar={() => { const x = filtrados.find((x) => x.id === sel); if (x?.estado_fiscal === "Borrador") setPorEliminar(x); }} extras={<BotonIcono etiqueta="Vista previa" disabled={!filtrados.some((x) => x.id === sel)} onClick={() => { void navigate({ to: "/comprobante-vista", search: { id: sel } }); }}><Eye size={15} /></BotonIcono>} /></div>}
    <AlertDialog open={Boolean(porEliminar)} onOpenChange={(open) => { if (!open) setPorEliminar(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar borrador</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente el comprobante {porEliminar?.numero}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={guardando} onClick={() => void confirmarEliminar()} className="bg-bad text-paper hover:bg-bad/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

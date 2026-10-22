import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { BotonIcono } from "@/components/ui-kit";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FilePlus2, Landmark, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Encabezado } from "@/components/AppShell";
import { Boton, Etiqueta, Panel, SinAcceso, Vacio } from "@/components/ui-kit";
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
  const [form, setForm] = useState<FormCpe>(() => nuevoFormCpe(pestanaInicial, SERIE_DEFECTO[pestanaInicial]));
  const [items, setItems] = useState<ItemEditor[]>([itemComprobanteVacio()]);
  const [docs, setDocs] = useState<DocRelacionado[]>([docRelacionadoVacio()]);
  const [cuotas, setCuotas] = useState<CuotaEditor[]>([]);
  const [busqueda, setBusqueda] = useState(""); const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false); const [cargado, setCargado] = useState("");
  const [ventaExt, setVentaExt] = useState(false);
  const [editando, setEditando] = useState<Comprobante | null>(null); const [porEliminar, setPorEliminar] = useState<Comprobante | null>(null);

  const { data: empresa } = useEmpresa();
  const { data: clientes = [] } = useQuery({ queryKey: ["terceros", "clientes-cpe"], queryFn: async () => { const { data, error } = await supabase.from("terceros").select("id,razon_social,numero_documento,direccion,tipo_documento").eq("es_cliente", true).eq("activo", true).order("razon_social"); if (error) throw error; return data ?? []; } });
  const { data: proyectos = [] } = useQuery({ queryKey: ["proyectos"], queryFn: async () => { const { data, error } = await supabase.from("proyectos").select("id,nombre,codigo").order("nombre"); if (error) throw error; return data ?? []; } });
  const { data: series = [] } = useQuery({ queryKey: ["series_comprobante"], queryFn: async () => { const { data, error } = await supabase.from("series_comprobante").select("*").eq("activo", true).order("serie"); if (error) throw error; return data ?? []; } });
  const { data: lista = [] } = useQuery({ queryKey: ["comprobantes_electronicos"], queryFn: async () => { const { data, error } = await supabase.from("comprobantes_electronicos").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as Comprobante[]; } });
  const { data: refs = [] } = useQuery({ queryKey: ["comprobantes-referencia"], queryFn: async () => { const { data, error } = await supabase.from("comprobantes_electronicos").select("id,numero,tipo_comprobante,total").in("tipo_comprobante", ["01", "03"]).neq("estado_fiscal", "Borrador").order("fecha_emision", { ascending: false }); if (error) throw error; return data ?? []; } });
  const { data: pl } = useQuery({ queryKey: ["preliquidacion-facturar", preliquidacion], enabled: Boolean(preliquidacion), queryFn: async () => { const [{ data: p, error }, { data: ls, error: e2 }] = await Promise.all([supabase.from("preliquidaciones").select("*").eq("id", preliquidacion).single(), supabase.from("preliquidacion_items").select("*").eq("preliquidacion_id", preliquidacion).order("orden")]); if (error) throw error; if (e2) throw e2; return { p, ls: ls ?? [] }; } });

  if (pl && cargado !== preliquidacion) {
    setCargado(preliquidacion); const p = pl.p; const cliente = clientes.find((c) => c.id === p.cliente_id);
    setForm((f) => ({ ...f, cliente_id: p.cliente_id ?? "", cliente_numero_documento: cliente?.numero_documento ?? "", cliente_razon_social: cliente?.razon_social ?? "", cliente_direccion: cliente?.direccion ?? "", proyecto_id: p.proyecto_id, fecha_emision: hoy(), moneda: p.moneda as "PEN" | "USD", tipo_cambio: String(p.tipo_cambio), condicion_pago: p.condicion_pago, dias_credito: String(p.dias_credito), tipo_tributario: p.tipo_tributario as TipoTributarioCpe, pct_detraccion: String(p.pct_detraccion), codigo_spot: p.tipo_tributario === "detraccion" ? "037" : "", orden_compra: p.concepto, observacion: p.observacion }));
    setItems(pl.ls.map((x) => { const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(x.descripcion); return { codigo: m?.[1]?.replaceAll(".", "") ?? "", descripcion: m?.[2] ?? x.descripcion, unidad_sunat: "ZZ", cantidad: String(x.cantidad), valor_unitario: String(x.precio_unitario), descuento: "0" }; }));
  }

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
      setPestana(t); setEditando(null); setError("");
      setForm({ ...nuevoFormCpe(t, serie || SERIE_DEFECTO[t]), correlativo_inicial: String(Number(corr) || ""), fecha_emision: x.fecha, fecha_vencimiento: x.vencimiento || x.fecha, cliente_id: cli?.id ?? "", cliente_numero_documento: x.ruc, cliente_razon_social: cli?.razon_social ?? x.razon, cliente_direccion: cli?.direccion ?? "", moneda: usd ? "USD" : "PEN", tipo_cambio: usd ? String(x.tipo_cambio || 3.75) : "3.750", operacion_tipo: x.igv > 0 ? "gravada" : "exonerada", observacion: `Importado desde SIRE SUNAT: ${x.serie_numero}` });
      setItems([{ ...itemComprobanteVacio(), descripcion: `Comprobante ${x.serie_numero} (registro SIRE)`, cantidad: "1", valor_unitario: String(x.base) }]);
      setDocs([docRelacionadoVacio()]); setCuotas([]); setAbierto(true);
      toast.success(`Datos de ${x.serie_numero} precargados desde SUNAT`);
    } catch { /* ignorar */ }
  }, [clientes.length]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function abrirNuevo(t: TipoComprobante) {
    const serie = series.find((s) => s.tipo_comprobante === t)?.serie ?? SERIE_DEFECTO[t];
    setEditando(null); setError(""); setForm(nuevoFormCpe(t, serie)); setItems([itemComprobanteVacio()]); setDocs([docRelacionadoVacio()]); setCuotas([]); setAbierto(true);
  }
  function cambiarTipo(t: TipoComprobante) {
    const serie = series.find((s) => s.tipo_comprobante === t)?.serie ?? SERIE_DEFECTO[t];
    setPestana(t); setForm({ ...form, tipo_comprobante: t, serie, referencia_id: t === "07" || t === "08" ? form.referencia_id : "" });
  }
  function cerrar() { setAbierto(false); setEditando(null); setForm(nuevoFormCpe(pestana, SERIE_DEFECTO[pestana])); setItems([itemComprobanteVacio()]); setDocs([docRelacionadoVacio()]); setCuotas([]); }

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
      setEditando(x); setPestana(x.tipo_comprobante as TipoComprobante);
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
      const datosGuia = tipo === "09" ? { guia_motivo: form.guia_motivo, guia_modalidad: form.guia_modalidad, guia_fecha_traslado: form.guia_fecha_traslado, guia_transportista: form.guia_transportista, guia_transportista_doc: form.guia_transportista_doc, guia_placa: form.guia_placa, guia_licencia: form.guia_licencia, guia_peso: form.guia_peso, guia_bultos: form.guia_bultos, guia_partida: form.guia_partida, guia_partida_ubigeo: form.guia_partida_ubigeo, guia_llegada: form.guia_llegada, guia_llegada_ubigeo: form.guia_llegada_ubigeo } : {};
      const datosRegimen = tipo === "20" || tipo === "40" ? { tasa: form.regimen_tasa, total_comprobantes: String(totalRegimen), importe: String(importeRegimen) } : {};
      const payload = {
        tipo_comprobante: tipo, serie: form.serie, correlativo_inicial: form.correlativo_inicial ? Number(form.correlativo_inicial) : null, preliquidacion_id: preliquidacion || editando?.preliquidacion_id || null, proyecto_id: form.proyecto_id || null, cliente_id: form.cliente_id || null,
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
    { titulo: "Compras recibidas", icono: ShoppingBag, tipos: [{ tipo: "recibidos", etiqueta: "Recibidos (compras)" }] },
  ].filter((g) => g.tipos.length > 0);
  const grupoActivo = gruposFacturacion.find((g) => vista === "recibidos" ? g.tipos.some((p) => p.tipo === "recibidos") : g.tipos.some((p) => p.tipo === pestana)) ?? gruposFacturacion[0];
  const ETIQUETA_BOTON: Record<string, string> = { "01": "Crear Factura", "03": "Crear Boleta", "07": "Crear Notas de Crédito", "08": "Crear Notas de Débito", "20": "Crear Retenciones", "40": "Crear Percepciones", RA: "Nueva comunicación de baja" };
  return <><Encabezado titulo={esGuias ? "Guías de Remisión" : "Facturación Electrónica"} subtitulo={esGuias ? "Logística · guías de remisión remitente y traslados" : "Comercial · comprobantes, estados SUNAT y cobranza"} acciones={<div className="flex items-center gap-2"><RegistrarVentaExterna abierta={ventaExt} onCerrar={() => setVentaExt(false)} />{!esGuias && (rol === "gerente" || rol === "administrador") && <ConfigDecolecta />}{!esGuias && vista !== "recibidos" && !abierto && <Boton variante="accion" title="Registrar ventas de facturas emitidas por terceros" onClick={() => setVentaExt(true)}><ReceiptText size={14} />Registrar venta</Boton>}{vista === "recibidos" ? null : abierto ? <Boton variante="linea" onClick={cerrar}>Cerrar editor</Boton> : <Boton onClick={() => abrirNuevo(pestana)}><FilePlus2 size={14} />{esGuias ? "Nueva guía de remisión" : ETIQUETA_BOTON[pestana] ?? "Nuevo comprobante"}</Boton>}</div>} />
    {!esGuias && <>
      <div className="mb-3 flex flex-wrap gap-1">
        {gruposFacturacion.map((g) => {
          const Icono = g.icono;
          const activo = g === grupoActivo;
          return <Boton key={g.titulo} variante={activo ? "primario" : "linea"} onClick={() => {
            const primero = g.tipos[0];
            if (!primero) return;
            if (primero.tipo === "recibidos") setVista("recibidos");
            else { setVista("emitidos"); setPestana(primero.tipo as TipoComprobante); if (abierto) cambiarTipo(primero.tipo as TipoComprobante); }
          }}><Icono size={13} />{g.titulo}</Boton>;
        })}
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        {grupoActivo?.tipos.map((p) => {
          const activo = p.tipo === "recibidos" ? vista === "recibidos" : vista === "emitidos" && pestana === p.tipo;
          return <button key={p.tipo} type="button" onClick={() => {
            if (p.tipo === "recibidos") setVista("recibidos");
            else { setVista("emitidos"); setPestana(p.tipo as TipoComprobante); if (abierto) cambiarTipo(p.tipo as TipoComprobante); }
          }} className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${activo ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}>{p.etiqueta}</button>;
        })}
      </div>
    </>}

    {vista === "recibidos" && !esGuias ? <ComprobantesCompras /> : <>

    {abierto && <div className="-mx-4 -my-6 min-h-full bg-background sm:-mx-6">
      <Panel
        titulo={editando ? `Editar borrador ${editando.numero}` : preliquidacion ? "Facturar preliquidación" : esGuias ? "Nueva guía de remisión" : "Nuevo comprobante electrónico"}
        extra={<Boton variante="linea" onClick={cerrar}>Cerrar editor</Boton>}
        className="min-h-full"
      >
      <div className="bg-muted/60 px-4 py-2 sm:px-6">
        <HojaComprobante form={form} setForm={setForm} items={items} setItems={setItems} docs={docs} setDocs={setDocs} cuotas={cuotas} setCuotas={setCuotas} empresa={empresa} clientes={clientes} proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre, codigo: p.codigo ?? "" }))} refs={refs} series={series} numeroPreview={editando ? String(editando.correlativo).padStart(8, "0") : "[AUTOGENERADO]"} montos={montos} totalRegimen={totalRegimen} importeRegimen={importeRegimen} onTipoChange={cambiarTipo} bloqueado={Boolean(editando)} tipos={tiposVisibles} />
      </div>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-line bg-card/95 p-4 shadow-lg backdrop-blur">
        <Boton disabled={guardando} onClick={() => void guardar(false)}>{editando ? "Guardar cambios" : "Guardar borrador"}</Boton>
        {!editando && <Boton variante="accion" disabled={guardando} onClick={() => void guardar(true)}><ReceiptText size={14} />Emitir comprobante</Boton>}
        <Boton variante="linea" type="button" onClick={cerrar}>Cancelar</Boton>
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
      </Panel>
    </div>}

    <div className="flex items-start gap-3"><Panel className="min-w-0 flex-1" titulo={PESTANAS_CPE.find((p) => p.tipo === pestana)?.etiqueta ?? "Comprobantes"} extra={<Buscador valor={busqueda} onChange={setBusqueda} total={filtrados.length} placeholder="Buscar número, cliente o estado..." />}>
      {filtrados.length === 0 ? <Vacio texto="Aún no hay documentos de este tipo." /> : <div className="overflow-x-auto"><table className="w-full font-mono text-xs"><thead><tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground"><th className="px-5 py-2">Comprobante</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Emisión</th><th className="px-3 py-2">Condición</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Estado fiscal</th></tr></thead><tbody>{filtrados.map((x) => <tr key={x.id} onClick={() => setSel(x.id)} onDoubleClick={() => { if (x.estado_fiscal === "Borrador") void editarBorrador(x); }} className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel === x.id ? "bg-primary/10" : ""}`}>
        <td className="px-5 py-2.5"><b><Resaltar texto={x.numero} termino={busqueda} /></b><div className="text-[10px] text-muted-foreground">{TIPOS_COMPROBANTE[x.tipo_comprobante as TipoComprobante]}</div></td>
        <td className="px-3 py-2.5">{x.cliente_razon_social || clientes.find((c) => c.id === x.cliente_id)?.razon_social || "—"}</td>
        <td className="px-3 py-2.5">{fmtFecha(x.fecha_emision)}</td>
        <td className="px-3 py-2.5">{x.condicion_pago}</td>
        <td className="px-3 py-2.5 text-right font-semibold">{x.moneda === "USD" ? `US$ ${Number(x.total).toFixed(2)}` : soles(Number(x.total))}</td>
        <td className="px-3 py-2.5"><Etiqueta tono={x.estado_fiscal === "Aceptado con CDR" ? "good" : x.estado_fiscal === "Rechazado" ? "bad" : "neutro"}>{x.estado_fiscal}</Etiqueta></td>
        
      </tr>)}</tbody></table></div>}
    </Panel><BarraIconosHoja objeto="borrador" haySeleccion={filtrados.some((x) => x.id === sel && x.estado_fiscal === "Borrador")} onEditar={() => { const x = filtrados.find((x) => x.id === sel); if (x?.estado_fiscal === "Borrador") void editarBorrador(x); }} onEliminar={() => { const x = filtrados.find((x) => x.id === sel); if (x?.estado_fiscal === "Borrador") setPorEliminar(x); }} extras={<BotonIcono etiqueta="Vista previa" disabled={!filtrados.some((x) => x.id === sel)} onClick={() => { void navigate({ to: "/comprobante-vista", search: { id: sel } }); }}><Eye size={15} /></BotonIcono>} /></div>
    </>}
    <AlertDialog open={Boolean(porEliminar)} onOpenChange={(open) => { if (!open) setPorEliminar(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar borrador</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente el comprobante {porEliminar?.numero}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={guardando} onClick={() => void confirmarEliminar()} className="bg-bad text-paper hover:bg-bad/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

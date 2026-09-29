import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FilePlus2, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Encabezado } from "@/components/AppShell";
import { Boton, Etiqueta, Panel, SinAcceso, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { calcularVencimiento } from "@/components/CondicionPago";
import { HojaComprobante, nuevoFormCpe, type FormCpe } from "@/components/facturacion/HojaComprobante";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { calcularComprobante, calcularItem, docRelacionadoVacio, itemComprobanteVacio, montoEnLetras, PESTANAS_CPE, repartirCuotas, SERIE_DEFECTO, TIPOS_COMPROBANTE, usaImportes, type Comprobante, type CuotaEditor, type DocRelacionado, type ItemEditor, type OperacionTipo, type TipoComprobante, type TipoTributarioCpe } from "@/lib/facturacion";
import { actualizarBorradorComprobante, crearComprobanteElectronico, eliminarBorradorComprobante } from "@/lib/facturacion.functions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/facturacion-electronica")({ validateSearch: (s: Record<string, unknown>) => ({ preliquidacion: typeof s["preliquidacion"] === "string" ? s["preliquidacion"] : "" }), head: () => ({ meta: [{ title: "Facturación Electrónica — ERP TELXEN" }, { name: "description", content: "Emisión y control de facturas, boletas, notas, guías y comprobantes de retención y percepción." }, { property: "og:title", content: "Facturación Electrónica — ERP TELXEN" }, { property: "og:description", content: "Comprobantes electrónicos, estados fiscales y cobranza." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: FacturacionElectronica });

function FacturacionElectronica() {
  const { rol } = useAuth(); const { preliquidacion } = Route.useSearch(); const navigate = useNavigate(); const qc = useQueryClient();
  const crear = useServerFn(crearComprobanteElectronico); const actualizar = useServerFn(actualizarBorradorComprobante); const eliminar = useServerFn(eliminarBorradorComprobante);
  const [pestana, setPestana] = useState<TipoComprobante>("01");
  const [abierto, setAbierto] = useState(Boolean(preliquidacion));
  const [form, setForm] = useState<FormCpe>(() => nuevoFormCpe("01", SERIE_DEFECTO["01"]));
  const [items, setItems] = useState<ItemEditor[]>([itemComprobanteVacio()]);
  const [docs, setDocs] = useState<DocRelacionado[]>([docRelacionadoVacio()]);
  const [cuotas, setCuotas] = useState<CuotaEditor[]>([]);
  const [busqueda, setBusqueda] = useState(""); const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false); const [cargado, setCargado] = useState("");
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
  const montos = calcularComprobante(items, form.operacion_tipo, tc, form.tipo_tributario, Number(form.pct_detraccion), Number(form.igv_tasa || 18), anticipoDeducido);
  const totalRegimen = docs.reduce((s, d) => s + Number(d.importe || 0), 0);
  const importeRegimen = Number(((totalRegimen * Number(form.regimen_tasa || 0)) / 100).toFixed(2));
  const filtrados = lista.filter((x) => x.tipo_comprobante === pestana && coincide(busqueda, x.numero, TIPOS_COMPROBANTE[x.tipo_comprobante as TipoComprobante], x.estado_fiscal, clientes.find((c) => c.id === x.cliente_id)?.razon_social));
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
      setForm({ ...base, ...guia, tipo_comprobante: x.tipo_comprobante as TipoComprobante, serie: x.serie, cliente_id: x.cliente_id ?? "", proyecto_id: x.proyecto_id ?? "", referencia_id: x.comprobante_referencia_id ?? "", motivo_nota_codigo: x.motivo_nota_codigo, motivo_nota_descripcion: x.motivo_nota_descripcion, fecha_emision: x.fecha_emision, fecha_vencimiento: x.fecha_vencimiento ?? x.fecha_emision, moneda: x.moneda as "PEN" | "USD", tipo_cambio: String(x.tipo_cambio), operacion_tipo: x.operacion_tipo as OperacionTipo, condicion_pago: x.condicion_pago, dias_credito: String(x.dias_credito), tipo_tributario: x.tipo_tributario as TipoTributarioCpe, pct_detraccion: String(x.pct_detraccion), codigo_spot: x.codigo_spot, orden_compra: x.orden_compra, observacion: x.observacion, cliente_numero_documento: x.cliente_numero_documento ?? "", cliente_razon_social: x.cliente_razon_social ?? "", cliente_direccion: x.cliente_direccion ?? "", cliente_ciudad: x.cliente_ciudad ?? "", cliente_estado_sunat: x.cliente_estado_sunat ?? "", cliente_condicion_sunat: x.cliente_condicion_sunat ?? "", guia_remision_numero: x.guia_remision_numero ?? "", igv_tasa: String(x.igv_tasa ?? 18), anticipo_tipo: x.anticipo_tipo ?? "ninguno", anticipo_documento: x.anticipo_documento ?? "", anticipo_monto: Number(x.anticipo_monto ?? 0) ? String(x.anticipo_monto) : "", regimen_tasa: regimen["tasa"] ?? base.regimen_tasa, motivo_baja: x.motivo_baja ?? base.motivo_baja });
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
      const listaCuotas = cuotas.length ? cuotas : repartirCuotas(montos.total, [fechaVenc]);
      const cuotasPayload = esCredito ? listaCuotas.map((q, i) => ({ numero: i + 1, fecha_vencimiento: q.fecha || fechaVenc, monto: Number(q.monto || 0) })) : [];
      const totalDoc = conImportes ? montos.total : tipo === "20" || tipo === "40" ? importeRegimen : 0;
      const datosGuia = tipo === "09" ? { guia_motivo: form.guia_motivo, guia_modalidad: form.guia_modalidad, guia_fecha_traslado: form.guia_fecha_traslado, guia_transportista: form.guia_transportista, guia_transportista_doc: form.guia_transportista_doc, guia_placa: form.guia_placa, guia_licencia: form.guia_licencia, guia_peso: form.guia_peso, guia_bultos: form.guia_bultos, guia_partida: form.guia_partida, guia_partida_ubigeo: form.guia_partida_ubigeo, guia_llegada: form.guia_llegada, guia_llegada_ubigeo: form.guia_llegada_ubigeo } : {};
      const datosRegimen = tipo === "20" || tipo === "40" ? { tasa: form.regimen_tasa, total_comprobantes: String(totalRegimen), importe: String(importeRegimen) } : {};
      const payload = {
        tipo_comprobante: tipo, serie: form.serie, correlativo_inicial: form.correlativo_inicial ? Number(form.correlativo_inicial) : null, preliquidacion_id: preliquidacion || editando?.preliquidacion_id || null, proyecto_id: form.proyecto_id || null, cliente_id: form.cliente_id || null,
        comprobante_referencia_id: form.referencia_id || null, motivo_nota_codigo: form.motivo_nota_codigo, motivo_nota_descripcion: form.motivo_nota_descripcion,
        fecha_emision: form.fecha_emision, fecha_vencimiento: fechaVenc, moneda: form.moneda, tipo_cambio: tc, operacion_tipo: form.operacion_tipo,
        cliente_ciudad: form.cliente_ciudad, guia_remision_numero: form.guia_remision_numero, igv_tasa: Number(form.igv_tasa || 18),
        anticipo_tipo: form.anticipo_tipo, anticipo_documento: form.anticipo_tipo === "ninguno" ? "" : form.anticipo_documento, anticipo_monto: conImportes ? montos.anticipo : 0,
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

  return <><Encabezado titulo="Facturación Electrónica" subtitulo="Comercial · comprobantes, estados SUNAT y cobranza" acciones={abierto ? <Boton variante="linea" onClick={cerrar}>Cerrar editor</Boton> : <Boton onClick={() => abrirNuevo(pestana)}><FilePlus2 size={14} />Nuevo {PESTANAS_CPE.find((p) => p.tipo === pestana)?.corto.toLowerCase()}</Boton>} />
    <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
      {PESTANAS_CPE.map((p) => <button key={p.tipo} type="button" onClick={() => { setPestana(p.tipo); if (abierto) cambiarTipo(p.tipo); }} className={`rounded-t-md px-3 py-2 text-xs font-medium transition ${pestana === p.tipo ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>{p.etiqueta}</button>)}
    </div>

    {abierto && <Panel titulo={editando ? `Editar borrador ${editando.numero}` : preliquidacion ? "Facturar preliquidación" : "Nuevo comprobante electrónico"} className="mb-4">
      <div className="bg-slate-900/95 p-5">
        <HojaComprobante form={form} setForm={setForm} items={items} setItems={setItems} docs={docs} setDocs={setDocs} empresa={empresa} clientes={clientes} proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre, codigo: p.codigo ?? "" }))} refs={refs} series={series} numeroPreview={editando ? String(editando.correlativo).padStart(8, "0") : "[AUTOGENERADO]"} montos={montos} totalRegimen={totalRegimen} importeRegimen={importeRegimen} onTipoChange={cambiarTipo} bloqueado={Boolean(editando)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
        <Boton disabled={guardando} onClick={() => void guardar(false)}>{editando ? "Guardar cambios" : "Guardar borrador"}</Boton>
        {!editando && <Boton variante="accion" disabled={guardando} onClick={() => void guardar(true)}><ReceiptText size={14} />Emitir comprobante</Boton>}
        <Boton variante="linea" type="button" onClick={cerrar}>Cancelar</Boton>
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
    </Panel>}

    <Panel titulo={PESTANAS_CPE.find((p) => p.tipo === pestana)?.etiqueta ?? "Comprobantes"} extra={<Buscador valor={busqueda} onChange={setBusqueda} total={filtrados.length} placeholder="Buscar número, cliente o estado..." />}>
      {filtrados.length === 0 ? <Vacio texto="Aún no hay documentos de este tipo." /> : <div className="overflow-x-auto"><table className="w-full font-mono text-xs"><thead><tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground"><th className="px-5 py-2">Comprobante</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Emisión</th><th className="px-3 py-2">Condición</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Estado fiscal</th><th className="px-5 py-2" /></tr></thead><tbody>{filtrados.map((x) => <tr key={x.id} className="border-b border-line/60">
        <td className="px-5 py-2.5"><b><Resaltar texto={x.numero} termino={busqueda} /></b><div className="text-[10px] text-muted-foreground">{TIPOS_COMPROBANTE[x.tipo_comprobante as TipoComprobante]}</div></td>
        <td className="px-3 py-2.5">{x.cliente_razon_social || clientes.find((c) => c.id === x.cliente_id)?.razon_social || "—"}</td>
        <td className="px-3 py-2.5">{fmtFecha(x.fecha_emision)}</td>
        <td className="px-3 py-2.5">{x.condicion_pago}</td>
        <td className="px-3 py-2.5 text-right font-semibold">{x.moneda === "USD" ? `US$ ${Number(x.total).toFixed(2)}` : soles(Number(x.total))}</td>
        <td className="px-3 py-2.5"><Etiqueta tono={x.estado_fiscal === "Aceptado con CDR" ? "good" : x.estado_fiscal === "Rechazado" ? "bad" : "neutro"}>{x.estado_fiscal}</Etiqueta></td>
        <td className="px-5 py-2.5 text-right"><TooltipProvider delayDuration={200}><div className="inline-flex gap-1">
          <Tooltip><TooltipTrigger asChild><Link to="/comprobante-vista" search={{ id: x.id }} aria-label={`Vista previa de ${x.numero}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:text-primary"><Eye size={15} /></Link></TooltipTrigger><TooltipContent>Vista previa</TooltipContent></Tooltip>
          {x.estado_fiscal === "Borrador" && <><Tooltip><TooltipTrigger asChild><Boton variante="linea" className="h-8 w-8 p-0" aria-label={`Editar ${x.numero}`} onClick={() => void editarBorrador(x)}><Pencil size={14} /></Boton></TooltipTrigger><TooltipContent>Editar borrador</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Boton variante="peligro" className="h-8 w-8 p-0" aria-label={`Eliminar ${x.numero}`} onClick={() => setPorEliminar(x)}><Trash2 size={14} /></Boton></TooltipTrigger><TooltipContent>Eliminar borrador</TooltipContent></Tooltip></>}
        </div></TooltipProvider></td>
      </tr>)}</tbody></table></div>}
    </Panel>
    <AlertDialog open={Boolean(porEliminar)} onOpenChange={(open) => { if (!open) setPorEliminar(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar borrador</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente el comprobante {porEliminar?.numero}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={guardando} onClick={() => void confirmarEliminar()} className="bg-bad text-paper hover:bg-bad/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

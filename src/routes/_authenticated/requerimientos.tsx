import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { HojaOrdenCompra, imprimirOrdenCompra } from "@/components/HojaOrdenCompra";
import { useEmpresa } from "@/lib/empresa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Printer, Send } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { Boton, BotonIcono, Campo, Etiqueta, Input, MenuFiltros, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { soles } from "@/lib/format";
import { useProyectos, useTerceros, leerTodo } from "@/lib/datos";
import { apuDb, nombreTipo } from "@/lib/apu";
import { useItemsOC, useOrdenesCompra } from "@/lib/logistica";
import { useRecordado } from "@/lib/recordado";
import { ESTADOS_BANDEJA, estadoTrasOrden, mejoresPrecios, tonoEstadoReq } from "@/lib/requerimientos-flujo";
import { condicionPagoOrden, detallePagoOrden } from "@/lib/orden-compra-pago";

export const Route = createFileRoute("/_authenticated/requerimientos")({
  head: () => ({
    meta: [
      { title: "Bandeja de Requerimientos — ERP TELXEN SAC" },
      { name: "description", content: "Logística recibe requerimientos aprobados, solicita cotizaciones a proveedores y genera órdenes de compra." },
      { property: "og:title", content: "Bandeja de Requerimientos — ERP TELXEN SAC" },
      { property: "og:description", content: "Solicitud de cotizaciones, cuadro comparativo y órdenes de compra desde requerimientos aprobados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Bandeja,
});

type Req = { id: string; proyecto_id: string; codigo: string; fecha: string; estado: string; observacion: string; clase: string; tdr: Tdr };
type Tdr = { tipo?: string; objeto?: string; alcance?: string; entregables?: string; plazo?: string; lugar?: string; condiciones?: string };
type ItemReq = { id: string; requerimiento_id: string; insumo_id: string | null; tipo: string; descripcion: string; unidad: string; cantidad: number; precio_referencial: number };
type Solicitud = { id: string; requerimiento_id: string; proveedor_id: string; codigo: string; fecha: string; estado: string; moneda: string; plazo_entrega: string; condiciones: string; orden_id: string | null };
type ItemSol = { id: string; solicitud_id: string; requerimiento_item_id: string; cantidad: number; precio_unitario: number };

const num = (n: number, d = 2) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
const usarTabla = <T,>(t: string) =>
  useQuery({ queryKey: [t], queryFn: () => leerTodo<T>(() => apuDb.from(t).select("*").order("created_at", { ascending: false }).order("id")) });

function Bandeja() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: terceros = [] } = useTerceros();
  const { data: reqs = [] } = usarTabla<Req>("requerimientos");
  const { data: items = [] } = usarTabla<ItemReq>("requerimiento_items");
  const { data: sols = [] } = usarTabla<Solicitud>("solicitudes_cotizacion");
  const { data: itemsSol = [] } = usarTabla<ItemSol>("solicitud_cotizacion_items");
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: itemsOC = [] } = useItemsOC();
  const [sel, setSel] = useState("");
  const [busqueda, setBusqueda] = useRecordado("bandeja-req:busqueda", "");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [ventanaSol, setVentanaSol] = useState(false);
  const [registro, setRegistro] = useState<{ id: string; moneda: string; plazo: string; condiciones: string; precios: Record<string, string> } | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [vista, setVista] = useState<Solicitud | null>(null);
  const hojaSol = useRef<HTMLElement | null>(null);
  const { data: empresa } = useEmpresa();

  const provs = terceros.filter((t) => t.es_proveedor && t.activo);
  const nombreProv = (id: string | null) => terceros.find((t) => t.id === id)?.razon_social ?? "—";
  const nombreProy = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const bandeja = reqs.filter((r) => ESTADOS_BANDEJA.includes(r.estado) && coincide(busqueda, r.codigo, nombreProy(r.proyecto_id), r.observacion));
  const actual = reqs.find((r) => r.id === sel);
  const itsActual = items.filter((i) => i.requerimiento_id === sel);
  const solsActual = sols.filter((s) => s.requerimiento_id === sel);
  const ordenado = (reqItemId: string) =>
    itemsOC
      .filter((i) => (i as { requerimiento_item_id?: string | null }).requerimiento_item_id === reqItemId && ordenes.find((o) => o.id === i.orden_id)?.estado !== "Anulada")
      .reduce((s, i) => s + Number(i.cantidad), 0);
  const conPrecios = (s: Solicitud) => itemsSol.some((x) => x.solicitud_id === s.id && Number(x.precio_unitario) > 0);
  const pendientesSol = (s: Solicitud) =>
    itemsSol.filter((x) => {
      if (x.solicitud_id !== s.id) return false;
      const it = itsActual.find((i) => i.id === x.requerimiento_item_id);
      return it && Math.min(Number(x.cantidad), Number(it.cantidad) - ordenado(it.id)) > 0.0001;
    });
  const precio = (solId: string, itemId: string) => itemsSol.find((x) => x.solicitud_id === solId && x.requerimiento_item_id === itemId);
  const mejores = useMemo(
    () => mejoresPrecios(itemsSol.filter((x) => solsActual.some((s) => s.id === x.solicitud_id && s.estado !== "Descartada")).map((x) => ({ solicitudId: x.solicitud_id, requerimientoItemId: x.requerimiento_item_id, precio: Number(x.precio_unitario) }))),
    [itemsSol, solsActual],
  );

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function abrirSolicitud(r: Req) {
    const pendientes = items.filter((i) => i.requerimiento_id === r.id && Number(i.cantidad) - ordenado(i.id) > 0.0001);
    setSel(r.id);
    setMarcados(new Set(pendientes.map((i) => i.id)));
    setProveedores([]);
    setError("");
    setVentanaSol(true);
  }

  function gestionar(r: Req) {
    setSel(r.id);
    setMarcados(new Set());
    setError("");
    if (!sols.some((s) => s.requerimiento_id === r.id)) abrirSolicitud(r);
    else requestAnimationFrame(() => document.getElementById("cotizaciones-requerimiento")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const refrescar = () => { for (const k of ["requerimientos", "solicitudes_cotizacion", "solicitud_cotizacion_items", "ordenes_compra", "orden_compra_items"]) qc.invalidateQueries({ queryKey: [k] }); };

  async function solicitar() {
    setError("");
    if (!actual) return;
    const ids = [...marcados].filter((id) => itsActual.some((i) => i.id === id));
    if (!ids.length) return setError("Marca los ítems a cotizar.");
    if (!proveedores.length) return setError("Elige al menos un proveedor.");
    let n = sols.filter((s) => s.requerimiento_id === actual.id).length;
    for (const prov of proveedores) {
      n += 1;
      const { data: s, error: e1 } = await apuDb
        .from("solicitudes_cotizacion")
        .insert({ requerimiento_id: actual.id, proveedor_id: prov, codigo: `SC-${actual.codigo}-${String(n).padStart(2, "0")}` })
        .select("id")
        .single();
      if (e1) return setError(e1.message);
      const { error: e2 } = await apuDb.from("solicitud_cotizacion_items").insert(
        ids.map((id) => ({ solicitud_id: s.id, requerimiento_item_id: id, cantidad: Math.max(0, Number(itsActual.find((i) => i.id === id)?.cantidad ?? 0) - ordenado(id)) })),
      );
      if (e2) return setError(e2.message);
    }
    if (actual.estado === "Aprobado") await apuDb.from("requerimientos").update({ estado: "En cotización" }).eq("id", actual.id);
    setVentanaSol(false);
    setMarcados(new Set());
    setProveedores([]);
    setAviso(`${proveedores.length} solicitud(es) de cotización creadas.`);
    refrescar();
  }

  function abrirRegistro(s: Solicitud) {
    const precios: Record<string, string> = {};
    for (const x of itemsSol.filter((y) => y.solicitud_id === s.id)) precios[x.id] = x.precio_unitario ? String(x.precio_unitario) : "";
    setRegistro({ id: s.id, moneda: s.moneda, plazo: s.plazo_entrega, condiciones: s.condiciones, precios });
  }

  async function guardarRegistro() {
    if (!registro) return;
    if (!Object.values(registro.precios).some((p) => Number(p) > 0))
      return setError("Ingresa al menos un precio para registrar la cotización.");
    for (const [id, p] of Object.entries(registro.precios)) {
      const { error: e } = await apuDb.from("solicitud_cotizacion_items").update({ precio_unitario: Number(p) || 0 }).eq("id", id);
      if (e) return setError(e.message);
    }
    const { error: e2 } = await apuDb.from("solicitudes_cotizacion").update({ estado: "Recibida", moneda: registro.moneda, plazo_entrega: registro.plazo, condiciones: registro.condiciones }).eq("id", registro.id);
    if (e2) return setError(e2.message);
    setRegistro(null);
    setAviso("Cotización registrada.");
    refrescar();
  }

  const [pagoOC, setPagoOC] = useState<{ s: Solicitud; forma: string; dias: string; error: string } | null>(null);

  function aprobar(s: Solicitud) {
    setError("");
    const d = detallePagoOrden(s.condiciones || "");
    const dias = String(s.condiciones?.match(/(\d+)/)?.[1] ?? "30");
    setPagoOC({ s, forma: d.forma === "Crédito" ? "Crédito" : "Contado", dias, error: "" });
  }

  async function confirmarPagoOC() {
    if (!pagoOC) return;
    let condicion: string;
    try {
      condicion = condicionPagoOrden(pagoOC.forma, Number(pagoOC.dias));
    } catch (e) {
      return setPagoOC({ ...pagoOC, error: (e as Error).message });
    }
    const s = pagoOC.s;
    setPagoOC(null);
    await generarOC(s, condicion);
  }

  async function generarOC(s: Solicitud, condicion: string) {
    setError("");
    if (!actual) return;
    const lineas = itemsSol
      .filter((x) => x.solicitud_id === s.id && Number(x.precio_unitario) > 0)
      .flatMap((x) => {
        const it = itsActual.find((i) => i.id === x.requerimiento_item_id);
        return it ? [{ x, it }] : [];
      })
      .filter(({ x, it }) => it && Math.min(Number(x.cantidad), Number(it.cantidad) - ordenado(it.id)) > 0.0001);
    if (!conPrecios(s)) return setError(`La cotización ${s.codigo} no tiene precios registrados; usa «Registrar cotización» para anotarlos del proveedor.`);
    if (!lineas.length) return setError(`Todos los ítems de ${s.codigo} ya están ordenados; el requerimiento no tiene cantidad pendiente.`);
    const proy = proyectos.find((p) => p.id === actual.proyecto_id);
    const n = ordenes.filter((o) => o.proyecto_id === actual.proyecto_id).length + 1;
    const codigo = `OC-${proy?.codigo || "OBRA"}-${String(n).padStart(3, "0")}`;
    const { data: oc, error: e1 } = await apuDb
      .from("ordenes_compra")
      .insert({ codigo, proyecto_id: actual.proyecto_id, proveedor_id: s.proveedor_id, requerimiento_id: actual.id, condicion_pago: condicion, observacion: `Cotización ${s.codigo}${s.plazo_entrega ? ` · plazo ${s.plazo_entrega}` : ""}${s.moneda !== "PEN" ? ` · ${s.moneda}` : ""}` })
      .select("id")
      .single();
    if (e1) return setError(e1.message);
    const filas = lineas.map(({ x, it }) => ({
      orden_id: oc.id,
      requerimiento_item_id: it.id,
      insumo_id: it.insumo_id,
      descripcion: it.descripcion,
      unidad: it.unidad,
      cantidad: Math.round(Math.min(Number(x.cantidad), Number(it.cantidad) - ordenado(it.id)) * 10000) / 10000,
      precio_unitario: Number(x.precio_unitario),
    }));
    const { error: e2 } = await apuDb.from("orden_compra_items").insert(filas);
    if (e2) return setError(e2.message);
    await apuDb.from("solicitudes_cotizacion").update({ estado: "Aprobada", orden_id: oc.id }).eq("id", s.id);
    const nuevo = (id: string) => ordenado(id) + (filas.find((f) => f.requerimiento_item_id === id)?.cantidad ?? 0);
    await apuDb.from("requerimientos").update({ estado: estadoTrasOrden(itsActual, nuevo) }).eq("id", actual.id);
    setAviso(`Orden ${codigo} generada en Órdenes de Compra.`);
    refrescar();
  }

  async function descartar(s: Solicitud) {
    await apuDb.from("solicitudes_cotizacion").update({ estado: "Descartada" }).eq("id", s.id);
    refrescar();
  }

  function imprimir(s: Solicitud) { setVista(s); }

  return (
    <>
      <Encabezado titulo="Bandeja de Requerimientos" subtitulo="Logística · requerimientos aprobados por Gerencia" />
      {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}
      {aviso && <p className="mb-2 font-mono text-xs text-primary">{aviso}</p>}

      <div className="flex items-start gap-3">
        <Panel className="min-w-0 flex-1" titulo="Requerimientos aprobados">
          {bandeja.length === 0 ? (
            <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "No hay requerimientos aprobados por Gerencia."} />
          ) : (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Obra</th>
                  <th className="px-3 py-2 font-medium">Clase</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 text-right font-medium">Ítems</th>
                  <th className="px-3 py-2 text-right font-medium">Cotizaciones</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Cotizaciones de proveedores</th>
                </tr>
              </thead>
              <tbody>
                {bandeja.map((r) => (
                  <tr key={r.id} onClick={() => { setSel(r.id); setMarcados(new Set()); }} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === r.id ? "bg-primary/10" : ""}`}>
                    <td className="px-5 py-1.5 text-primary"><Resaltar texto={r.codigo} termino={busqueda} /></td>
                    <td className="px-3 py-1.5"><Resaltar texto={nombreProy(r.proyecto_id)} termino={busqueda} /></td>
                    <td className="px-3 py-1.5">{r.clase === "tdr" ? `TDR · ${r.tdr?.tipo ?? "Servicio"}` : "Materiales (APU)"}</td>
                    <td className="px-3 py-1.5">{r.fecha}</td>
                    <td className="px-3 py-1.5 text-right">{items.filter((i) => i.requerimiento_id === r.id).length}</td>
                    <td className="px-3 py-1.5 text-right">{sols.filter((s) => s.requerimiento_id === r.id).length}</td>
                    <td className="px-3 py-1.5"><Etiqueta tono={tonoEstadoReq(r.estado)}>{r.estado}</Etiqueta></td>
                    <td className="px-3 py-1.5 text-right">
                      <Boton variante="linea" className="px-2 py-1" onClick={(e) => { e.stopPropagation(); gestionar(r); }}>
                        <ClipboardList size={14} />Gestionar cotizaciones
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <BarraIconosHoja
          objeto="requerimiento"
          filtros={<MenuFiltros activos={busqueda ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={bandeja.length} placeholder="Buscar por código, obra u observación..." /></MenuFiltros>}
          haySeleccion={!!actual}
          extras={
            <BotonIcono etiqueta="Solicitar cotización" disabled={!actual || !itsActual.some((i) => Number(i.cantidad) - ordenado(i.id) > 0.0001)} onClick={() => { if (actual) { if (marcados.size) { setError(""); setProveedores([]); setVentanaSol(true); } else abrirSolicitud(actual); } }}>
              <Send size={15} />
            </BotonIcono>
          }
        />
      </div>

      {actual && (
        <>
          <div id="cotizaciones-requerimiento" className="mt-5 scroll-mt-3">
          <Panel titulo={`Ítems de ${actual.codigo} · cuadro comparativo`} extra={<span className="text-xs text-muted-foreground">{solsActual.length} cotizaciones · {marcados.size} ítems seleccionados</span>}>
            {actual.clase === "tdr" && (
              <div className="border-b border-line px-5 py-2 text-xs">
                <b>Términos de referencia:</b> {actual.tdr?.objeto} {actual.tdr?.plazo && `· Plazo ${actual.tdr.plazo}`} {actual.tdr?.lugar && `· ${actual.tdr.lugar}`}
                {actual.tdr?.alcance && <p className="text-muted-foreground">{actual.tdr.alcance}</p>}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="mt-2 w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="w-8 px-3 py-2" />
                    <th className="px-2 py-2 font-medium">Ítem</th>
                    <th className="px-2 py-2 font-medium">Und.</th>
                    <th className="px-2 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-2 py-2 text-right font-medium">Ordenado</th>
                    <th className="px-2 py-2 text-right font-medium">Referencial</th>
                    {solsActual.map((s) => (
                      <th key={s.id} className="px-2 py-2 text-right font-medium" title={s.codigo}>{nombreProv(s.proveedor_id).slice(0, 22)}<br /><span className="normal-case">{s.estado}{s.moneda !== "PEN" ? ` · ${s.moneda}` : ""}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itsActual.map((i) => {
                    const ord = ordenado(i.id);
                    const completo = ord >= Number(i.cantidad) - 0.0001;
                    return (
                      <tr key={i.id} className={`border-b border-line/40 ${completo ? "opacity-60" : ""}`}>
                        <td className="px-3 py-1">
                          <input type="checkbox" aria-label={`Marcar ${i.descripcion}`} disabled={completo} className="size-3.5 accent-[var(--color-primary)]" checked={marcados.has(i.id)} onChange={(e) => { const n = new Set(marcados); if (e.target.checked) n.add(i.id); else n.delete(i.id); setMarcados(n); }} />
                        </td>
                        <td className="px-2 py-1">{i.descripcion} <span className="text-[10px] text-muted-foreground">· {nombreTipo(i.tipo)}</span></td>
                        <td className="px-2 py-1 text-muted-foreground">{i.unidad}</td>
                        <td className="px-2 py-1 text-right">{num(Number(i.cantidad), 4)}</td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{num(ord, 4)}</td>
                        <td className="px-2 py-1 text-right text-muted-foreground">{num(Number(i.precio_referencial))}</td>
                        {solsActual.map((s) => {
                          const p = precio(s.id, i.id);
                          const mejor = mejores.get(i.id) === s.id;
                          return <td key={s.id} className={`px-2 py-1 text-right ${mejor ? "font-semibold text-good" : ""}`}>{p ? (Number(p.precio_unitario) > 0 ? num(Number(p.precio_unitario)) : "pendiente") : "—"}</td>;
                        })}
                      </tr>
                    );
                  })}
                  {solsActual.length > 0 && (
                    <tr className="bg-muted/30">
                      <td colSpan={6} className="px-3 py-1.5 text-right font-semibold">Total ofertado</td>
                      {solsActual.map((s) => (
                        <td key={s.id} className="px-2 py-1.5 text-right font-semibold">
                          {soles(itemsSol.filter((x) => x.solicitud_id === s.id).reduce((a, x) => a + Number(x.cantidad) * Number(x.precio_unitario), 0)).replace("S/", s.moneda === "USD" ? "$" : "S/")}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
          </div>

          <div className="mt-5 flex items-start gap-3">
          <Panel className="min-w-0 flex-1" titulo="Cotizaciones de proveedores">
            {solsActual.length === 0 ? (
              <Vacio texto="Aún no se solicitaron cotizaciones para este requerimiento." />
            ) : (
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Proveedor</th>
                    <th className="px-3 py-2 font-medium">Plazo</th>
                    <th className="px-3 py-2 font-medium">Condiciones</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-5 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solsActual.map((s) => (
                    <tr key={s.id} className="border-b border-line/40">
                      <td className="px-5 py-1.5 text-primary">{s.codigo}</td>
                      <td className="px-3 py-1.5">{nombreProv(s.proveedor_id)}</td>
                      <td className="px-3 py-1.5">{s.plazo_entrega || "—"}</td>
                      <td className="px-3 py-1.5">{s.condiciones || "—"}</td>
                      <td className="px-3 py-1.5">
                        <Etiqueta tono={s.estado === "Aprobada" ? "good" : s.estado === "Descartada" ? "bad" : s.estado === "Recibida" ? "warn" : "neutro"}>{s.estado}</Etiqueta>
                        {s.orden_id && <span className="ml-1 text-[10px] text-muted-foreground">{ordenes.find((o) => o.id === s.orden_id)?.codigo}</span>}
                      </td>
                      <td className="px-5 py-1.5">
                        <div className="flex justify-end gap-1">
                          <BotonIcono etiqueta="Imprimir solicitud" onClick={() => imprimir(s)}><Printer size={14} /></BotonIcono>
                          {s.estado !== "Aprobada" && s.estado !== "Descartada" && (
                            <>
                              <Boton variante="linea" className="py-0.5 text-xs" onClick={() => abrirRegistro(s)}>Registrar cotización</Boton>
                              {s.estado === "Recibida" && conPrecios(s) && pendientesSol(s).length > 0 && <Boton className="py-0.5 text-xs" onClick={() => void aprobar(s)}><Check size={13} className="mr-1 inline" />Aprobar y generar OC</Boton>}
                              <Boton variante="linea" className="py-0.5 text-xs" onClick={() => void descartar(s)}>Descartar</Boton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          <BarraIconosHoja objeto="cotización" haySeleccion={!!actual} extras={
            <BotonIcono etiqueta="Nueva solicitud de cotización" tono="primario" disabled={!itsActual.some((i) => Number(i.cantidad) - ordenado(i.id) > 0.0001)} onClick={() => abrirSolicitud(actual)}><Send size={15} /></BotonIcono>
          } />
          </div>
        </>
      )}

      <VentanaFlotante abierta={ventanaSol} onCerrar={() => setVentanaSol(false)} titulo="Solicitar cotización" subtitulo={`${actual?.codigo ?? ""} · ${actual ? nombreProy(actual.proyecto_id) : ""}`} ancho="max-w-4xl">
        <div className="grid gap-5 p-5 text-xs md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold">Ítems a cotizar · {marcados.size}</h3>
          <div className="max-h-80 overflow-y-auto">
          {itsActual.map((i) => {
            const saldo = Math.max(0, Number(i.cantidad) - ordenado(i.id));
            return <label key={i.id} className="flex items-start gap-2 border-b border-line/30 py-2">
              <input type="checkbox" aria-label={`Cotizar ${i.descripcion}`} disabled={saldo <= 0.0001} className="mt-0.5 size-3.5 shrink-0 accent-[var(--color-primary)]" checked={marcados.has(i.id)} onChange={(e) => { const n = new Set(marcados); if (e.target.checked) n.add(i.id); else n.delete(i.id); setMarcados(n); }} />
              <span className="min-w-0 flex-1">{i.descripcion}<span className="mt-1 block text-muted-foreground">{num(saldo, 4)} {i.unidad} pendientes</span></span>
            </label>;
          })}
          </div>
        </div>
        <div>
        <h3 className="mb-2 font-semibold">Proveedores · {proveedores.length}</h3>
        <div className="max-h-80 overflow-y-auto">
          {provs.length === 0 ? <Vacio texto="No hay proveedores activos registrados." /> : provs.map((p) => (
            <label key={p.id} className="flex items-center gap-2 border-b border-line/30 py-1.5">
              <input type="checkbox" className="size-3.5 accent-[var(--color-primary)]" checked={proveedores.includes(p.id)} onChange={(e) => setProveedores(e.target.checked ? [...proveedores, p.id] : proveedores.filter((x) => x !== p.id))} />
              {p.razon_social} <span className="text-muted-foreground">{(p as { ruc?: string; numero_documento?: string }).numero_documento ?? ""}</span>
            </label>
          ))}
        </div>
        </div>
        </div>
        {error && <p role="alert" className="px-5 pb-3 text-xs text-bad">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Boton variante="linea" onClick={() => setVentanaSol(false)}>Cancelar</Boton>
          <Boton onClick={() => void solicitar()}><Send size={13} className="mr-1 inline" />Crear solicitudes</Boton>
        </div>
      </VentanaFlotante>

      <VentanaFlotante abierta={!!registro} onCerrar={() => setRegistro(null)} titulo="Registrar cotización del proveedor" subtitulo={nombreProv(sols.find((s) => s.id === registro?.id)?.proveedor_id ?? null)} ancho="max-w-2xl">
        {registro && (
          <form className="p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardarRegistro(); }}>
            {error && <p role="alert" className="mb-3 text-bad">{error}</p>}
            <div className="mb-3 grid grid-cols-3 gap-3">
              <Campo etiqueta="Moneda"><Select value={registro.moneda} onChange={(e) => setRegistro({ ...registro, moneda: e.target.value })}><option value="PEN">PEN</option><option value="USD">USD</option></Select></Campo>
              <Campo etiqueta="Plazo de entrega"><Input value={registro.plazo} onChange={(e) => setRegistro({ ...registro, plazo: e.target.value })} placeholder="Ej. 5 días" /></Campo>
              <Campo etiqueta="Condición de pago"><Input value={registro.condiciones} onChange={(e) => setRegistro({ ...registro, condiciones: e.target.value })} placeholder="Contado / Crédito 30 días" /></Campo>
            </div>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">Ítem</th>
                  <th className="px-2 py-1.5 text-right font-medium">Cantidad</th>
                  <th className="px-2 py-1.5 text-right font-medium">Precio unitario</th>
                </tr>
              </thead>
              <tbody>
                {itemsSol.filter((x) => x.solicitud_id === registro.id).map((x) => (
                  <tr key={x.id} className="border-b border-line/40">
                    <td className="px-2 py-1">{items.find((i) => i.id === x.requerimiento_item_id)?.descripcion}</td>
                    <td className="px-2 py-1 text-right">{num(Number(x.cantidad), 4)}</td>
                    <td className="px-2 py-1 text-right">
                      <Input type="number" step="0.0001" min="0" className="w-28 py-0.5 text-right text-xs" value={registro.precios[x.id] ?? ""} onChange={(e) => setRegistro({ ...registro, precios: { ...registro.precios, [x.id]: e.target.value } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end gap-2 border-t border-line px-5 pt-3">
              <Boton type="button" variante="linea" onClick={() => setRegistro(null)}>Cancelar</Boton>
              <Boton type="submit">Guardar cotización</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
      <VentanaFlotante abierta={!!pagoOC} onCerrar={() => setPagoOC(null)} titulo="Generar orden de compra" subtitulo={pagoOC ? `${pagoOC.s.codigo} · ${nombreProv(pagoOC.s.proveedor_id)}` : ""} ancho="max-w-md">
        {pagoOC && (
          <form className="space-y-3 p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void confirmarPagoOC(); }}>
            <Campo etiqueta="Forma de pago"><Select value={pagoOC.forma} onChange={(e) => setPagoOC({ ...pagoOC, forma: e.target.value, error: "" })}><option value="Contado">Contado</option><option value="Crédito">Crédito</option></Select></Campo>
            {pagoOC.forma === "Crédito" && <Campo etiqueta="Plazo de pago (días)"><Input type="number" min={1} step={1} value={pagoOC.dias} onChange={(e) => setPagoOC({ ...pagoOC, dias: e.target.value, error: "" })} /></Campo>}
            <p className="text-xs text-muted-foreground">La deuda quedará en Tesorería · Pagos a proveedores al recibir la orden.</p>
            {pagoOC.error && <p className="text-xs text-bad">{pagoOC.error}</p>}
            <div className="flex justify-end gap-2"><Boton type="button" variante="linea" onClick={() => setPagoOC(null)}>Cancelar</Boton><Boton type="submit"><Check size={13} className="mr-1 inline" />Generar OC</Boton></div>
          </form>
        )}
      </VentanaFlotante>
      <VentanaFlotante abierta={!!vista} onCerrar={() => setVista(null)} titulo="Solicitud de cotización" subtitulo={vista ? `${vista.codigo} · ${nombreProv(vista.proveedor_id)}` : ""} ancho="max-w-6xl">

        {vista && actual && (() => {
          const prov = terceros.find((t) => t.id === vista.proveedor_id);
          const its = itemsSol.filter((x) => x.solicitud_id === vista.id).map((x) => ({ x, it: itsActual.find((i) => i.id === x.requerimiento_item_id) }));
          const tdr = actual.clase === "tdr" ? actual.tdr : null;
          return (
            <div className="flex gap-3 p-4">
              <div className="min-w-0 flex-1" ref={(el) => { hojaSol.current = el?.querySelector(".oc-sheet") ?? null; }}>
                <HojaOrdenCompra empresa={empresa ?? null} codigo={vista.codigo} estado={vista.estado} titulo="SOLICITUD DE COTIZACIÓN">
                  <div className="oc-data">
                    <div><h3>PROVEEDOR</h3><p><b>{prov?.razon_social ?? "—"}</b></p><p>{prov?.tipo_documento || "RUC"}: {prov?.numero_documento || "—"}</p><p>{prov?.direccion || ""}</p></div>
                    <div><h3>DATOS DE LA SOLICITUD</h3><p><b>Fecha:</b> {vista.fecha}</p><p><b>Requerimiento:</b> {actual.codigo}</p><p><b>Obra:</b> {nombreProy(actual.proyecto_id)}</p></div>
                  </div>
                  {tdr && <div className="oc-conditions" style={{ marginTop: 0, marginBottom: 14 }}><h3>TÉRMINOS DE REFERENCIA {tdr.tipo ? `(${tdr.tipo})` : ""}</h3><p><b>Objeto:</b> {tdr.objeto}</p><p><b>Alcance:</b> {tdr.alcance}</p><p><b>Entregables:</b> {tdr.entregables}</p><p><b>Plazo:</b> {tdr.plazo} · <b>Lugar:</b> {tdr.lugar}</p><p><b>Condiciones:</b> {tdr.condiciones}</p></div>}
                  <table>
                    <thead><tr><th style={{ width: 32 }}>N°</th><th>DESCRIPCIÓN</th><th style={{ width: 60 }}>UND.</th><th className="oc-number" style={{ width: 90 }}>CANTIDAD</th><th className="oc-number" style={{ width: 90 }}>P. UNIT.</th><th className="oc-number" style={{ width: 90 }}>TOTAL</th></tr></thead>
                    <tbody>{its.map(({ x, it }, i) => <tr key={x.id}><td>{i + 1}</td><td>{it?.descripcion}</td><td>{it?.unidad}</td><td className="oc-number">{num(Number(x.cantidad), 4)}</td><td className="oc-number">{Number(x.precio_unitario) > 0 ? num(Number(x.precio_unitario)) : ""}</td><td className="oc-number">{Number(x.precio_unitario) > 0 ? num(Number(x.cantidad) * Number(x.precio_unitario)) : ""}</td></tr>)}</tbody>
                  </table>
                  <div className="oc-conditions"><h3>SE SOLICITA INDICAR</h3>Moneda, plazo de entrega, condiciones de pago (contado o crédito y plazo) y validez de la oferta.</div>
                  {(vista.plazo_entrega || vista.condiciones) && <div className="oc-conditions"><h3>OFERTA DEL PROVEEDOR</h3>{vista.moneda && <p><b>Moneda:</b> {vista.moneda}</p>}{vista.plazo_entrega && <p><b>Plazo de entrega:</b> {vista.plazo_entrega}</p>}{vista.condiciones && <p><b>Condiciones:</b> {vista.condiciones}</p>}</div>}
                </HojaOrdenCompra>
              </div>
              <div className="flex flex-col gap-1">
                <BotonIcono etiqueta="Imprimir o guardar en PDF" tono="primario" onClick={() => imprimirOrdenCompra(hojaSol.current, vista.codigo)}><Printer size={15} /></BotonIcono>
              </div>
            </div>
          );
        })()}
      </VentanaFlotante>
    </>
  );
}

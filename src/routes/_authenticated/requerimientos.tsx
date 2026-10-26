import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Printer, Send } from "lucide-react";
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

type Req = { id: string; proyecto_id: string; codigo: string; fecha: string; estado: string; observacion: string; clase: string; tdr: Record<string, string> };
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
  const precio = (solId: string, itemId: string) => itemsSol.find((x) => x.solicitud_id === solId && x.requerimiento_item_id === itemId);
  const mejores = useMemo(
    () => mejoresPrecios(itemsSol.filter((x) => solsActual.some((s) => s.id === x.solicitud_id && s.estado !== "Descartada")).map((x) => ({ solicitudId: x.solicitud_id, requerimientoItemId: x.requerimiento_item_id, precio: Number(x.precio_unitario) }))),
    [itemsSol, solsActual],
  );

  if (!puedeVerDinero(rol)) return <SinAcceso />;

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

  async function aprobar(s: Solicitud) {
    setError("");
    if (!actual) return;
    const lineas = itemsSol
      .filter((x) => x.solicitud_id === s.id && Number(x.precio_unitario) > 0)
      .map((x) => ({ x, it: itsActual.find((i) => i.id === x.requerimiento_item_id)! }))
      .filter(({ x, it }) => it && Math.min(Number(x.cantidad), Number(it.cantidad) - ordenado(it.id)) > 0.0001);
    if (!lineas.length) return setError("La cotización no tiene precios o sus ítems ya están ordenados.");
    if (!window.confirm(`Aprobar la cotización de ${nombreProv(s.proveedor_id)} y generar la orden de compra?`)) return;
    const proy = proyectos.find((p) => p.id === actual.proyecto_id);
    const n = ordenes.filter((o) => o.proyecto_id === actual.proyecto_id).length + 1;
    const codigo = `OC-${proy?.codigo || "OBRA"}-${String(n).padStart(3, "0")}`;
    const { data: oc, error: e1 } = await apuDb
      .from("ordenes_compra")
      .insert({ codigo, proyecto_id: actual.proyecto_id, proveedor_id: s.proveedor_id, requerimiento_id: actual.id, condicion_pago: s.condiciones || "Contado", observacion: `Cotización ${s.codigo}${s.plazo_entrega ? ` · plazo ${s.plazo_entrega}` : ""}${s.moneda !== "PEN" ? ` · ${s.moneda}` : ""}` })
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

  function imprimir(s: Solicitud) {
    if (!actual) return;
    const its = itemsSol.filter((x) => x.solicitud_id === s.id).map((x) => ({ x, it: itsActual.find((i) => i.id === x.requerimiento_item_id) }));
    const tdr = actual.clase === "tdr" ? actual.tdr : null;
    const esc = (t: string) => String(t ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${esc(s.codigo)}</title><style>body{font-family:sans-serif;font-size:12px;margin:32px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:4px 6px;text-align:left}h1{font-size:16px}</style></head><body>
      <h1>SOLICITUD DE COTIZACIÓN ${esc(s.codigo)}</h1>
      <p><b>TELXEN SAC</b> · Fecha: ${esc(s.fecha)}<br/>Proveedor: ${esc(nombreProv(s.proveedor_id))}<br/>Obra: ${esc(nombreProy(actual.proyecto_id))} · Requerimiento ${esc(actual.codigo)}</p>
      ${tdr ? `<h3>Términos de Referencia (${esc(tdr.tipo ?? "")})</h3><p><b>Objeto:</b> ${esc(tdr.objeto ?? "")}</p><p><b>Alcance:</b> ${esc(tdr.alcance ?? "")}</p><p><b>Entregables:</b> ${esc(tdr.entregables ?? "")}</p><p><b>Plazo:</b> ${esc(tdr.plazo ?? "")} · <b>Lugar:</b> ${esc(tdr.lugar ?? "")}</p><p><b>Condiciones:</b> ${esc(tdr.condiciones ?? "")}</p>` : ""}
      <table><thead><tr><th>#</th><th>Descripción</th><th>Und.</th><th>Cantidad</th><th>P. Unit.</th><th>Total</th></tr></thead><tbody>
      ${its.map(({ x, it }, i) => `<tr><td>${i + 1}</td><td>${esc(it?.descripcion ?? "")}</td><td>${esc(it?.unidad ?? "")}</td><td>${num(Number(x.cantidad), 4)}</td><td></td><td></td></tr>`).join("")}
      </tbody></table><p>Indicar moneda, plazo de entrega, condiciones de pago y validez de la oferta.</p></body></html>`);
    w.document.close();
    w.print();
  }

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
            <BotonIcono etiqueta="Solicitar cotización" disabled={!actual || !marcados.size} onClick={() => setVentanaSol(true)}>
              <Send size={15} />
            </BotonIcono>
          }
        />
      </div>

      {actual && (
        <>
          <Panel className="mt-5" titulo={`Ítems de ${actual.codigo} · cuadro comparativo`}>
            {actual.clase === "tdr" && (
              <div className="border-b border-line px-5 py-2 text-xs">
                <b>Términos de referencia:</b> {actual.tdr?.objeto} {actual.tdr?.plazo && `· Plazo ${actual.tdr.plazo}`} {actual.tdr?.lugar && `· ${actual.tdr.lugar}`}
                {actual.tdr?.alcance && <p className="text-muted-foreground">{actual.tdr.alcance}</p>}
              </div>
            )}
            <p className="px-5 pt-2 font-mono text-[11px] text-muted-foreground">Marca los ítems y usa «Solicitar cotización» en la barra derecha. El menor precio por ítem aparece resaltado.</p>
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

          <Panel className="mt-5" titulo="Solicitudes de cotización">
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
                              {s.estado === "Recibida" && <Boton className="py-0.5 text-xs" onClick={() => void aprobar(s)}><Check size={13} className="mr-1 inline" />Aprobar y generar OC</Boton>}
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
        </>
      )}

      <VentanaFlotante abierta={ventanaSol} onCerrar={() => setVentanaSol(false)} titulo="Solicitar cotización" subtitulo={`${marcados.size} ítem(s) de ${actual?.codigo ?? ""} · se crea una solicitud por proveedor`} ancho="max-w-xl">
        <div className="max-h-80 overflow-y-auto p-5 text-xs">
          {provs.length === 0 ? <Vacio texto="No hay proveedores activos registrados." /> : provs.map((p) => (
            <label key={p.id} className="flex items-center gap-2 border-b border-line/30 py-1.5">
              <input type="checkbox" className="size-3.5 accent-[var(--color-primary)]" checked={proveedores.includes(p.id)} onChange={(e) => setProveedores(e.target.checked ? [...proveedores, p.id] : proveedores.filter((x) => x !== p.id))} />
              {p.razon_social} <span className="text-muted-foreground">{(p as { ruc?: string; numero_documento?: string }).numero_documento ?? ""}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Boton variante="linea" onClick={() => setVentanaSol(false)}>Cancelar</Boton>
          <Boton onClick={() => void solicitar()}><Send size={13} className="mr-1 inline" />Crear solicitudes</Boton>
        </div>
      </VentanaFlotante>

      <VentanaFlotante abierta={!!registro} onCerrar={() => setRegistro(null)} titulo="Registrar cotización del proveedor" subtitulo={nombreProv(sols.find((s) => s.id === registro?.id)?.proveedor_id ?? null)} ancho="max-w-2xl">
        {registro && (
          <form className="p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardarRegistro(); }}>
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
            <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
              <Boton type="button" variante="linea" onClick={() => setRegistro(null)}>Cancelar</Boton>
              <Boton type="submit">Guardar cotización</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
    </>
  );
}


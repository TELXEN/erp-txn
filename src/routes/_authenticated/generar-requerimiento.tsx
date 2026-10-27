import { useRecordado } from "@/lib/recordado";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText, PackageCheck, PackagePlus } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, BotonIcono, Campo, Etiqueta, Input, MenuFiltros, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { soles } from "@/lib/format";
import { usePartidas, useProyectos } from "@/lib/datos";
import { apuDb, nombreTipo } from "@/lib/apu";
import { useItemsOC, useMovimientos, useOrdenesCompra } from "@/lib/logistica";
import { saldoRecepcion, tonoEstadoReq } from "@/lib/requerimientos-flujo";
import { supabase } from "@/integrations/supabase/client";
import { VentanaRequerimientoRubro, type ReqEditable } from "@/components/VentanaRequerimientoRubro";
import { nombreRubro, type RubroCompra } from "@/lib/rubros-compra";

export const Route = createFileRoute("/_authenticated/generar-requerimiento")({
  head: () => ({
    meta: [
      { title: "Generar Requerimiento — ERP TELXEN SAC" },
      { name: "description", content: "El responsable de obra genera requerimientos por rubro o con términos de referencia y los envía a Gerencia." },
      { property: "og:title", content: "Generar Requerimiento — ERP TELXEN SAC" },
      { property: "og:description", content: "Requerimientos por rubro y términos de referencia, con recepción en obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequerimientosPage,
});

type Tdr = { objeto?: string; alcance?: string; entregables?: string; plazo?: string; lugar?: string; condiciones?: string; tipo?: string; partida?: string };
type Requerimiento = {
  id: string;
  proyecto_id: string | null;
  codigo: string;
  fecha: string;
  estado: string;
  observacion: string;
  creado_por: string | null;
  cotizacion_id: string | null;
  origen: string;
  clase: string;
  motivo_rechazo: string;
  tdr: Tdr;
  rubro?: string | null;
};
type ItemReq = {
  id: string;
  requerimiento_id: string;
  insumo_id: string | null;
  tipo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_referencial: number;
};

const num = (n: number, d = 2) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
const TDR_VACIO = { tipo: "Subcontrato", partida: "", objeto: "", alcance: "", entregables: "", plazo: "", lugar: "", condiciones: "", referencial: "" };

function RequerimientosPage() {
  const { rol } = useAuth();
  const gestiona = puedeVerDinero(rol);
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const [proyectoSel, setProyectoSel] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useRecordado("requerimientos:busqueda", "");
  const [sel, setSel] = useState("");
  const [ventanaTdr, setVentanaTdr] = useState(false);
  const [tdr, setTdr] = useState(TDR_VACIO);
  const [ventanaRubro, setVentanaRubro] = useState(false);
  const [editRubro, setEditRubro] = useState<ReqEditable | null>(null);
  const [editTdr, setEditTdr] = useState<{ id: string; codigo: string } | null>(null);
  const [recepcion, setRecepcion] = useState<{ orden: string; fecha: string; obs: string; cant: Record<string, string> } | null>(null);
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: itemsOC = [] } = useItemsOC();
  const { data: movs = [] } = useMovimientos();
  const recibidoOC = (id: string) => movs.filter((m) => m.orden_item_id === id && m.tipo === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);

  const proyectoId = proyectoSel;
  const proyecto = proyectos.find((p) => p.id === proyectoId);

  const { data: origenesReq = [] } = useQuery({
    queryKey: ["requerimiento_item_origenes"],
    queryFn: async () => {
      const { data, error } = await apuDb.from("requerimiento_item_origenes").select("*");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; requerimiento_item_id: string; partida_codigo: string; partida_nombre: string; metrado: number; cantidad_unitaria: number; cantidad: number }>;
    },
  });

  const { data: reqs = [] } = useQuery({
    queryKey: ["requerimientos"],
    queryFn: async () => {
      const { data, error } = await apuDb.from("requerimientos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Requerimiento[];
    },
  });
  const { data: reqItems = [] } = useQuery({
    queryKey: ["requerimiento_items"],
    queryFn: async () => {
      const { data, error } = await apuDb.from("requerimiento_items").select("*");
      if (error) throw error;
      return (data ?? []) as ItemReq[];
    },
  });

  const nombreProy = (id: string | null) => {
    if (!id) return "Stock · Almacén Central";
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const actual = reqs.find((x) => x.id === sel);
  const reqsVisibles = reqs.filter((r) => coincide(busqueda, r.codigo, nombreProy(r.proyecto_id), r.observacion));
  const ocsPendientes = ordenes.filter((o) => ["Emitida", "Enviado a obra", "Recibida parcial"].includes(o.estado));
  const hojasObra = partidas
    .filter((p) => p.proyecto_id === proyectoId && !partidas.some((h) => h.padre_id === p.id))
    .map((p) => ({ id: p.id, codigo: (p as { codigo?: string }).codigo ?? "", nombre: (p as { nombre?: string }).nombre ?? "" }));

  const siguienteCodigo = () => {
    const n = reqs.filter((r) => r.proyecto_id === proyectoId).length + 1;
    return `REQ-${proyecto?.codigo || "OBRA"}-${String(n).padStart(3, "0")}`;
  };

  async function guardarTdr(enviar: boolean) {
    setError("");
    if (!proyectoId) return setError("Selecciona la obra.");
    if (!tdr.objeto.trim()) return setError("Indica el objeto de la contratación.");
    const codigo = editTdr?.codigo ?? siguienteCodigo();
    if (enviar && !window.confirm(`¿Estás seguro de enviar el requerimiento ${codigo} a Gerencia?\nUna vez enviado ya no podrás editarlo.`)) return;
    const { referencial, ...datos } = tdr;
    const cab = { proyecto_id: proyectoId, origen: "obra", clase: "tdr", observacion: `${tdr.tipo}: ${tdr.objeto.trim()}`, tdr: datos };
    let req: { id: string };
    if (editTdr) {
      const { error: e0 } = await apuDb.from("requerimientos").update({ ...cab, estado: "Borrador", motivo_rechazo: "" }).eq("id", editTdr.id);
      if (e0) return setError(e0.message);
      const { error: eDel } = await apuDb.from("requerimiento_items").delete().eq("requerimiento_id", editTdr.id);
      if (eDel) return setError(eDel.message);
      req = { id: editTdr.id };
    } else {
      const { data, error: e1 } = await apuDb.from("requerimientos").insert({ ...cab, codigo, estado: "Borrador" }).select("id").single();
      if (e1) return setError(e1.message);
      req = data;
    }
    const { error: e2 } = await apuDb.from("requerimiento_items").insert({
      requerimiento_id: req.id,
      tipo: "SC",
      descripcion: tdr.objeto.trim(),
      unidad: "GLB",
      cantidad: 1,
      precio_referencial: Number(referencial) || 0,
    });
    if (e2) return setError(e2.message);
    if (enviar) {
      const { error: e3 } = await apuDb.from("requerimientos").update({ estado: "Enviado a Gerencia" }).eq("id", req.id);
      if (e3) return setError(e3.message);
    }
    setVentanaTdr(false); setEditTdr(null);
    setAviso(enviar ? `Requerimiento ${codigo} (términos de referencia) enviado a Gerencia.` : `Requerimiento ${codigo} guardado como borrador.`);
    qc.invalidateQueries({ queryKey: ["requerimientos"] });
    qc.invalidateQueries({ queryKey: ["requerimiento_items"] });
  }

  function abrirRecepcion(ordenId: string) {
    const cant: Record<string, string> = {};
    for (const i of itemsOC.filter((x) => x.orden_id === ordenId)) cant[i.id] = String(saldoRecepcion(Number(i.cantidad), recibidoOC(i.id)));
    setRecepcion({ orden: ordenId, fecha: new Date().toISOString().slice(0, 10), obs: "", cant });
  }

  async function guardarRecepcion() {
    if (!recepcion) return;
    const items = Object.entries(recepcion.cant).map(([orden_item_id, c]) => ({ orden_item_id, cantidad: Number(c) || 0 })).filter((x) => x.cantidad > 0);
    if (!items.length) return setError("Indica al menos una cantidad recibida.");
    const { error: err } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("recepcionar_orden_obra", {
      _orden: recepcion.orden, _items: items, _fecha: recepcion.fecha, _obs: recepcion.obs,
    });
    if (err) return setError(err.message);
    setRecepcion(null);
    setAviso("Recepción registrada en el almacén de la obra.");
    for (const k of ["movimientos_almacen", "ordenes_compra", "requerimientos"]) qc.invalidateQueries({ queryKey: [k] });
  }

  const editable = !!actual && ["Borrador", "Rechazado"].includes(actual.estado) && !actual.cotizacion_id;
  const eliminable = !!actual && (gestiona || ["Borrador", "Enviado a Gerencia", "Rechazado"].includes(actual.estado));

  function editarActual() {
    if (!actual || !editable) return;
    const its = reqItems.filter((i) => i.requerimiento_id === actual.id);
    setProyectoSel(actual.proyecto_id ?? "");
    if (actual.clase === "tdr") {
      setTdr({ ...TDR_VACIO, ...actual.tdr, referencial: String(its[0]?.precio_referencial ?? "") } as typeof TDR_VACIO);
      setEditTdr({ id: actual.id, codigo: actual.codigo });
      setVentanaTdr(true);
    } else {
      setEditRubro({ id: actual.id, codigo: actual.codigo, rubro: (actual.rubro ?? "MAT") as RubroCompra, observacion: actual.observacion ?? "", items: its });
      setVentanaRubro(true);
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este requerimiento?")) return;
    const { error: err } = await apuDb.from("requerimientos").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["requerimientos"] });
    qc.invalidateQueries({ queryKey: ["requerimiento_items"] });
  }

  return (
    <>
      <Encabezado
        titulo="Generar Requerimiento"
        subtitulo="Operaciones · el responsable de obra lo envía a Gerencia para aprobación"
      />

      <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {error && <p className="mb-3 font-mono text-xs text-bad">{error}</p>}
        {aviso && <p className="mb-3 font-mono text-xs text-primary">{aviso}</p>}

        <Panel className="min-w-0 flex-1" titulo="Requerimientos registrados">
          {reqsVisibles.length === 0 ? (
            busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Todavía no hay requerimientos." />
          ) : (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Obra</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 text-right font-medium">Ítems</th>
                  {gestiona && <th className="px-3 py-2 text-right font-medium">Referencial</th>}
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reqsVisibles.map((r) => {
                  const its = reqItems.filter((i) => i.requerimiento_id === r.id);
                  const ver = abierto === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr onClick={() => setSel(r.id)} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === r.id ? "bg-primary/10" : ""}`}>
                        <td className="px-5 py-2">
                          <button type="button" onClick={() => setAbierto(ver ? null : r.id)} className="inline-flex items-center gap-1 text-primary">
                            {ver ? <ChevronDown size={13} /> : <ChevronRight size={13} />} <Resaltar texto={r.codigo} termino={busqueda} />
                          </button>
                        </td>
                        <td className="px-3 py-2 text-ink"><Resaltar texto={nombreProy(r.proyecto_id)} termino={busqueda} /></td>
                        <td className="px-3 py-2">{r.fecha}</td>
                        <td className="px-3 py-2 text-right">{its.length}</td>
                        {gestiona && (
                          <td className="px-3 py-2 text-right">
                            {soles(its.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_referencial), 0))}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <Etiqueta tono={tonoEstadoReq(r.estado)}>{r.estado}</Etiqueta>
                          {r.clase === "tdr" && <span className="ml-1 text-[10px] text-muted-foreground">TDR</span>}
                          {r.rubro && <span className="ml-1 text-[10px] text-muted-foreground">{nombreRubro(r.rubro)}</span>}
                          {r.estado === "Rechazado" && r.motivo_rechazo && <span className="ml-1 text-[10px] text-bad" title={r.motivo_rechazo}>· {r.motivo_rechazo}</span>}
                        </td>
                      </tr>
                      {ver &&
                        its.flatMap((i) => [(
                          <tr key={i.id} className="border-b border-line/30 bg-muted/10">
                            <td className="px-5 py-1.5 pl-10 text-[10px] text-muted-foreground">{nombreTipo(i.tipo)}</td>
                            <td className="px-3 py-1.5">{i.descripcion}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{i.unidad}</td>
                            <td className="px-3 py-1.5 text-right">{num(Number(i.cantidad))}</td>
                            {gestiona && <td className="px-3 py-1.5 text-right">{soles(Number(i.cantidad) * Number(i.precio_referencial))}</td>}
                            <td />
                          </tr>
                        ), ...origenesReq
                          .filter((o) => o.requerimiento_item_id === i.id)
                          .map((o) => (
                            <tr key={o.id} className="border-b border-line/20 text-[11px] text-muted-foreground">
                              <td />
                              <td className="truncate px-3 py-1 pl-6" colSpan={2}><span className="text-primary">{o.partida_codigo || "—"}</span> {o.partida_nombre}</td>
                              <td className="px-3 py-1 text-right">{num(Number(o.metrado))} × {num(Number(o.cantidad_unitaria), 4)} = {num(Number(o.cantidad))}</td>
                              <td colSpan={gestiona ? 2 : 1} />
                            </tr>
                          ))])}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="mt-5">
          <Panel className="min-w-0 flex-1" titulo="Recepción en obra">
            {ocsPendientes.length === 0 ? (
              <Vacio texto="No hay órdenes de compra enviadas a las obras." />
            ) : (
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Orden</th>
                    <th className="px-3 py-2 font-medium">Obra</th>
                    <th className="px-3 py-2 font-medium">Requerimiento</th>
                    <th className="px-3 py-2 font-medium">Fecha entrega</th>
                    <th className="px-3 py-2 text-right font-medium">Ítems</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-5 py-2 text-right font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ocsPendientes.map((o) => (
                    <tr key={o.id} className="border-b border-line/40">
                      <td className="px-5 py-1.5 text-primary">{o.codigo}</td>
                      <td className="px-3 py-1.5 text-ink">{nombreProy(o.proyecto_id)}</td>
                      <td className="px-3 py-1.5">{reqs.find((r) => r.id === o.requerimiento_id)?.codigo ?? "—"}</td>
                      <td className="px-3 py-1.5">{o.fecha_entrega ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right">{itemsOC.filter((i) => i.orden_id === o.id).length}</td>
                      <td className="px-3 py-1.5"><Etiqueta tono={o.estado === "Recibida" ? "good" : o.estado === "Recibida parcial" ? "warn" : "neutro"}>{o.estado}</Etiqueta></td>
                      <td className="px-5 py-1.5 text-right">
                        <Boton variante="linea" className="py-0.5 text-xs" onClick={() => abrirRecepcion(o.id)}>
                          <PackageCheck size={13} className="mr-1 inline" /> Recepcionar
                        </Boton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>

      <BarraIconosHoja
        objeto="requerimiento"
        filtros={<MenuFiltros activos={busqueda ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={reqsVisibles.length} placeholder="Buscar por código, obra u observación..." /></MenuFiltros>}
        haySeleccion={!!actual}
        onEditar={editarActual}
        editarHabilitado={editable}
        onEliminar={() => { if (actual && eliminable) void eliminar(actual.id); }}
        eliminarHabilitado={eliminable}
        extras={
          <><BotonIcono etiqueta="Nuevo requerimiento por rubro (materiales, equipos, herramientas o EPP)" tono="primario" onClick={() => { setEditRubro(null); setVentanaRubro(true); }}>
            <PackagePlus size={15} />
          </BotonIcono>
          <BotonIcono etiqueta="Nuevo requerimiento con términos de referencia" onClick={() => { setTdr(TDR_VACIO); setEditTdr(null); setVentanaTdr(true); }}>
            <FileText size={15} />
          </BotonIcono></>
        }
      />
      </div>

      <VentanaRequerimientoRubro editar={editRubro} abierta={ventanaRubro} onCerrar={() => { setVentanaRubro(false); setEditRubro(null); }} proyectoId={proyectoId || null} proyectos={proyectos} onSeleccionarProyecto={(id) => setProyectoSel(id)} codigo={siguienteCodigo()} subtitulo={proyecto ? nombreProy(proyecto.id) : ""} onCreado={(m) => { setAviso(m); for (const k of ["requerimientos", "requerimiento_items"]) qc.invalidateQueries({ queryKey: [k] }); }} />

      <VentanaFlotante abierta={ventanaTdr} onCerrar={() => { setVentanaTdr(false); setEditTdr(null); }} titulo={editTdr ? `Editar ${editTdr.codigo}` : "Términos de Referencia"} subtitulo={`Subcontratos, servicios y alquileres · ${proyecto ? nombreProy(proyecto.id) : ""}`} ancho="max-w-3xl">
        <form className="grid grid-cols-2 gap-3 p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardarTdr(true); }}>
          <div className="col-span-2"><Campo etiqueta="Obra">
            <Select required value={proyectoId} onChange={(e) => setProyectoSel(e.target.value)}>
              <option value="">Seleccionar obra…</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre}</option>)}
            </Select>
          </Campo></div>
          <Campo etiqueta="Tipo">
            <Select value={tdr.tipo} onChange={(e) => setTdr({ ...tdr, tipo: e.target.value })}>
              {["Subcontrato", "Servicio", "Alquiler"].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Partida vinculada">
            <Select value={tdr.partida} onChange={(e) => setTdr({ ...tdr, partida: e.target.value })}>
              <option value="">Sin partida</option>
              {hojasObra.map((h) => <option key={h.id} value={`${h.codigo} ${h.nombre}`.trim()}>{h.codigo} {h.nombre}</option>)}
            </Select>
          </Campo>
          <div className="col-span-2"><Campo etiqueta="Objeto de la contratación"><Input required value={tdr.objeto} onChange={(e) => setTdr({ ...tdr, objeto: e.target.value })} /></Campo></div>
          {([["alcance", "Alcance"], ["entregables", "Entregables"], ["condiciones", "Condiciones y requisitos"]] as const).map(([k, t]) => (
            <div key={k} className="col-span-2">
              <Campo etiqueta={t}>
                <textarea className="min-h-16 w-full rounded border border-line bg-background px-2 py-1.5 text-xs" value={tdr[k]} onChange={(e) => setTdr({ ...tdr, [k]: e.target.value })} />
              </Campo>
            </div>
          ))}
          <Campo etiqueta="Plazo de ejecución"><Input value={tdr.plazo} onChange={(e) => setTdr({ ...tdr, plazo: e.target.value })} placeholder="Ej. 15 días calendario" /></Campo>
          <Campo etiqueta="Lugar"><Input value={tdr.lugar} onChange={(e) => setTdr({ ...tdr, lugar: e.target.value })} /></Campo>
          {gestiona && <Campo etiqueta="Monto referencial (S/)"><Input type="number" step="0.01" value={tdr.referencial} onChange={(e) => setTdr({ ...tdr, referencial: e.target.value })} /></Campo>}
          <div className="col-span-2 flex justify-end gap-2 border-t border-line pt-3">
            <Boton type="button" variante="linea" onClick={() => { setVentanaTdr(false); setEditTdr(null); }}>Cancelar</Boton>
            <Boton type="button" variante="linea" onClick={() => void guardarTdr(false)}>Guardar borrador</Boton>
            <Boton type="submit">Enviar a Gerencia</Boton>
          </div>
        </form>
      </VentanaFlotante>

      <VentanaFlotante abierta={!!recepcion} onCerrar={() => setRecepcion(null)} titulo={`Recepción en obra · ${ordenes.find((o) => o.id === recepcion?.orden)?.codigo ?? ""}`} subtitulo="Registra lo que llegó físicamente a la obra; admite recepción parcial." ancho="max-w-3xl">
        {recepcion && (
          <form className="p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardarRecepcion(); }}>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Campo etiqueta="Fecha de recepción"><Input type="date" value={recepcion.fecha} onChange={(e) => setRecepcion({ ...recepcion, fecha: e.target.value })} /></Campo>
              <Campo etiqueta="Observaciones"><Input value={recepcion.obs} onChange={(e) => setRecepcion({ ...recepcion, obs: e.target.value })} /></Campo>
            </div>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">Ítem</th>
                  <th className="px-2 py-1.5 font-medium">Und.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Ordenado</th>
                  <th className="px-2 py-1.5 text-right font-medium">Recibido</th>
                  <th className="px-2 py-1.5 text-right font-medium">Recibir ahora</th>
                </tr>
              </thead>
              <tbody>
                {itemsOC.filter((i) => i.orden_id === recepcion.orden).map((i) => {
                  const rec = recibidoOC(i.id);
                  return (
                    <tr key={i.id} className="border-b border-line/40">
                      <td className="px-2 py-1">{i.descripcion}</td>
                      <td className="px-2 py-1 text-muted-foreground">{i.unidad}</td>
                      <td className="px-2 py-1 text-right">{num(Number(i.cantidad))}</td>
                      <td className="px-2 py-1 text-right text-muted-foreground">{num(rec)}</td>
                      <td className="px-2 py-1 text-right">
                        <Input type="number" step="0.0001" min="0" max={saldoRecepcion(Number(i.cantidad), rec)} className="w-28 py-0.5 text-right text-xs" value={recepcion.cant[i.id] ?? ""} onChange={(e) => setRecepcion({ ...recepcion, cant: { ...recepcion.cant, [i.id]: e.target.value } })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
              <Boton type="button" variante="linea" onClick={() => setRecepcion(null)}>Cancelar</Boton>
              <Boton type="submit">Registrar recepción</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
    </>
  );
}

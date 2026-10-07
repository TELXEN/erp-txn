import { createFileRoute } from "@tanstack/react-router";
import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { useProyectos, useTerceros } from "@/lib/datos";
import { apuDb, useInsumos } from "@/lib/apu";
import { exportarExcel } from "@/lib/exportar";
import { num, useOrdenesCompra } from "@/lib/logistica";
import { LiquidacionImportacion } from "@/components/LiquidacionImportacion";
import { integrarImportacion } from "@/lib/importaciones-integrar";

export const Route = createFileRoute("/_authenticated/importaciones")({
  head: () => ({
    meta: [
      { title: "Importaciones — ERP TELXEN SAC" },
      { name: "description", content: "Carpetas de importación de equipos: proveedor extranjero, courier, tracking y estado." },
      { property: "og:title", content: "Importaciones — ERP TELXEN SAC" },
      { property: "og:description", content: "Registro y seguimiento de importaciones por Courier o DSI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportacionesPage,
});

type Importacion = {
  id: string; codigo: string; proveedor_id: string | null; proveedor_extranjero: string; pais_origen: string;
  proyecto_id: string | null; orden_id: string | null; tipo_despacho: string; transportista: string; tracking: string;
  incoterm: string; moneda: "USD" | "PEN"; fecha_pedido: string; fecha_embarque: string | null; fecha_arribo: string | null;
  estado: string; observacion: string; integrado: boolean; fecha_integracion: string | null; tipo_cambio: number; fecha_liquidacion: string | null; flete: number; seguro: number;
  pct_percepcion: number; gasto_handling: number; gasto_almacenaje: number; gasto_honorarios: number; gasto_flete_local: number; gasto_otros: number;
};
type ItemImp = {
  id: string; importacion_id: string; insumo_id: string | null; descripcion: string; partida_arancelaria: string;
  unidad: string; cantidad: number; precio_fob: number; pct_advalorem: number; costo_unitario_pen: number;
};
type Linea = { insumo_id: string | null; descripcion: string; partida_arancelaria: string; unidad: string; cantidad: string; precio_fob: string };

const ESTADOS = ["En tránsito", "En aduana", "Nacionalizado", "Liquidado", "Anulado"];
const DESPACHOS = ["Courier", "DSI", "Agente de aduana"];
const INCOTERMS = ["EXW", "FOB", "CIF", "CFR", "DAP", "DDP"];
const hoy = () => new Date().toISOString().slice(0, 10);
const usd = (n: number, m = "USD") => `${m === "USD" ? "US$" : "S/"} ${num(n)}`;

function useLista<T>(tabla: string) {
  return useQuery({
    queryKey: [tabla],
    queryFn: async () => {
      const { data, error } = await apuDb.from(tabla).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

const formVacio = {
  proveedor_id: "", proveedor_extranjero: "", pais_origen: "", proyecto_id: "", orden_id: "",
  tipo_despacho: "Courier", transportista: "", tracking: "", incoterm: "FOB", moneda: "USD",
  fecha_pedido: hoy(), fecha_embarque: "", fecha_arribo: "", observacion: "",
};

function ImportacionesPage() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: terceros = [] } = useTerceros();
  const { data: insumos = [] } = useInsumos();
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: imps = [] } = useLista<Importacion>("importaciones");
  const { data: items = [] } = useLista<ItemImp>("importacion_items");

  const [form, setForm] = useState(formVacio);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [insumoSel, setInsumoSel] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const cerrarTrasGuardar = useRef(false);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const proveedores = terceros.filter((t) => t.es_proveedor && t.activo);
  const nombreProy = (id: string | null) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "Almacén central";
  };
  const nombreProv = (i: Importacion) =>
    terceros.find((t) => t.id === i.proveedor_id)?.razon_social || i.proveedor_extranjero || "—";
  const fobDe = (id: string) =>
    items.filter((x) => x.importacion_id === id).reduce((s, x) => s + Number(x.cantidad) * Number(x.precio_fob), 0);
  const totalForm = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_fob || 0), 0);
  const set = (k: keyof typeof formVacio, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function agregarInsumo() {
    const ins = insumos.find((i) => i.id === insumoSel);
    setLineas((ls) => [
      ...ls,
      ins
        ? { insumo_id: ins.id, descripcion: ins.nombre, partida_arancelaria: "", unidad: ins.unidad, cantidad: "1", precio_fob: "" }
        : { insumo_id: null, descripcion: "", partida_arancelaria: "", unidad: "und", cantidad: "1", precio_fob: "" },
    ]);
    setInsumoSel("");
  }

  function siguienteCodigo() {
    const yy = new Date().getFullYear().toString().slice(2);
    const pref = `IMP-${yy}-`;
    const max = imps
      .filter((i) => i.codigo.startsWith(pref))
      .reduce((m, i) => Math.max(m, Number(i.codigo.slice(pref.length)) || 0), 0);
    return `${pref}${String(max + 1).padStart(3, "0")}`;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setAviso("");
    if (!form.proveedor_id && !form.proveedor_extranjero.trim()) return setError("Indica el proveedor extranjero.");
    const validas = lineas.filter((l) => l.descripcion.trim());
    if (!validas.length) return setError("Agrega al menos un equipo.");
    if (validas.some((l) => !(Number(l.cantidad) > 0) || !(Number(l.precio_fob) >= 0) || l.precio_fob === ""))
      return setError("Revisa cantidades y precios FOB.");
    if (form.fecha_embarque && form.fecha_embarque < form.fecha_pedido) return setError("El embarque no puede ser antes del pedido.");
    if (form.fecha_arribo && form.fecha_embarque && form.fecha_arribo < form.fecha_embarque)
      return setError("El arribo no puede ser antes del embarque.");
    setGuardando(true);
    const codigo = siguienteCodigo();
    const { data, error: e1 } = await apuDb
      .from("importaciones")
      .insert({
        ...form,
        codigo,
        proveedor_id: form.proveedor_id || null,
        proyecto_id: form.proyecto_id || null,
        orden_id: form.orden_id || null,
        fecha_embarque: form.fecha_embarque || null,
        fecha_arribo: form.fecha_arribo || null,
      })
      .select("id")
      .single();
    if (e1 || !data) { setGuardando(false); return setError(e1?.message ?? "No se pudo guardar."); }
    const { error: e2 } = await apuDb.from("importacion_items").insert(
      validas.map((l) => ({
        importacion_id: (data as { id: string }).id,
        insumo_id: l.insumo_id,
        descripcion: l.descripcion.trim(),
        partida_arancelaria: l.partida_arancelaria.trim(),
        unidad: l.unidad || "und",
        cantidad: Number(l.cantidad),
        precio_fob: Number(l.precio_fob),
      })),
    );
    setGuardando(false);
    if (e2) return setError(e2.message);
    setForm({ ...formVacio, fecha_pedido: hoy() });
    setLineas([]);
    setAviso(`Importación ${codigo} registrada.`);
    if (cerrarTrasGuardar.current) setModalNueva(false);
    qc.invalidateQueries({ queryKey: ["importaciones"] });
    qc.invalidateQueries({ queryKey: ["importacion_items"] });
  }

  async function actualizar(id: string, cambios: Partial<Importacion>) {
    const { error: e } = await apuDb.from("importaciones").update(cambios).eq("id", id);
    if (e) return setError(e.message);
    qc.invalidateQueries({ queryKey: ["importaciones"] });
  }

  async function integrar(i: Importacion, deImp: ItemImp[]) {
    setError(""); setAviso("");
    if (!confirm(`Se registrará ${i.codigo} en Almacén, Costos Directos y Tesorería (cuentas por pagar). ¿Continuar?`)) return;
    try {
      const r = await integrarImportacion(i, deImp, nombreProv(i), (id) => insumos.find((x) => x.id === id)?.tipo);
      setAviso(`${i.codigo} integrada: costo S/ ${num(r.costo)} cargado a la obra y crédito fiscal S/ ${num(r.credito)} registrado.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    qc.invalidateQueries();
  }

  async function eliminar(i: Importacion) {
    if (i.integrado) return setError("No se puede eliminar una importación integrada al ERP.");
    if (i.estado === "Liquidado") return setError("No se puede eliminar una importación liquidada.");
    if (!confirm(`¿Eliminar la importación ${i.codigo}?`)) return;
    const { error: e } = await apuDb.from("importaciones").delete().eq("id", i.id);
    if (e) return setError(e.message);
    qc.invalidateQueries({ queryKey: ["importaciones"] });
    qc.invalidateQueries({ queryKey: ["importacion_items"] });
  }

  const lista = imps.filter((i) => (!filtro || i.estado === filtro) && coincide(busqueda, i.codigo, nombreProv(i), nombreProy(i.proyecto_id), i.tracking, i.observacion));
  const activas = imps.filter((i) => i.estado === "En tránsito" || i.estado === "En aduana");
  const fobActivo = activas.reduce((s, i) => s + (i.moneda === "USD" ? fobDe(i.id) : 0), 0);
  const sobre2000 = form.moneda === "USD" && totalForm > 2000;

  function exportar() {
    exportarExcel("importaciones", [
      {
        nombre: "Importaciones",
        filas: lista.map((i) => ({
          Código: i.codigo, Proveedor: nombreProv(i), País: i.pais_origen, Destino: nombreProy(i.proyecto_id),
          Despacho: i.tipo_despacho, Transportista: i.transportista, Tracking: i.tracking, Incoterm: i.incoterm,
          Moneda: i.moneda, "Valor FOB": Math.round(fobDe(i.id) * 100) / 100, Pedido: i.fecha_pedido,
          Embarque: i.fecha_embarque ?? "", Arribo: i.fecha_arribo ?? "", Estado: i.estado,
        })),
      },
      {
        nombre: "Ítems",
        filas: items.map((x) => ({
          Importación: imps.find((i) => i.id === x.importacion_id)?.codigo ?? "", Equipo: x.descripcion,
          "Partida arancelaria": x.partida_arancelaria, Unidad: x.unidad, Cantidad: Number(x.cantidad),
          "Precio FOB": Number(x.precio_fob), "Total FOB": Math.round(Number(x.cantidad) * Number(x.precio_fob) * 100) / 100,
          "% Ad-Valorem": Number(x.pct_advalorem), "Costo unit. nacionalizado (S/)": Number(x.costo_unitario_pen),
        })),
      },
    ]);
  }

  return (
    <>
      <Encabezado
        titulo="Importaciones"
        subtitulo="Logística · carpetas de importación"
        acciones={<Boton variante="linea" onClick={exportar}><Upload size={14} className="mr-1 inline" /> Exportar a Excel</Boton>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="panel px-5 py-3"><p className="label-mono">En curso</p><p className="font-mono text-lg font-semibold">{activas.length}</p></div>
        <div className="panel px-5 py-3"><p className="label-mono">FOB en curso</p><p className="font-mono text-lg font-semibold text-primary">{usd(fobActivo)}</p></div>
        <div className="panel px-5 py-3"><p className="label-mono">Total registradas</p><p className="font-mono text-lg font-semibold">{imps.length}</p></div>
      </div>

      <VentanaFlotante abierta={modalNueva} onCerrar={() => setModalNueva(false)} titulo="Nueva importación" subtitulo="Registra varias carpetas consecutivamente y cierra cuando termines." ancho="max-w-7xl">
        <form onSubmit={guardar} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Campo etiqueta="Proveedor (registrado)">
              <Select value={form.proveedor_id} onChange={(e) => set("proveedor_id", e.target.value)}>
                <option value="">— Escribir nombre —</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </Select>
            </Campo>
            {!form.proveedor_id && (
              <Campo etiqueta="Proveedor extranjero">
                <Input value={form.proveedor_extranjero} onChange={(e) => set("proveedor_extranjero", e.target.value)} placeholder="Ej. Siemens AG" />
              </Campo>
            )}
            <Campo etiqueta="País de origen"><Input value={form.pais_origen} onChange={(e) => set("pais_origen", e.target.value)} placeholder="Ej. China" /></Campo>
            <Campo etiqueta="Destino">
              <Select value={form.proyecto_id} onChange={(e) => set("proyecto_id", e.target.value)}>
                <option value="">Almacén central</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Orden de compra (opcional)">
              <Select value={form.orden_id} onChange={(e) => set("orden_id", e.target.value)}>
                <option value="">Sin orden</option>
                {ordenes.filter((o) => o.estado !== "Anulada").map((o) => <option key={o.id} value={o.id}>{o.codigo}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Tipo de despacho">
              <Select value={form.tipo_despacho} onChange={(e) => set("tipo_despacho", e.target.value)}>
                {DESPACHOS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Courier / transportista"><Input value={form.transportista} onChange={(e) => set("transportista", e.target.value)} placeholder="DHL, FedEx, UPS…" /></Campo>
            <Campo etiqueta="Tracking / AWB"><Input value={form.tracking} onChange={(e) => set("tracking", e.target.value)} /></Campo>
            <Campo etiqueta="Incoterm">
              <Select value={form.incoterm} onChange={(e) => set("incoterm", e.target.value)}>{INCOTERMS.map((d) => <option key={d}>{d}</option>)}</Select>
            </Campo>
            <Campo etiqueta="Moneda">
              <Select value={form.moneda} onChange={(e) => set("moneda", e.target.value)}><option value="USD">USD</option><option value="PEN">PEN</option></Select>
            </Campo>
            <Campo etiqueta="Fecha de pedido"><Input type="date" value={form.fecha_pedido} onChange={(e) => set("fecha_pedido", e.target.value)} /></Campo>
            <Campo etiqueta="Fecha de embarque"><Input type="date" value={form.fecha_embarque} onChange={(e) => set("fecha_embarque", e.target.value)} /></Campo>
            <Campo etiqueta="Arribo estimado"><Input type="date" value={form.fecha_arribo} onChange={(e) => set("fecha_arribo", e.target.value)} /></Campo>
          </div>
          <Campo etiqueta="Observación"><Input value={form.observacion} onChange={(e) => set("observacion", e.target.value)} /></Campo>

          <div className="flex items-end gap-2">
            <Campo etiqueta="Agregar equipo del maestro de insumos">
              <Select className="w-80" value={insumoSel} onChange={(e) => setInsumoSel(e.target.value)}>
                <option value="">— Ítem libre —</option>
                {insumos.map((i) => <option key={i.id} value={i.id}>{i.codigo} · {i.nombre}</option>)}
              </Select>
            </Campo>
            <Boton type="button" variante="linea" onClick={agregarInsumo}><Plus size={14} className="mr-1 inline" /> Agregar</Boton>
          </div>

          {lineas.length > 0 && (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Equipo</th><th className="px-2 font-medium">Partida arancelaria</th>
                  <th className="px-2 font-medium">Und.</th><th className="px-2 text-right font-medium">Cantidad</th>
                  <th className="px-2 text-right font-medium">Precio FOB</th><th className="px-2 text-right font-medium">Total</th><th />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, k) => {
                  const upd = (c: Partial<Linea>) => setLineas((ls) => ls.map((x, j) => (j === k ? { ...x, ...c } : x)));
                  return (
                    <tr key={k} className="border-b border-line/40">
                      <td className="py-1 pr-2"><Input value={l.descripcion} onChange={(e) => upd({ descripcion: e.target.value })} /></td>
                      <td className="px-2"><Input className="w-32" value={l.partida_arancelaria} onChange={(e) => upd({ partida_arancelaria: e.target.value })} placeholder="8517.62.00.00" /></td>
                      <td className="px-2"><Input className="w-16" value={l.unidad} onChange={(e) => upd({ unidad: e.target.value })} /></td>
                      <td className="px-2"><Input className="w-20 text-right" type="number" step="any" value={l.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></td>
                      <td className="px-2"><Input className="w-28 text-right" type="number" step="any" value={l.precio_fob} onChange={(e) => upd({ precio_fob: e.target.value })} /></td>
                      <td className="px-2 text-right">{num(Number(l.cantidad || 0) * Number(l.precio_fob || 0))}</td>
                      <td className="px-2"><button type="button" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== k))} className="text-bad"><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
                <tr><td colSpan={5} className="py-2 text-right font-semibold">Valor FOB total</td><td className="px-2 text-right font-semibold">{usd(totalForm, form.moneda)}</td><td /></tr>
              </tbody>
            </table>
          )}
          {sobre2000 && form.tipo_despacho === "Courier" && (
            <p className="font-mono text-xs text-bad">El valor supera US$ 2,000: normalmente corresponde despacho DSI o con agente, no Courier simplificado.</p>
          )}
          {error && <p className="font-mono text-xs text-bad">{error}</p>}
          {aviso && <p className="font-mono text-xs text-primary">{aviso}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Boton type="button" variante="linea" onClick={() => setModalNueva(false)}>Cancelar</Boton>
            <Boton type="submit" variante="linea" disabled={guardando} onClick={() => { cerrarTrasGuardar.current = false; }}>{guardando ? "Guardando…" : "Registrar otra"}</Boton>
            <Boton type="submit" disabled={guardando} onClick={() => { cerrarTrasGuardar.current = true; }}>{guardando ? "Guardando…" : "Registrar y cerrar"}</Boton>
          </div>
        </form>
      </VentanaFlotante>

      <div className="mt-5" />
      <Panel
        titulo="Carpetas de importación"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código, proveedor, obra, tracking..." total={lista.length} />
            <Select className="w-48 py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Boton variante="accion" onClick={() => { setError(""); setAviso(""); setModalNueva(true); }}><Plus size={13} /> Nueva importación</Boton>
          </div>
        }
      >
        {lista.length === 0 ? (
          <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay importaciones registradas."} />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Código</th><th className="px-3 font-medium">Proveedor</th>
                <th className="px-3 font-medium">Destino</th><th className="px-3 font-medium">Despacho</th>
                <th className="px-3 font-medium">Tracking</th><th className="px-3 font-medium">Arribo</th>
                <th className="px-3 text-right font-medium">FOB</th><th className="px-3 text-right font-medium">Costo S/</th><th className="px-3 font-medium">Estado</th><th />
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => {
                const deImp = items.filter((x) => x.importacion_id === i.id);
                return (
                  <React.Fragment key={i.id}>
                    <tr className="border-b border-line/40">
                      <td className="px-5 py-2">
                        <button className="flex items-center gap-1 font-semibold text-ink" onClick={() => setAbierto(abierto === i.id ? null : i.id)}>
                          {abierto === i.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {i.codigo}
                        </button>
                      </td>
                      <td className="px-3">{nombreProv(i)}{i.pais_origen && <span className="text-muted-foreground"> · {i.pais_origen}</span>}</td>
                      <td className="px-3">{nombreProy(i.proyecto_id)}</td>
                      <td className="px-3">{i.tipo_despacho}{i.transportista && ` · ${i.transportista}`}</td>
                      <td className="px-3">{i.tracking || "—"}</td>
                      <td className="px-3">{i.fecha_arribo ?? "—"}</td>
                      <td className="px-3 text-right">{usd(fobDe(i.id), i.moneda)}</td>
                      <td className="px-3 text-right">{(() => { const c = deImp.reduce((t, x) => t + Number(x.cantidad) * Number(x.costo_unitario_pen), 0); return c > 0 ? usd(c, "PEN") : "—"; })()}</td>
                      <td className="px-3">
                        <Select className="py-0.5 text-xs" disabled={i.integrado} value={i.estado} onChange={(e) => actualizar(i.id, { estado: e.target.value })}>
                          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                      </td>
                      <td className="px-3"><button onClick={() => eliminar(i)} className="text-bad" title="Eliminar"><Trash2 size={14} /></button></td>
                    </tr>
                    {abierto === i.id && (
                      <tr className="bg-muted/40">
                        <td colSpan={10} className="px-8 py-3">
                          <div className="mb-2 flex flex-wrap gap-4 text-muted-foreground">
                            <span>Incoterm: {i.incoterm}</span><span>Pedido: {i.fecha_pedido}</span>
                            <span>Embarque: {i.fecha_embarque ?? "—"}</span>
                            <span>OC: {ordenes.find((o) => o.id === i.orden_id)?.codigo ?? "—"}</span>
                            {i.observacion && <span>Obs.: {i.observacion}</span>}
                          </div>
                          <table className="w-full">
                            <tbody>
                              {deImp.map((x) => (
                                <tr key={x.id} className="border-b border-line/30">
                                  <td className="py-1">{x.descripcion}</td>
                                  <td className="px-2 text-muted-foreground">{x.partida_arancelaria || "—"}</td>
                                  <td className="px-2 text-right">{num(x.cantidad)} {x.unidad}</td>
                                  <td className="px-2 text-right">{usd(x.precio_fob, i.moneda)}</td>
                                  <td className="px-2 text-right font-semibold">{usd(Number(x.cantidad) * Number(x.precio_fob), i.moneda)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {i.integrado ? (
                            <p className="mt-3 text-primary">Integrada al ERP el {i.fecha_integracion}: ingreso en Almacén, compra en Costos Directos y cuentas por pagar en Tesorería.</p>
                          ) : i.estado === "Liquidado" && deImp.length > 0 ? (
                            <div className="mt-3 flex items-center gap-3">
                              <Boton onClick={() => integrar(i, deImp)}>Integrar a Almacén, Costos Directos y Tesorería</Boton>
                              <Select className="w-64 py-1 text-xs" value={i.proyecto_id ?? ""} onChange={(e) => actualizar(i.id, { proyecto_id: e.target.value || null })}>
                                <option value="">— Elige la obra de destino —</option>
                                {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
                              </Select>
                            </div>
                          ) : null}
                          {!i.integrado && deImp.length > 0 && i.estado !== "Anulado" && (
                            <LiquidacionImportacion
                              key={`${i.id}-${i.estado}`}
                              imp={i}
                              items={deImp}
                              onGuardado={() => {
                                qc.invalidateQueries({ queryKey: ["importaciones"] });
                                qc.invalidateQueries({ queryKey: ["importacion_items"] });
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

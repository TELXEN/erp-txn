import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, PackageCheck, Plus, Trash2, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { useProyectos, useTerceros } from "@/lib/datos";
import { apuDb, useInsumos } from "@/lib/apu";
import { exportarExcel } from "@/lib/exportar";
import {
  ESTADOS_OC,
  num,
  useItemsOC,
  useItemsReq,
  useMovimientos,
  useOrdenesCompra,
  useRequerimientos,
} from "@/lib/logistica";

export const Route = createFileRoute("/_authenticated/ordenes-compra")({
  head: () => ({
    meta: [
      { title: "Órdenes de Compra — ERP TELXEN SAC" },
      { name: "description", content: "Órdenes de compra a proveedores, generadas desde requerimientos y recibidas en almacén." },
      { property: "og:title", content: "Órdenes de Compra — ERP TELXEN SAC" },
      { property: "og:description", content: "Órdenes de compra a proveedores por obra." },
    ],
  }),
  component: OrdenesCompraPage,
});

type Linea = { insumo_id: string | null; descripcion: string; unidad: string; cantidad: string; precio_unitario: string };
const hoy = () => new Date().toISOString().slice(0, 10);

function OrdenesCompraPage() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: terceros = [] } = useTerceros();
  const { data: insumos = [] } = useInsumos();
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: itemsOC = [] } = useItemsOC();
  const { data: reqs = [] } = useRequerimientos();
  const { data: itemsReq = [] } = useItemsReq();
  const { data: movs = [] } = useMovimientos();

  const [form, setForm] = useState({
    proyecto_id: "",
    proveedor_id: "",
    requerimiento_id: "",
    fecha_entrega: "",
    condicion_pago: "Contado",
    observacion: "",
  });
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [insumoSel, setInsumoSel] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const proveedores = terceros.filter((t) => t.es_proveedor && t.activo);
  const nombreProy = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const nombreProv = (id: string | null) => terceros.find((t) => t.id === id)?.razon_social ?? "—";

  /** Cantidad ya ordenada por requerimiento + insumo (OC no anuladas). */
  const ordenado = (reqId: string, clave: string) =>
    itemsOC
      .filter((i) => {
        const oc = ordenes.find((o) => o.id === i.orden_id);
        return oc?.requerimiento_id === reqId && oc.estado !== "Anulada" && (i.insumo_id ?? i.descripcion) === clave;
      })
      .reduce((s, i) => s + Number(i.cantidad), 0);

  const recibido = (itemId: string) =>
    movs.filter((m) => m.orden_item_id === itemId && m.tipo === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);

  const reqsDisponibles = reqs.filter(
    (r) => r.proyecto_id === form.proyecto_id && (r.estado === "Aprobado" || r.estado === "Pendiente"),
  );

  function cargarRequerimiento(reqId: string) {
    setForm({ ...form, requerimiento_id: reqId });
    if (!reqId) return setLineas([]);
    const nuevas = itemsReq
      .filter((i) => i.requerimiento_id === reqId)
      .map((i) => {
        const saldo = Number(i.cantidad) - ordenado(reqId, i.insumo_id ?? i.descripcion);
        return {
          insumo_id: i.insumo_id,
          descripcion: i.descripcion,
          unidad: i.unidad,
          cantidad: String(Math.max(0, Math.round(saldo * 10000) / 10000)),
          precio_unitario: String(i.precio_referencial),
        };
      })
      .filter((l) => Number(l.cantidad) > 0);
    setLineas(nuevas);
    if (!nuevas.length) setError("Este requerimiento ya está totalmente ordenado.");
  }

  function agregarInsumo() {
    const ins = insumos.find((i) => i.id === insumoSel);
    if (!ins) return;
    setLineas([
      ...lineas,
      { insumo_id: ins.id, descripcion: ins.nombre, unidad: ins.unidad, cantidad: "1", precio_unitario: String(ins.precio) },
    ]);
    setInsumoSel("");
  }

  const totalForm = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (!form.proyecto_id) return setError("Selecciona la obra.");
    if (!form.proveedor_id) return setError("Selecciona el proveedor.");
    const validas = lineas.filter((l) => Number(l.cantidad) > 0 && l.descripcion.trim());
    if (!validas.length) return setError("Agrega al menos un ítem con cantidad.");
    const proy = proyectos.find((p) => p.id === form.proyecto_id);
    const n = ordenes.filter((o) => o.proyecto_id === form.proyecto_id).length + 1;
    const codigo = `OC-${proy?.codigo || "OBRA"}-${String(n).padStart(3, "0")}`;
    const { data: oc, error: e1 } = await apuDb
      .from("ordenes_compra")
      .insert({
        codigo,
        proyecto_id: form.proyecto_id,
        proveedor_id: form.proveedor_id,
        requerimiento_id: form.requerimiento_id || null,
        fecha_entrega: form.fecha_entrega || null,
        condicion_pago: form.condicion_pago,
        observacion: form.observacion.trim(),
      })
      .select("id")
      .single();
    if (e1) return setError(e1.message);
    const { error: e2 } = await apuDb.from("orden_compra_items").insert(
      validas.map((l) => ({
        orden_id: oc.id,
        insumo_id: l.insumo_id,
        descripcion: l.descripcion.trim(),
        unidad: l.unidad,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario || 0),
      })),
    );
    if (e2) return setError(e2.message);
    if (form.requerimiento_id) {
      const pendiente = itemsReq
        .filter((i) => i.requerimiento_id === form.requerimiento_id)
        .some((i) => {
          const clave = i.insumo_id ?? i.descripcion;
          const nuevo = validas.filter((l) => (l.insumo_id ?? l.descripcion) === clave).reduce((s, l) => s + Number(l.cantidad), 0);
          return Number(i.cantidad) - ordenado(form.requerimiento_id, clave) - nuevo > 0.0001;
        });
      if (!pendiente) await apuDb.from("requerimientos").update({ estado: "Atendido" }).eq("id", form.requerimiento_id);
    }
    setAviso(`Orden ${codigo} emitida.`);
    setLineas([]);
    setForm({ ...form, requerimiento_id: "", observacion: "", fecha_entrega: "" });
    setAbierto(oc.id);
    for (const k of ["ordenes_compra", "orden_compra_items", "requerimientos"]) qc.invalidateQueries({ queryKey: [k] });
  }

  async function cambiarEstado(id: string, estado: string) {
    const { error: err } = await apuDb.from("ordenes_compra").update({ estado }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["ordenes_compra"] });
  }

  async function recibir(ocId: string) {
    const oc = ordenes.find((o) => o.id === ocId);
    if (!oc) return;
    const pendientes = itemsOC
      .filter((i) => i.orden_id === ocId)
      .map((i) => ({ i, saldo: Number(i.cantidad) - recibido(i.id) }))
      .filter((x) => x.saldo > 0.0001);
    if (!pendientes.length) return setError("Esta orden ya fue recibida por completo.");
    if (!window.confirm(`Se registrará el ingreso a almacén de ${pendientes.length} ítem(s) pendientes de ${oc.codigo}. ¿Continuar?`)) return;
    setError("");
    const { error: err } = await apuDb.from("movimientos_almacen").insert(
      pendientes.map(({ i, saldo }) => ({
        fecha: hoy(),
        tipo: "Ingreso",
        proyecto_id: oc.proyecto_id,
        insumo_id: i.insumo_id,
        descripcion: i.descripcion,
        unidad: i.unidad,
        cantidad: Math.round(saldo * 10000) / 10000,
        costo_unitario: Number(i.precio_unitario),
        orden_item_id: i.id,
        documento: oc.codigo,
        observacion: "Recepción de orden de compra",
      })),
    );
    if (err) return setError(err.message);

    // Compra en Costos Directos + cuenta por pagar (el pago se registra en Tesorería).
    const { data: parts } = await apuDb.from("partidas").select("id,padre_id").eq("proyecto_id", oc.proyecto_id);
    const lista = (parts ?? []) as { id: string; padre_id: string | null }[];
    const hojas = lista.filter((p) => !lista.some((h) => h.padre_id === p.id)).map((p) => p.id);
    if (!hojas.length) {
      setError(`${oc.codigo} recibida en almacén, pero la obra no tiene partidas: la compra no se cargó a Costos Directos.`);
    } else {
      const { data: comps } = await apuDb.from("apu_componentes").select("partida_id,insumo_id,cantidad,cuadrilla").in("partida_id", hojas);
      const partidaDe = (insumoId: string | null) => {
        const c = ((comps ?? []) as { partida_id: string; insumo_id: string; cantidad: number }[])
          .filter((x) => x.insumo_id === insumoId)
          .sort((a, b) => Number(b.cantidad) - Number(a.cantidad))[0];
        return c?.partida_id ?? hojas[0];
      };
      const m = oc.condicion_pago.match(/(\d+)/);
      const dias = m ? Number(m[1]) : 0;
      const venc = new Date(hoy());
      venc.setDate(venc.getDate() + dias);
      const prov = terceros.find((t) => t.id === oc.proveedor_id);
      const rubroDe = (id: string | null) => {
        const t = insumos.find((x) => x.id === id)?.tipo;
        return t === "EQ" ? "Equipos" : t === "SC" ? "Subcontratos" : t === "MO" ? "Servicios" : "Materiales";
      };
      const { error: e2 } = await apuDb.from("gastos_directos").insert(
        pendientes.map(({ i, saldo }) => {
          const cant = Math.round(saldo * 10000) / 10000;
          const monto = cant * Number(i.precio_unitario);
          return {
            proyecto_id: oc.proyecto_id,
            partida_id: partidaDe(i.insumo_id),
            descripcion: i.descripcion,
            proveedor: prov?.razon_social ?? "",
            proveedor_id: oc.proveedor_id,
            cantidad: cant,
            precio_unitario: Number(i.precio_unitario),
            comprobante: oc.codigo,
            monto,
            moneda: "PEN",
            tipo_cambio: 1,
            monto_soles: monto,
            rubro: rubroDe(i.insumo_id),
            fecha: hoy(),
            condicion_pago: dias > 0 ? "Crédito" : "Contado",
            dias_credito: dias,
            fecha_vencimiento: venc.toISOString().slice(0, 10),
            estado_pago: "Pendiente",
            numero_operacion: "",
          };
        }),
      );
      if (e2) setError(`Recibida en almacén, pero no se pudo cargar a Costos Directos: ${e2.message}`);
    }

    await apuDb.from("ordenes_compra").update({ estado: "Recibida" }).eq("id", ocId);
    setAviso(`${oc.codigo} recibida en almacén, cargada a Costos Directos y registrada como cuenta por pagar en Tesorería.`);
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
    qc.invalidateQueries({ queryKey: ["movimientos_almacen"] });
    qc.invalidateQueries({ queryKey: ["ordenes_compra"] });
  }

  async function eliminar(id: string) {
    if (movs.some((m) => itemsOC.some((i) => i.orden_id === id && i.id === m.orden_item_id)))
      return setError("La orden ya tiene ingresos en almacén; anúlala en lugar de eliminarla.");
    if (!window.confirm("¿Eliminar esta orden de compra?")) return;
    const { error: err } = await apuDb.from("ordenes_compra").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["ordenes_compra"] });
    qc.invalidateQueries({ queryKey: ["orden_compra_items"] });
  }

  const visibles = ordenes.filter((o) => (!filtro || o.proyecto_id === filtro) && coincide(busqueda, o.codigo, nombreProy(o.proyecto_id), nombreProv(o.proveedor_id), o.observacion));
  const totalOC = (id: string) =>
    itemsOC.filter((i) => i.orden_id === id).reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0);

  function exportar() {
    exportarExcel("ordenes-compra", [
      {
        nombre: "Órdenes de compra",
        filas: visibles.map((o) => ({
          Código: o.codigo,
          Obra: nombreProy(o.proyecto_id),
          Proveedor: nombreProv(o.proveedor_id),
          Requerimiento: reqs.find((r) => r.id === o.requerimiento_id)?.codigo ?? "",
          Fecha: o.fecha,
          "Fecha de entrega": o.fecha_entrega ?? "",
          "Condición de pago": o.condicion_pago,
          Estado: o.estado,
          "Total (S/)": Math.round(totalOC(o.id) * 100) / 100,
        })),
      },
      {
        nombre: "Detalle",
        filas: itemsOC
          .filter((i) => visibles.some((o) => o.id === i.orden_id))
          .map((i) => ({
            Orden: ordenes.find((o) => o.id === i.orden_id)?.codigo ?? "",
            Descripción: i.descripcion,
            Unidad: i.unidad,
            Cantidad: Number(i.cantidad),
            Recibido: recibido(i.id),
            "P.U. (S/)": Number(i.precio_unitario),
            "Parcial (S/)": Math.round(Number(i.cantidad) * Number(i.precio_unitario) * 100) / 100,
          })),
      },
    ]);
  }

  return (
    <>
      <Encabezado
        titulo="Órdenes de Compra"
        subtitulo="Logística"
        acciones={
          <Boton variante="linea" onClick={exportar}>
            <Upload size={14} className="mr-1 inline" /> Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Nueva orden de compra" className="mb-5">
        <form onSubmit={guardar} className="space-y-3 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Obra">
              <Select value={form.proyecto_id} onChange={(e) => { setForm({ ...form, proyecto_id: e.target.value, requerimiento_id: "" }); setLineas([]); }}>
                <option value="">Seleccionar…</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Proveedor">
              <Select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}>
                <option value="">Seleccionar…</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Desde requerimiento (opcional)">
              <Select value={form.requerimiento_id} disabled={!form.proyecto_id} onChange={(e) => cargarRequerimiento(e.target.value)}>
                <option value="">Sin requerimiento</option>
                {reqsDisponibles.map((r) => <option key={r.id} value={r.id}>{r.codigo} · {r.estado}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Fecha de entrega">
              <Input type="date" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} />
            </Campo>
            <Campo etiqueta="Condición de pago">
              <Select value={form.condicion_pago} onChange={(e) => setForm({ ...form, condicion_pago: e.target.value })}>
                {["Contado", "Crédito 15 días", "Crédito 30 días", "Crédito 45 días", "Crédito 60 días"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Observación">
              <Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
            </Campo>
          </div>

          {lineas.length > 0 && (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-2 font-medium">Descripción</th>
                  <th className="w-20 px-2 py-2 font-medium">Und.</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">Cantidad</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">P.U. (S/)</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">Parcial</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, idx) => {
                  const set = (c: Partial<Linea>) => setLineas(lineas.map((x, j) => (j === idx ? { ...x, ...c } : x)));
                  return (
                    <tr key={idx} className="border-b border-line/40">
                      <td className="py-1 text-ink">{l.descripcion}</td>
                      <td className="px-2 py-1 text-muted-foreground">{l.unidad}</td>
                      <td className="px-2 py-1"><Input className="py-0.5 text-right text-xs" type="number" step="0.0001" min="0" value={l.cantidad} onChange={(e) => set({ cantidad: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input className="py-0.5 text-right text-xs" type="number" step="0.01" min="0" value={l.precio_unitario} onChange={(e) => set({ precio_unitario: e.target.value })} /></td>
                      <td className="px-2 py-1 text-right">{soles(Number(l.cantidad || 0) * Number(l.precio_unitario || 0))}</td>
                      <td className="text-right">
                        <button type="button" title="Quitar" onClick={() => setLineas(lineas.filter((_, j) => j !== idx))} className="text-muted-foreground hover:text-bad"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={4} className="py-2 text-right font-semibold">Total (sin IGV)</td>
                  <td className="px-2 py-2 text-right font-semibold text-primary">{soles(totalForm)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Select className="min-w-0 flex-1 text-xs" value={insumoSel} onChange={(e) => setInsumoSel(e.target.value)}>
              <option value="">Agregar insumo del maestro…</option>
              {insumos.filter((i) => i.activo && i.tipo !== "MO").map((i) => (
                <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
              ))}
            </Select>
            <Boton type="button" variante="linea" onClick={agregarInsumo}><Plus size={14} className="mr-1 inline" /> Agregar</Boton>
            <Boton type="submit">Emitir orden</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad">{error}</p>}
          {aviso && <p className="font-mono text-xs text-primary">{aviso}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Órdenes emitidas"
        extra={
          <Select className="w-64 py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas las obras</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
          </Select>
        }
      >
        {visibles.length === 0 ? (
          {busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Todavía no hay órdenes de compra." />}
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Obra</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Entrega</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((o) => {
                const its = itemsOC.filter((i) => i.orden_id === o.id);
                const ver = abierto === o.id;
                return (
                  <React.Fragment key={o.id}>
                    <tr className="border-b border-line/40">
                      <td className="px-5 py-2">
                        <button type="button" onClick={() => setAbierto(ver ? null : o.id)} className="inline-flex items-center gap-1 text-primary">
                          {ver ? <ChevronDown size={13} /> : <ChevronRight size={13} />} <Resaltar texto={o.codigo} termino={busqueda} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-ink"><Resaltar texto={nombreProy(o.proyecto_id)} termino={busqueda} /></td>
                      <td className="px-3 py-2"><Resaltar texto={nombreProv(o.proveedor_id)} termino={busqueda} /></td>
                      <td className="px-3 py-2">{o.fecha}</td>
                      <td className="px-3 py-2">{o.fecha_entrega ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{soles(totalOC(o.id))}</td>
                      <td className="px-3 py-2">
                        <Select className="py-0.5 text-xs" value={o.estado} onChange={(e) => void cambiarEstado(o.id, e.target.value)}>
                          {ESTADOS_OC.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {o.estado !== "Anulada" && o.estado !== "Recibida" && (
                            <button type="button" title="Recibir en almacén" onClick={() => void recibir(o.id)} className="text-muted-foreground hover:text-primary">
                              <PackageCheck size={15} />
                            </button>
                          )}
                          <button type="button" title="Eliminar" onClick={() => void eliminar(o.id)} className="text-muted-foreground hover:text-bad">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {ver &&
                      its.map((i) => (
                        <tr key={i.id} className="border-b border-line/30 bg-muted/10">
                          <td className="px-5 py-1.5 pl-10 text-[10px] text-muted-foreground">{i.unidad}</td>
                          <td colSpan={2} className="px-3 py-1.5">{i.descripcion}</td>
                          <td className="px-3 py-1.5 text-right">{num(Number(i.cantidad))}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground">Recibido {num(recibido(i.id))}</td>
                          <td className="px-3 py-1.5 text-right">{soles(Number(i.cantidad) * Number(i.precio_unitario))}</td>
                          <td colSpan={2} className="px-3 py-1.5 text-muted-foreground">P.U. {num(Number(i.precio_unitario))}</td>
                        </tr>
                      ))}
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

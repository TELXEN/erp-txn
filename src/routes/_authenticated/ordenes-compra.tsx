import { useRecordado } from "@/lib/recordado";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { createFileRoute } from "@tanstack/react-router";
import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, PackageCheck, Plus, Printer, Trash2, Truck, Upload } from "lucide-react";
import { HojaOrdenCompra, imprimirOrdenCompra } from "@/components/HojaOrdenCompra";
import { useEmpresa } from "@/lib/empresa";
import { montosOrdenCompra } from "@/lib/orden-compra-montos";
import { Encabezado } from "@/components/AppShell";
import { Boton, BotonIcono, Campo, Input, MenuFiltros, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { useGastosDirectos, useProyectos, useTerceros } from "@/lib/datos";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdenesCompraPage,
});

type Linea = { requerimiento_item_id?: string | null; insumo_id: string | null; descripcion: string; unidad: string; cantidad: string; precio_unitario: string };
const hoy = () => new Date().toISOString().slice(0, 10);

function OrdenesCompraPage() {
  const { rol } = useAuth();
  const { data: empresa } = useEmpresa();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: terceros = [] } = useTerceros();
  const { data: insumos = [] } = useInsumos();
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: itemsOC = [] } = useItemsOC();
  const { data: reqs = [] } = useRequerimientos();
  const { data: itemsReq = [] } = useItemsReq();
  const { data: movs = [] } = useMovimientos();
  const { data: gastos = [] } = useGastosDirectos();
  /** Trazabilidad OC → compra registrada → pago. */
  const estadoCompra = (itemId: string) => {
    const g = (gastos as unknown as { orden_compra_item_id?: string | null; estado_pago?: string; monto_soles?: number }[]).filter((x) => x.orden_compra_item_id === itemId);
    if (!g.length) return "Sin compra registrada";
    const pagado = g.filter((x) => x.estado_pago === "Pagada").reduce((a, x) => a + Number(x.monto_soles || 0), 0);
    const total = g.reduce((a, x) => a + Number(x.monto_soles || 0), 0);
    return pagado >= total - 0.005 ? "Pagado" : pagado > 0 ? `Pagado ${soles(pagado)} de ${soles(total)}` : "Por pagar";
  };

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
  const [filtro, setFiltro] = useRecordado("ordenes-compra:obra", "");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useRecordado("ordenes-compra:busqueda", "");
  const [sel, setSel] = useState("");
  const actual = ordenes.find((x) => x.id === sel);
  const [modalNueva, setModalNueva] = useState(false);
  const [verDocumento, setVerDocumento] = useState(false);
  const documentoRef = useRef<HTMLDivElement>(null);
  const cerrarTrasGuardar = useRef(false);

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
    (r) => r.proyecto_id === form.proyecto_id && (r.estado === "Aprobado" || r.estado === "En cotización"),
  );

  function cargarRequerimiento(reqId: string) {
    setForm({ ...form, requerimiento_id: reqId });
    if (!reqId) return setLineas([]);
    const nuevas = itemsReq
      .filter((i) => i.requerimiento_id === reqId)
      .map((i) => {
        const saldo = Number(i.cantidad) - ordenado(reqId, i.insumo_id ?? i.descripcion);
        return {
          requerimiento_item_id: i.id,
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
  const desglosar = (filas: { insumo_id: string | null; cantidad: string | number; precio_unitario: string | number; requerimiento_item_id?: string | null }[], reqId?: string | null) => montosOrdenCompra(filas.map((i) => ({ cantidad: Number(i.cantidad || 0), precio_unitario: Number(i.precio_unitario || 0), tipo: itemsReq.find((r) => r.id === i.requerimiento_item_id || (reqId && r.requerimiento_id === reqId && i.insumo_id && r.insumo_id === i.insumo_id))?.tipo ?? insumos.find((ins) => ins.id === i.insumo_id)?.tipo ?? "" })));
  const montosForm = desglosar(lineas, form.requerimiento_id);

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
        requerimiento_item_id: l.requerimiento_item_id ?? null,
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
      await apuDb.from("requerimientos").update({ estado: pendiente ? "En cotización" : "Orden emitida" }).eq("id", form.requerimiento_id);
    }
    setAviso(`Orden ${codigo} emitida.`);
    setLineas([]);
    setForm({ ...form, requerimiento_id: "", observacion: "", fecha_entrega: "" });
    setAbierto(oc.id);
    setSel(oc.id);
    if (cerrarTrasGuardar.current) setModalNueva(false);
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
    // Ítems ya recepcionados en obra pero aún sin cargar a Costos Directos.
    const conGasto = new Set((gastos as unknown as { orden_compra_item_id?: string | null }[]).map((g) => g.orden_compra_item_id).filter(Boolean));
    const porCostear = itemsOC
      .filter((i) => i.orden_id === ocId && !conGasto.has(i.id))
      .map((i) => ({ i, saldo: Number(i.cantidad) }));
    if (!pendientes.length && !porCostear.length) return setError("Esta orden ya fue recibida y cargada a costos por completo.");
    if (!window.confirm(pendientes.length ? `Se registrará el ingreso a almacén de ${pendientes.length} ítem(s) pendientes de ${oc.codigo}. ¿Continuar?` : `${oc.codigo} ya fue recepcionada en obra. ¿Cargarla a Costos Directos y cuentas por pagar?`)) return;
    setError("");
    if (pendientes.length) {
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
    }

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
        porCostear.map(({ i, saldo }) => {
          const cant = Math.round(saldo * 10000) / 10000;
          const monto = cant * Number(i.precio_unitario);
          return {
            proyecto_id: oc.proyecto_id,
            orden_compra_item_id: i.id,
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
  const desgloseOC = (id: string) => desglosar(itemsOC.filter((i) => i.orden_id === id), ordenes.find((o) => o.id === id)?.requerimiento_id);

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
          "Subtotal (S/)": desgloseOC(o.id).subtotal,
          "IGV (S/)": desgloseOC(o.id).igv,
          "Total (S/)": desgloseOC(o.id).total,
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

      <VentanaFlotante abierta={modalNueva} onCerrar={() => setModalNueva(false)} titulo="Nueva orden de compra" subtitulo="Emite varias órdenes consecutivamente y cierra cuando termines." ancho="max-w-7xl">
        <form onSubmit={guardar} className="space-y-3 px-5 py-4">
          <HojaOrdenCompra empresa={empresa ?? null} codigo="POR EMITIR" estado="Borrador">
          <div className="oc-data grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Obra">
              <Select autoFocus value={form.proyecto_id} onChange={(e) => { setForm({ ...form, proyecto_id: e.target.value, requerimiento_id: "" }); setLineas([]); }}>
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
                        <button type="button" title="Quitar" onClick={() => setLineas(lineas.filter((_, j) => j !== idx))} className="text-bad"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={4} className="py-2 text-right font-semibold">Total (sin IGV)</td>
                  <td className="px-2 py-2 text-right font-semibold text-primary">{soles(totalForm)}</td>
                  <td />
                </tr>
                {montosForm.materiales && <>
                  <tr><td colSpan={4} className="py-1 text-right">IGV (18.00 %)</td><td className="px-2 py-1 text-right">{soles(montosForm.igv)}</td><td /></tr>
                  <tr><td colSpan={4} className="py-2 text-right font-semibold">TOTAL CON IGV</td><td className="px-2 py-2 text-right font-semibold">{soles(montosForm.total)}</td><td /></tr>
                </>}
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
            <Boton type="button" variante="linea" onClick={() => setModalNueva(false)}>Cancelar</Boton>
            <Boton type="submit" variante="linea" onClick={() => { cerrarTrasGuardar.current = false; }}>Emitir otra</Boton>
            <Boton type="submit" onClick={() => { cerrarTrasGuardar.current = true; }}>Emitir y cerrar</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad">{error}</p>}
          {aviso && <p className="font-mono text-xs text-primary">{aviso}</p>}
          </HojaOrdenCompra>
        </form>
      </VentanaFlotante>

      <VentanaFlotante abierta={verDocumento && !!actual} onCerrar={() => setVerDocumento(false)} titulo="Orden de compra" subtitulo={actual?.codigo ?? ""} ancho="max-w-5xl">
        {actual && <div className="flex items-start gap-3 p-4">
          <div ref={documentoRef} className="min-w-0 flex-1">
            <HojaOrdenCompra empresa={empresa ?? null} codigo={actual.codigo} estado={actual.estado}>
              <div className="oc-data">
                <div><h3>PROVEEDOR</h3><p><b>Razón social:</b> {nombreProv(actual.proveedor_id)}</p><p><b>RUC / DNI:</b> {terceros.find((t) => t.id === actual.proveedor_id)?.numero_documento || "—"}</p><p><b>Dirección:</b> {terceros.find((t) => t.id === actual.proveedor_id)?.direccion || "—"}</p></div>
                <div><h3>PROYECTO / REFERENCIA</h3><p>{nombreProy(actual.proyecto_id)}</p><p><b>Requerimiento:</b> {reqs.find((r) => r.id === actual.requerimiento_id)?.codigo || "—"}</p><p><b>Emisión:</b> {actual.fecha}</p><p><b>Entrega:</b> {actual.fecha_entrega || "—"}</p></div>
              </div>
              <table><colgroup><col className="w-[5%]" /><col className="w-[39%]" /><col className="w-[10%]" /><col className="w-[14%]" /><col className="w-[15%]" /><col className="w-[17%]" /></colgroup><thead><tr><th>#</th><th>DESCRIPCIÓN</th><th>UNIDAD</th><th className="oc-number">CANTIDAD</th><th className="oc-number">VALOR UNITARIO</th><th className="oc-number">IMPORTE</th></tr></thead><tbody>
                {itemsOC.filter((i) => i.orden_id === actual.id).map((i, n) => <tr key={i.id}><td>{n + 1}</td><td>{i.descripcion}</td><td>{i.unidad}</td><td className="oc-number">{num(Number(i.cantidad), 4)}</td><td className="oc-number">{num(Number(i.precio_unitario), 4)}</td><td className="oc-number">{soles(Number(i.cantidad) * Number(i.precio_unitario))}</td></tr>)}
              </tbody></table>
              <div className="oc-totals flex-col">
                <div className="flex justify-between gap-3"><span>SUBTOTAL (SIN IGV)</span><span>{soles(totalOC(actual.id))}</span></div>
                {desgloseOC(actual.id).materiales && <>
                  <div className="flex justify-between gap-3"><span>IGV (18.00 %)</span><span>{soles(desgloseOC(actual.id).igv)}</span></div>
                  <div className="flex justify-between gap-3"><span>TOTAL CON IGV</span><span>{soles(desgloseOC(actual.id).total)}</span></div>
                </>}
              </div>
              <div className="oc-conditions"><h3>FORMA DE PAGO</h3>{actual.condicion_pago || "—"}</div>
              {actual.observacion && <div className="oc-conditions"><h3>OBSERVACIONES</h3>{actual.observacion}</div>}
            </HojaOrdenCompra>
          </div>
          <BotonIcono etiqueta="Imprimir o guardar en PDF" tono="primario" onClick={() => imprimirOrdenCompra(documentoRef.current?.querySelector<HTMLElement>(".oc-sheet") ?? null, actual.codigo)}><Printer size={15} /></BotonIcono>
        </div>}
      </VentanaFlotante>

      <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1"
        titulo="Órdenes emitidas"
        extra={
          <div className="flex flex-wrap items-center gap-2">
          <Boton variante="accion" onClick={() => { setError(""); setAviso(""); setModalNueva(true); }}><Plus size={13} /> Nueva orden de compra</Boton>
          </div>
        }
      >
        {visibles.length === 0 ? (
          busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Todavía no hay órdenes de compra." />
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
              </tr>
            </thead>
            <tbody>
              {visibles.map((o) => {
                const its = itemsOC.filter((i) => i.orden_id === o.id);
                const ver = abierto === o.id;
                return (
                  <React.Fragment key={o.id}>
                    <tr onClick={() => setSel(o.id)} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === o.id ? "bg-primary/10" : ""}`}>
                      <td className="px-5 py-2">
                        <button type="button" onClick={() => setAbierto(ver ? null : o.id)} className="inline-flex items-center gap-1 text-primary">
                          {ver ? <ChevronDown size={13} /> : <ChevronRight size={13} />} <Resaltar texto={o.codigo} termino={busqueda} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-ink"><Resaltar texto={nombreProy(o.proyecto_id)} termino={busqueda} /></td>
                      <td className="px-3 py-2"><Resaltar texto={nombreProv(o.proveedor_id)} termino={busqueda} /></td>
                      <td className="px-3 py-2">{o.fecha}</td>
                      <td className="px-3 py-2">{o.fecha_entrega ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{soles(desgloseOC(o.id).total)}</td>
                      <td className="px-3 py-2">
                        <Select className="py-0.5 text-xs" value={o.estado} onChange={(e) => void cambiarEstado(o.id, e.target.value)}>
                          {ESTADOS_OC.map((s) => <option key={s}>{s}</option>)}
                        </Select>
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
                          <td colSpan={1} className="px-3 py-1.5 text-muted-foreground">P.U. {num(Number(i.precio_unitario))} · {estadoCompra(i.id)}</td>
                        </tr>
                      ))}
                    {ver && desgloseOC(o.id).materiales && <>
                      <tr className="border-b border-line/30"><td colSpan={5} className="px-3 py-1 text-right">Subtotal (sin IGV)</td><td className="px-3 py-1 text-right">{soles(desgloseOC(o.id).subtotal)}</td><td /></tr>
                      <tr className="border-b border-line/30"><td colSpan={5} className="px-3 py-1 text-right">IGV (18.00 %)</td><td className="px-3 py-1 text-right">{soles(desgloseOC(o.id).igv)}</td><td /></tr>
                      <tr className="border-b border-line/30"><td colSpan={5} className="px-3 py-1 text-right font-semibold">Total con IGV</td><td className="px-3 py-1 text-right font-semibold">{soles(desgloseOC(o.id).total)}</td><td /></tr>
                    </>}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto="orden de compra" filtros={
        <MenuFiltros activos={[busqueda, filtro].filter(Boolean).length} onLimpiar={() => { setBusqueda(""); setFiltro(""); }}>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código, obra, proveedor..." total={visibles.length} />
          <Campo etiqueta="Obra">
            <Select className="h-8 py-0 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todas las obras</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
            </Select>
          </Campo>
        </MenuFiltros>} haySeleccion={!!actual} onAgregar={() => { setError(""); setAviso(""); setModalNueva(true); }} onEliminar={() => { if (actual) void eliminar(actual.id); }} extras={<>
          <BotonIcono etiqueta="Imprimir o guardar en PDF" disabled={!actual} onClick={() => setVerDocumento(true)}><Printer size={15} /></BotonIcono>
          <BotonIcono etiqueta="Enviar a obra (la obra registra la recepción)" disabled={!actual || actual.estado !== "Emitida"} onClick={() => { if (actual) void cambiarEstado(actual.id, "Enviado a obra"); }}><Truck size={15} /></BotonIcono>
          <BotonIcono etiqueta="Recibir en almacén / cargar a costos" disabled={!actual || actual.estado === "Anulada"} onClick={() => { if (actual) void recibir(actual.id); }}><PackageCheck size={15} /></BotonIcono>
        </>} />
      </div>
    </>
  );
}

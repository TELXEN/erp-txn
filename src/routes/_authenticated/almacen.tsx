import { useRecordado } from "@/lib/recordado";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, MenuFiltros, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { useProyectos } from "@/lib/datos";
import { apuDb, useInsumos } from "@/lib/apu";
import { exportarExcel } from "@/lib/exportar";
import { calcularStock, claveStock, num, sincronizarEstadoOC, useItemsOC, useMovimientos, useOrdenesCompra } from "@/lib/logistica";

export const Route = createFileRoute("/_authenticated/almacen")({
  head: () => ({
    meta: [
      { title: "Almacén — ERP TELXEN SAC" },
      { name: "description", content: "Ingresos y salidas de materiales, equipos y servicios por obra." },
      { property: "og:title", content: "Almacén — ERP TELXEN SAC" },
      { property: "og:description", content: "Registro de ingresos y salidas de almacén por obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlmacenPage,
});

const hoy = () => new Date().toISOString().slice(0, 10);

function AlmacenPage() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: insumos = [] } = useInsumos();
  const { data: movs = [] } = useMovimientos();
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: itemsOC = [] } = useItemsOC();
  const [form, setForm] = useState({
    tipo: "Salida" as "Ingreso" | "Salida",
    fecha: hoy(),
    proyecto_id: "",
    insumo_id: "",
    orden_item_id: "",
    cantidad: "",
    costo_unitario: "",
    documento: "",
    observacion: "",
  });
  const [filtroObra, setFiltroObra] = useRecordado("almacen:obra", "");
  const [filtroTipo, setFiltroTipo] = useRecordado("almacen:tipo", "");
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useRecordado("almacen:busqueda", "");
  const [sel, setSel] = useState("");
  const actual = movs.find((x) => x.id === sel);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const stock = calcularStock(movs);
  const ins = insumos.find((i) => i.id === form.insumo_id);
  const stockSel = ins && form.proyecto_id
    ? stock.find((s) => s.clave === claveStock({ proyecto_id: form.proyecto_id, insumo_id: ins.id, descripcion: ins.nombre }))
    : undefined;
  const nombreProy = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  /** En salidas solo se ofrecen insumos con stock en la obra. */
  const opciones =
    form.tipo === "Salida"
      ? insumos.filter((i) => stock.some((s) => s.proyecto_id === form.proyecto_id && s.insumo_id === i.id && s.stock > 0))
      : insumos.filter((i) => i.activo && i.tipo !== "MO");

  /** Ítems de OC (no anuladas) de la obra con saldo pendiente para el insumo elegido. */
  const recibidoItem = (itemId: string) =>
    movs.filter((m) => m.orden_item_id === itemId && m.tipo === "Ingreso").reduce((s, m) => s + Number(m.cantidad), 0);
  const ocPendientes = itemsOC
    .map((i) => {
      const oc = ordenes.find((o) => o.id === i.orden_id);
      const saldo = Number(i.cantidad) - recibidoItem(i.id);
      return { item: i, oc, saldo };
    })
    .filter(
      (x) =>
        x.oc &&
        x.oc.estado !== "Anulada" &&
        x.oc.proyecto_id === form.proyecto_id &&
        x.item.insumo_id === form.insumo_id &&
        x.saldo > 0.0001,
    );
  const ocSel = ocPendientes.find((x) => x.item.id === form.orden_item_id);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.proyecto_id || !ins) return setError("Selecciona la obra y el insumo.");
    const cant = Number(form.cantidad);
    if (!(cant > 0)) return setError("La cantidad debe ser mayor que cero.");
    if (form.tipo === "Salida" && cant > (stockSel?.stock ?? 0) + 0.0001)
      return setError(`Stock insuficiente: disponible ${num(stockSel?.stock ?? 0)} ${ins.unidad}.`);
    if (form.tipo === "Ingreso" && ocSel && cant > ocSel.saldo + 0.0001)
      return setError(`La cantidad supera el saldo pendiente de ${ocSel.oc!.codigo}: ${num(ocSel.saldo)} ${ins.unidad}.`);
    const { error: err } = await apuDb.from("movimientos_almacen").insert({
      tipo: form.tipo,
      fecha: form.fecha,
      proyecto_id: form.proyecto_id,
      insumo_id: ins.id,
      descripcion: ins.nombre,
      unidad: ins.unidad,
      cantidad: cant,
      costo_unitario:
        form.tipo === "Ingreso" ? Number(form.costo_unitario || ins.precio) : Number(stockSel?.costoPromedio ?? 0),
      orden_item_id: form.tipo === "Ingreso" && form.orden_item_id ? form.orden_item_id : null,
      documento: form.documento.trim(),
      observacion: form.observacion.trim(),
    });
    if (err) return setError(err.message);
    if (form.tipo === "Ingreso" && ocSel?.oc) {
      await sincronizarEstadoOC(ocSel.oc.id);
      qc.invalidateQueries({ queryKey: ["ordenes_compra"] });
    }
    setForm({ ...form, insumo_id: "", orden_item_id: "", cantidad: "", costo_unitario: "", documento: "", observacion: "" });
    qc.invalidateQueries({ queryKey: ["movimientos_almacen"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este movimiento de almacén?")) return;
    const mov = movs.find((m) => m.id === id);
    const ocDel = mov?.orden_item_id ? ordenes.find((o) => o.id === itemsOC.find((i) => i.id === mov.orden_item_id)?.orden_id) : undefined;
    const { error: err } = await apuDb.from("movimientos_almacen").delete().eq("id", id);
    if (err) return setError(err.message);
    if (ocDel) {
      await sincronizarEstadoOC(ocDel.id);
      qc.invalidateQueries({ queryKey: ["ordenes_compra"] });
    }
    qc.invalidateQueries({ queryKey: ["movimientos_almacen"] });
  }

  const visibles = movs.filter((m) => (!filtroObra || m.proyecto_id === filtroObra) && (!filtroTipo || m.tipo === filtroTipo) && coincide(busqueda, m.descripcion, nombreProy(m.proyecto_id), m.documento, m.observacion));

  function exportar() {
    exportarExcel("almacen-movimientos", [
      {
        nombre: "Movimientos",
        filas: visibles.map((m) => ({
          Fecha: m.fecha,
          Tipo: m.tipo,
          Obra: nombreProy(m.proyecto_id),
          Insumo: m.descripcion,
          Unidad: m.unidad,
          Cantidad: Number(m.cantidad),
          "Costo unitario (S/)": Number(m.costo_unitario),
          "Importe (S/)": Math.round(Number(m.cantidad) * Number(m.costo_unitario) * 100) / 100,
          Documento: m.documento,
          Observación: m.observacion,
        })),
      },
    ]);
  }

  return (
    <>
      <Encabezado
        titulo="Almacén"
        subtitulo="Logística"
        acciones={
          <Boton variante="linea" onClick={exportar}>
            <Upload size={14} className="mr-1 inline" /> Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Registrar movimiento" className="mb-5">
        <form onSubmit={guardar} className="grid gap-3 px-5 py-4 sm:grid-cols-4">
          <Campo etiqueta="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "Ingreso" | "Salida", insumo_id: "", orden_item_id: "" })}>
              <option value="Salida">Salida a obra (consumo)</option>
              <option value="Ingreso">Ingreso manual</option>
            </Select>
          </Campo>
          <Campo etiqueta="Fecha">
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Campo>
          <Campo etiqueta="Obra">
            <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value, insumo_id: "", orden_item_id: "" })}>
              <option value="">Seleccionar…</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Insumo">
            <Select value={form.insumo_id} disabled={!form.proyecto_id} onChange={(e) => setForm({ ...form, insumo_id: e.target.value, orden_item_id: "" })}>
              <option value="">{form.tipo === "Salida" && opciones.length === 0 ? "Sin stock en esta obra" : "Seleccionar…"}</option>
              {opciones.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
            </Select>
          </Campo>
          {form.tipo === "Ingreso" && form.insumo_id && ocPendientes.length > 0 && (
            <Campo etiqueta="Orden de compra (opcional)">
              <Select
                value={form.orden_item_id}
                onChange={(e) => {
                  const sel = ocPendientes.find((x) => x.item.id === e.target.value);
                  setForm({
                    ...form,
                    orden_item_id: e.target.value,
                    cantidad: sel ? String(Math.round(sel.saldo * 10000) / 10000) : form.cantidad,
                    costo_unitario: sel ? String(sel.item.precio_unitario) : form.costo_unitario,
                    documento: sel ? sel.oc!.codigo : form.documento,
                  });
                }}
              >
                <option value="">Ingreso libre (sin OC)</option>
                {ocPendientes.map((x) => (
                  <option key={x.item.id} value={x.item.id}>
                    {x.oc!.codigo} · pendiente {num(x.saldo)} {x.item.unidad}
                  </option>
                ))}
              </Select>
            </Campo>
          )}
          <Campo etiqueta={`Cantidad${stockSel ? ` · stock ${num(stockSel.stock)}` : ""}`}>
            <Input type="number" step="0.0001" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          </Campo>
          {form.tipo === "Ingreso" && (
            <Campo etiqueta="Costo unitario (S/)">
              <Input type="number" step="0.01" min="0" placeholder={ins ? String(ins.precio) : ""} value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} />
            </Campo>
          )}
          <Campo etiqueta={form.tipo === "Ingreso" ? "Guía / documento" : "Vale de salida"}>
            <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </Campo>
          <Campo etiqueta="Observación">
            <Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
          </Campo>
          <div className="flex items-end sm:col-span-4">
            <Boton type="submit">Registrar {form.tipo === "Ingreso" ? "ingreso" : "salida"}</Boton>
            {error && <p className="ml-3 font-mono text-xs text-bad">{error}</p>}
          </div>
        </form>
        <p className="border-t border-line px-5 py-2 font-mono text-[10px] text-muted-foreground">
          Los ingresos por compra se registran desde Órdenes de Compra con el botón "Recibir en almacén", o aquí vinculando el ingreso a una orden pendiente: el estado de la orden se actualiza solo. Las salidas se valorizan al costo promedio.
        </p>
      </Panel>

      <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1"
        titulo="Movimientos"
      >
        {visibles.length === 0 ? (
          busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Todavía no hay movimientos de almacén." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Obra</th>
                <th className="px-3 py-2 font-medium">Insumo</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Importe</th>
                <th className="px-3 py-2 font-medium">Documento</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m.id} onClick={() => setSel(m.id)} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === m.id ? "bg-primary/10" : ""}`}>
                  <td className="px-5 py-2">{m.fecha}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 ${m.tipo === "Ingreso" ? "text-primary" : "text-muted-foreground"}`}>
                      {m.tipo === "Ingreso" ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />} {m.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink"><Resaltar texto={nombreProy(m.proyecto_id)} termino={busqueda} /></td>
                  <td className="px-3 py-2"><Resaltar texto={m.descripcion} termino={busqueda} /></td>
                  <td className="px-3 py-2 text-right">{num(Number(m.cantidad))} {m.unidad}</td>
                  <td className="px-3 py-2 text-right">{soles(Number(m.cantidad) * Number(m.costo_unitario))}</td>
                  <td className="px-3 py-2 text-muted-foreground"><Resaltar texto={m.documento || "—"} termino={busqueda} /></td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto="movimiento" filtros={
        <MenuFiltros activos={[busqueda, filtroObra, filtroTipo].filter(Boolean).length} onLimpiar={() => { setBusqueda(""); setFiltroObra(""); setFiltroTipo(""); }}>
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por insumo, obra, documento..." total={visibles.length} />
          <Campo etiqueta="Obra">
            <Select className="h-8 py-0 text-xs" value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
              <option value="">Todas las obras</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Tipo">
            <Select className="h-8 py-0 text-xs" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option>Ingreso</option>
              <option>Salida</option>
            </Select>
          </Campo>
        </MenuFiltros>} haySeleccion={!!actual} onEliminar={() => { if (actual) void eliminar(actual.id); }} />
      </div>
    </>
  );
}

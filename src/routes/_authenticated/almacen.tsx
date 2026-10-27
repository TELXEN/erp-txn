import { supabase } from "@/integrations/supabase/client";
import { useRecordado } from "@/lib/recordado";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, PackageCheck, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, MenuFiltros, Panel, Pestanas, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { ValesSalida } from "@/components/ValesSalida";
import { consumidoPorPartida, estadoConsumoPartida, useMaterialPresupuestado } from "@/lib/consumo-partida";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { usePartidas, useProyectos, useTrabajadores } from "@/lib/datos";
import { apuDb, useInsumos } from "@/lib/apu";
import { exportarExcel } from "@/lib/exportar";
import { calcularStock, claveStock, num, sincronizarEstadoOC, useAlmacenes, useItemsOC, useMovimientos, useOrdenesCompra } from "@/lib/logistica";
import { almacenDeValor, valorDeAlmacen } from "@/lib/almacenes";

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
  const { rol, session } = useAuth();
  const yo = session?.user.id ?? "";
  const { data: encargados = [] } = useQuery({
    queryKey: ["almacen_encargados"],
    queryFn: async () => ((await (supabase as any).from("almacen_encargados").select("id,almacen_id,user_id")).data ?? []) as { id: string; almacen_id: string; user_id: string }[],
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["perfiles-encargados"],
    queryFn: async () => ((await supabase.from("profiles").select("id,nombre,email")).data ?? []) as { id: string; nombre: string; email: string }[],
  });
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: insumos = [] } = useInsumos();
  const { data: movs = [] } = useMovimientos();
  const { data: ordenes = [] } = useOrdenesCompra();
  const { data: itemsOC = [] } = useItemsOC();
  const { data: almacenes = [] } = useAlmacenes();
  const [tr, setTr] = useState({ origen: "central", destino: "", insumo_id: "", cantidad: "", documento: "", observacion: "", error: "" });
  const [almStock, setAlmStock] = useRecordado("almacen:stock", "");
  const [filtroObra, setFiltroObra] = useRecordado("almacen:obra", "");
  const [filtroTipo, setFiltroTipo] = useRecordado("almacen:tipo", "");
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useRecordado("almacen:busqueda", "");
  const [sel, setSel] = useState("");
  const actual = movs.find((x) => x.id === sel);

  const [consumo, setConsumo] = useState<{ clave: string; cantidad: string; partida: string; observacion: string; error: string } | null>(null);
  const [pestana, setPestana] = useRecordado<"almacen" | "vales">("almacen:pestana", "almacen");
  const { data: partidas = [] } = usePartidas();
  const { data: trabajadores = [] } = useTrabajadores();
  const gestion = puedeVerDinero(rol);
  const esGerente = rol === "gerente";
  const almacenDe = (pid: string | null) => almacenes.find((a) => (a.proyecto_id ?? null) === (pid ?? null));
  const encDe = (almId?: string) => encargados.filter((e) => e.almacen_id === almId);
  const nombreUsuario = (id: string) => { const u = usuarios.find((x) => x.id === id); return u ? (u.nombre || u.email) : "Usuario"; };
  /** Central: gerente o encargado. Obra: solo sus encargados. */
  const puedeRecibir = (pid: string | null) => {
    const enc = encDe(almacenDe(pid)?.id);
    if (enc.some((e) => e.user_id === yo)) return true;
    return esGerente && pid === null;
  };
  const quienRecibe = (pid: string | null) => {
    const n = encDe(almacenDe(pid)?.id).map((e) => nombreUsuario(e.user_id));
    return pid === null ? ["Gerente/Dueño", ...n].join(", ") : n.length ? n.join(", ") : "nadie aún: asigna un encargado a esta obra";
  };
  async function agregarEnc(almId: string, uid: string) {
    if (!uid) return;
    const { error: err } = await (supabase as any).from("almacen_encargados").insert({ almacen_id: almId, user_id: uid });
    if (err) return window.alert(err.message);
    qc.invalidateQueries({ queryKey: ["almacen_encargados"] });
  }
  async function quitarEnc(id: string) {
    await (supabase as any).from("almacen_encargados").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["almacen_encargados"] });
  }
  if (!gestion && !encargados.some((e) => e.user_id === yo)) return <SinAcceso />;

  const stock = calcularStock(movs);
  const stockDe = (pid: string | null, insumoId: string) =>
    stock.find((s) => s.clave === claveStock({ proyecto_id: pid as string, insumo_id: insumoId, descripcion: "" }));
  const nombreProy = (id: string | null) => {
    if (!id) return "Almacén Central";
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const activos = almacenes.filter((a) => a.activo).sort((a, b) => (a.tipo === "central" ? -1 : b.tipo === "central" ? 1 : a.nombre.localeCompare(b.nombre, "es")));
  const opcionesAlmacen = activos.map((a) => <option key={a.id} value={valorDeAlmacen(a.proyecto_id)}>{a.tipo === "central" ? "Almacén Central" : nombreProy(a.proyecto_id)}</option>);
  const enTransito = movs.filter((m) => m.tipo === "Ingreso" && m.estado === "En tránsito");
  const pidTrOrigen = almacenDeValor(tr.origen);
  const insumosOrigen = insumos.filter((i) => (stockDe(pidTrOrigen, i.id)?.stock ?? 0) > 0.0001);
  const stockTr = tr.insumo_id ? stockDe(pidTrOrigen, tr.insumo_id) : undefined;

  async function transferir(e: React.FormEvent) {
    e.preventDefault();
    if (!tr.destino) return setTr({ ...tr, error: "Elige el almacén de destino." });
    if (tr.origen === tr.destino) return setTr({ ...tr, error: "Origen y destino deben ser distintos." });
    const cant = Number(tr.cantidad);
    if (!tr.insumo_id || !(cant > 0)) return setTr({ ...tr, error: "Elige el insumo y una cantidad mayor que cero." });
    if (cant > (stockTr?.stock ?? 0) + 0.0001) return setTr({ ...tr, error: `Stock insuficiente: disponible ${num(stockTr?.stock ?? 0)}.` });
    const { error: err } = await (supabase as any).rpc("transferir_almacen", {
      _origen: pidTrOrigen, _destino: almacenDeValor(tr.destino),
      _items: [{ insumo_id: tr.insumo_id, cantidad: cant }],
      _fecha: hoy(), _documento: tr.documento.trim(), _obs: tr.observacion.trim(),
    });
    if (err) return setTr({ ...tr, error: err.message });
    setTr({ ...tr, insumo_id: "", cantidad: "", documento: "", observacion: "", error: "" });
    qc.invalidateQueries({ queryKey: ["movimientos_almacen"] });
  }
  async function recibirTr(id: string) {
    const { error: err } = await (supabase as any).rpc("recibir_transferencia", { _transferencia: id, _fecha: hoy() });
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["movimientos_almacen"] });
  }
  async function cambiarAlmacen(id: string, cambios: Record<string, unknown>) {
    const { error: err } = await apuDb.from("almacenes").update(cambios).eq("id", id);
    if (err) return window.alert(err.message);
    qc.invalidateQueries({ queryKey: ["almacenes"] });
  }
  const pidStock = almacenDeValor(almStock);
  const stockVista = stock.filter((s) => s.stock > 0.0001 && (!almStock || (s.proyecto_id ?? null) === pidStock));
  const filaConsumo = consumo ? stock.find((s) => s.clave === consumo.clave) : undefined;
  const hojasObra = filaConsumo?.proyecto_id ? partidas.filter((p) => p.proyecto_id === filaConsumo.proyecto_id && !partidas.some((h) => h.padre_id === p.id)) : [];
  const presupMat = useMaterialPresupuestado(hojasObra, insumos);
  const consumidoMat = consumidoPorPartida(movs);
  const alerta = consumo?.partida && filaConsumo
    ? estadoConsumoPartida(presupMat.get(consumo.partida) ?? 0, consumidoMat.get(consumo.partida) ?? 0, (Number(consumo.cantidad) || 0) * filaConsumo.costoPromedio)
    : null;
  const gruposPartida = [...new Set(hojasObra.map((p) => p.categoria || "Sin título"))];
  async function consumir(e: React.FormEvent) {
    e.preventDefault();
    if (!consumo || !filaConsumo) return;
    const cant = Number(consumo.cantidad);
    if (!(cant > 0)) return setConsumo({ ...consumo, error: "La cantidad debe ser mayor que cero." });
    if (cant > filaConsumo.stock + 0.0001) return setConsumo({ ...consumo, error: `Stock insuficiente: disponible ${num(filaConsumo.stock)} ${filaConsumo.unidad}.` });
    if (!consumo.partida) return setConsumo({ ...consumo, error: "Elige la partida donde se consume." });
    if (!consumo.observacion.trim()) return setConsumo({ ...consumo, error: "Indica el frente de trabajo." });
    const { error: err } = await apuDb.from("movimientos_almacen").insert({
      tipo: "Salida", motivo: "Consumo", fecha: hoy(), proyecto_id: filaConsumo.proyecto_id,
      insumo_id: filaConsumo.insumo_id, descripcion: filaConsumo.descripcion, unidad: filaConsumo.unidad,
      cantidad: cant, costo_unitario: Math.round(filaConsumo.costoPromedio * 10000) / 10000,
      documento: "", observacion: consumo.observacion.trim(), partida_id: consumo.partida,
    } as never);
    if (err) return setConsumo({ ...consumo, error: err.message });
    setConsumo(null);
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

  const visibles = movs.filter((m) => (!filtroObra || (m.proyecto_id ?? null) === almacenDeValor(filtroObra)) && (!filtroTipo || m.tipo === filtroTipo) && coincide(busqueda, m.descripcion, nombreProy(m.proyecto_id), m.documento, m.observacion));

  function exportar() {
    exportarExcel("almacen-movimientos", [
      {
        nombre: "Movimientos",
        filas: visibles.map((m) => ({
          Fecha: m.fecha,
          Tipo: m.tipo,
          Almacén: nombreProy(m.proyecto_id),
          Motivo: m.motivo ?? "",
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

      <div className="mb-4">
        <Pestanas etiqueta="Secciones de almacén" valor={pestana} onCambiar={setPestana} opciones={[{ id: "almacen", texto: "Stock y movimientos" }, { id: "vales", texto: "Vales de Salida" }]} />
      </div>
      {pestana === "vales" ? (
        <ValesSalida obras={activos.filter((a) => a.proyecto_id).map((a) => a.proyecto_id as string)} nombreProy={nombreProy} stock={stock} puedeEmitir={(pid) => gestion || encDe(almacenDe(pid)?.id).some((e) => e.user_id === yo)} />
      ) : (<>
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        {gestion && <Panel titulo="Transferir entre almacenes">
          <form onSubmit={transferir} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
            <Campo etiqueta="Origen">
              <Select value={tr.origen} onChange={(e) => setTr({ ...tr, origen: e.target.value, destino: tr.destino === e.target.value ? "" : tr.destino, insumo_id: "", error: "" })}>{opcionesAlmacen}</Select>
            </Campo>
            <Campo etiqueta="Destino">
              <Select value={tr.destino} onChange={(e) => setTr({ ...tr, destino: e.target.value, error: "" })}>
                <option value="">Seleccionar…</option>
                {activos.map((a) => { const v = valorDeAlmacen(a.proyecto_id); return <option key={a.id} value={v} disabled={v === tr.origen}>{a.tipo === "central" ? "Almacén Central" : nombreProy(a.proyecto_id)}</option>; })}
              </Select>
            </Campo>
            <Campo etiqueta="Insumo">
              <Select value={tr.insumo_id} onChange={(e) => setTr({ ...tr, insumo_id: e.target.value, error: "" })}>
                <option value="">{insumosOrigen.length ? "Seleccionar…" : "Sin stock en el origen"}</option>
                {insumosOrigen.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
              </Select>
            </Campo>
            <Campo etiqueta={`Cantidad${stockTr ? ` · stock ${num(stockTr.stock)}` : ""}`}>
              <Input type="number" step="0.0001" min="0" value={tr.cantidad} onChange={(e) => setTr({ ...tr, cantidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="Guía interna">
              <Input value={tr.documento} onChange={(e) => setTr({ ...tr, documento: e.target.value })} />
            </Campo>
            <Campo etiqueta="Observación">
              <Input value={tr.observacion} onChange={(e) => setTr({ ...tr, observacion: e.target.value })} />
            </Campo>
            <div className="flex items-end sm:col-span-2">
              <Boton type="submit"><ArrowLeftRight size={14} className="mr-1 inline" /> Enviar transferencia</Boton>
              {tr.error && <p className="ml-3 font-mono text-xs text-bad">{tr.error}</p>}
              {error && <p className="ml-3 font-mono text-xs text-bad">{error}</p>}
            </div>
          </form>
          <p className="border-t border-line px-5 py-2 font-mono text-[10px] text-muted-foreground">
            Sale del origen al instante y queda «En tránsito» hasta que el destino la recibe. Las transferencias no cargan costo a la obra; solo el consumo.
          </p>
        </Panel>}
        <Panel titulo={`En tránsito (${enTransito.length})`}>
          {enTransito.length === 0 ? <Vacio texto="No hay transferencias por recibir." /> : (
            <table className="w-full font-mono text-xs">
              <tbody>
                {enTransito.map((m) => (
                  <tr key={m.id} className="border-b border-line/40">
                    <td className="px-5 py-2">{m.fecha}</td>
                    <td className="px-3 py-2">{m.descripcion}</td>
                    <td className="px-3 py-2 text-right">{num(Number(m.cantidad))} {m.unidad}</td>
                    <td className="px-3 py-2 text-ink">→ {nombreProy(m.proyecto_id)}</td>
                    <td className="px-3 py-2 text-right">
                      <Boton variante="linea" disabled={!puedeRecibir(m.proyecto_id)} title={puedeRecibir(m.proyecto_id) ? "Recibir en el almacén de destino" : `Recibe: ${quienRecibe(m.proyecto_id)}`} onClick={() => m.transferencia_id && void recibirTr(m.transferencia_id)}><PackageCheck size={13} className="mr-1 inline" /> Recibir</Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel titulo="Stock por almacén" extra={
          <Select className="h-7 py-0 text-xs" value={almStock} onChange={(e) => setAlmStock(e.target.value)}>
            <option value="">Consolidado (todos)</option>{opcionesAlmacen}
          </Select>}>
          {stockVista.length === 0 ? <Vacio texto="Sin existencias." /> : (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Almacén</th>
                  <th className="px-3 py-2 font-medium">Insumo</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                  <th className="px-3 py-2 text-right font-medium">C. promedio</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {stockVista.map((s) => (
                  <tr key={s.clave} className="border-b border-line/40">
                    <td className="px-5 py-2 text-ink">{nombreProy(s.proyecto_id)}</td>
                    <td className="px-3 py-2">{s.descripcion}</td>
                    <td className="px-3 py-2 text-right">{num(s.stock)} {s.unidad}</td>
                    <td className="px-3 py-2 text-right">{soles(s.costoPromedio)}</td>
                    <td className="px-3 py-2 text-right">{soles(s.valor)}</td>
                    <td className="px-3 py-1 text-right">
                      {s.proyecto_id && <Boton variante="linea" onClick={() => setConsumo({ clave: s.clave, cantidad: "", partida: "", observacion: "", error: "" })}>Consumir</Boton>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        {gestion && <Panel titulo="Almacenes · encargados de recibir">
          <table className="w-full font-mono text-xs">
            <tbody>
              {almacenes.slice().sort((a, b) => (a.tipo === "central" ? -1 : b.tipo === "central" ? 1 : 0)).map((a) => (
                <tr key={a.id} className="border-b border-line/40">
                  <td className="px-5 py-2 text-ink">{a.tipo === "central" ? "Almacén Central" : nombreProy(a.proyecto_id)}</td>
                  <td className="px-3 py-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {encDe(a.id).map((e) => (
                        <span key={e.id} className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5">
                          {nombreUsuario(e.user_id)}
                          {esGerente && <button type="button" className="text-bad" aria-label="Quitar encargado" onClick={() => void quitarEnc(e.id)}>×</button>}
                        </span>
                      ))}
                      {esGerente && (
                        <Select className="h-7 w-32 py-0 text-xs" value="" onChange={(e) => void agregarEnc(a.id, e.target.value)}>
                          <option value="">+ Encargado</option>
                          {usuarios.filter((u) => !encDe(a.id).some((e) => e.user_id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
                        </Select>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {a.tipo === "central" ? <span className="text-muted-foreground">Fijo</span> : (
                      <button type="button" className={a.activo ? "text-primary" : "text-muted-foreground"}
                        onClick={() => void cambiarAlmacen(a.id, { activo: !a.activo })}>{a.activo ? "Activo" : "Cerrado"}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>}
      </div>

      <VentanaFlotante abierta={!!consumo} onCerrar={() => setConsumo(null)} titulo="Consumo en obra" subtitulo={filaConsumo ? `${nombreProy(filaConsumo.proyecto_id)} · ${filaConsumo.descripcion}` : ""} ancho="max-w-md">
        {consumo && filaConsumo && (
          <form onSubmit={consumir} className="space-y-3 p-5 text-xs">
            <Campo etiqueta={`Cantidad · stock ${num(filaConsumo.stock)} ${filaConsumo.unidad}`}>
              <Input autoFocus type="number" step="0.0001" min="0" value={consumo.cantidad} onChange={(e) => setConsumo({ ...consumo, cantidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="Partida">
              <Select value={consumo.partida} onChange={(e) => setConsumo({ ...consumo, partida: e.target.value, error: "" })}>
                <option value="">{hojasObra.length ? "Seleccionar…" : "Esta obra no tiene partidas"}</option>
                {gruposPartida.map((g) => (
                  <optgroup key={g} label={g}>
                    {hojasObra.filter((p) => (p.categoria || "Sin título") === g).map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Frente de trabajo / observación">
              <Input value={consumo.observacion} onChange={(e) => setConsumo({ ...consumo, observacion: e.target.value })} />
            </Campo>
            {alerta && (
              <div className={`rounded border px-3 py-2 font-mono ${alerta.sobrecosto ? "border-warn/40 bg-warn/10 text-warn" : "border-line text-muted-foreground"}`}>
                <p>Material presupuestado: {soles(alerta.presupuestado)} · consumido: {soles(alerta.consumido)} · tras este consumo: {soles(alerta.tras)}</p>
                {alerta.sobrecosto && <p className="mt-1 font-semibold">Sobrecosto en esta partida: excede en {soles(alerta.exceso)}. Puedes registrarlo igual.</p>}
              </div>
            )}
            {consumo.error && <p className="font-mono text-bad">{consumo.error}</p>}
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="linea" onClick={() => setConsumo(null)}>Cancelar</Boton>
              <Boton type="submit">Registrar consumo</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>

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
                <th className="px-3 py-2 font-medium">Almacén</th>
                <th className="px-3 py-2 font-medium">Insumo</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Importe</th>
                <th className="px-3 py-2 font-medium">Partida / trabajador</th>
                <th className="px-3 py-2 font-medium">Documento</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m.id} onClick={() => setSel(m.id)} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === m.id ? "bg-primary/10" : ""}`}>
                  <td className="px-5 py-2">{m.fecha}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 ${m.tipo === "Ingreso" ? "text-primary" : "text-muted-foreground"}`}>
                      {m.tipo === "Ingreso" ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />} {m.motivo === "Transferencia" ? `Transf. ${m.tipo === "Ingreso" ? "entrada" : "salida"}` : m.motivo === "Consumo" || m.motivo === "Vale de salida" ? m.motivo : m.tipo}{m.estado === "En tránsito" ? " · en tránsito" : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink"><Resaltar texto={nombreProy(m.proyecto_id)} termino={busqueda} /></td>
                  <td className="px-3 py-2"><Resaltar texto={m.descripcion} termino={busqueda} /></td>
                  <td className="px-3 py-2 text-right">{num(Number(m.cantidad))} {m.unidad}</td>
                  <td className="px-3 py-2 text-right">{soles(Number(m.cantidad) * Number(m.costo_unitario))}</td>
                  <td className="px-3 py-2 text-muted-foreground">{[partidas.find((p) => p.id === (m as { partida_id?: string | null }).partida_id)?.codigo, trabajadores.find((t) => t.id === (m as { trabajador_id?: string | null }).trabajador_id)?.nombre].filter(Boolean).join(" · ") || "—"}</td>
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
          <Campo etiqueta="Almacén">
            <Select className="h-8 py-0 text-xs" value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
              <option value="">Todos los almacenes</option>
              {opcionesAlmacen}
            </Select>
          </Campo>
          <Campo etiqueta="Tipo">
            <Select className="h-8 py-0 text-xs" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option>Ingreso</option>
              <option>Salida</option>
            </Select>
          </Campo>
        </MenuFiltros>} haySeleccion={gestion && !!actual} onEliminar={() => { if (actual) void eliminar(actual.id); }} />
      </div>
      </>)}
    </>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSpreadsheet, FileText, Printer, Send } from "lucide-react";
import { toast } from "sonner";
import { Encabezado } from "@/components/AppShell";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { Boton, BotonIcono, Campo, Etiqueta, FilasCargando, Input, MenuFiltros, Panel, Select, TarjetaResumen, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { usePartidas, useProyectos } from "@/lib/datos";
import { fecha, hoy, soles } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";
import { faltaFirma, filaValorizacion, limitarMetrado, metradoSugerido, resumenValorizacion } from "@/lib/valorizaciones";

export const Route = createFileRoute("/_authenticated/valorizaciones-obra")({
  head: () => ({
    meta: [
      { title: "Valorizaciones de obra — ERP TELXEN" },
      { name: "description", content: "Valorizaciones mensuales de obra: metrado ejecutado, acumulados, firma del supervisor y paso a preliquidación." },
      { property: "og:title", content: "Valorizaciones de obra — ERP TELXEN" },
      { property: "og:description", content: "Valoriza el avance físico por período con precios contratados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValorizacionesPage,
});

type Valorizacion = {
  id: string; proyecto_id: string; numero: number; periodo_inicio: string; periodo_fin: string; estado: string;
  pct_gg: number; pct_utilidad: number; pct_adelanto: number; pct_retencion: number; costo_directo: number; neto: number;
  firma_nombre: string; firma_cargo: string; firma_fecha: string | null; observacion: string; preliquidacion_id: string | null;
};
type ItemDb = { id?: string; valorizacion_id?: string; partida_id: string | null; codigo: string; descripcion: string; unidad: string; metrado_contratado: number; precio_unitario: number; metrado_actual: number; orden: number };
type Linea = ItemDb & { metrado_anterior: number };

const db = supabase as unknown as { from: (t: string) => any };
const n = (v: unknown) => Number(v ?? 0) || 0;
const fmt = (v: number, d = 2) => v.toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
const TONO: Record<string, "good" | "warn" | "neutro" | "bad"> = { Borrador: "neutro", "En revisión": "warn", Aprobada: "good", Preliquidada: "good" };

function useValorizaciones() {
  return useQuery({
    queryKey: ["valorizaciones"],
    queryFn: async () => {
      const { data, error } = await db.from("valorizaciones").select("*").order("numero");
      if (error) throw error;
      return (data ?? []) as Valorizacion[];
    },
  });
}
function useItemsValorizacion() {
  return useQuery({
    queryKey: ["valorizacion_items"],
    queryFn: async () => {
      const { data, error } = await db.from("valorizacion_items").select("*").order("orden");
      if (error) throw error;
      return (data ?? []) as (ItemDb & { valorizacion_id: string })[];
    },
  });
}

function ValorizacionesPage() {
  const { rol } = useAuth();
  const dinero = puedeVerDinero(rol);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: vals = [], isLoading } = useValorizaciones();
  const { data: items = [] } = useItemsValorizacion();
  const [proyectoId, setProyectoId] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [form, setForm] = useState<Valorizacion | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);

  const proyecto = proyectos.find((p) => p.id === (form?.proyecto_id ?? proyectoId));
  const lista = vals.filter((v) => !proyectoId || v.proyecto_id === proyectoId).sort((a, b) => b.numero - a.numero);
  const actual = vals.find((v) => v.id === sel) ?? null;
  const congelada = !!form && (form.estado === "Aprobada" || form.estado === "Preliquidada");

  // Metrado ya valorizado (solo valorizaciones aprobadas) por partida, antes de un número dado.
  function anteriorDe(proyecto: string, numero: number) {
    const ids = new Set(vals.filter((v) => v.proyecto_id === proyecto && v.numero < numero && (v.estado === "Aprobada" || v.estado === "Preliquidada")).map((v) => v.id));
    const m = new Map<string, number>();
    items.filter((i) => ids.has(i.valorizacion_id) && i.partida_id).forEach((i) => m.set(i.partida_id!, (m.get(i.partida_id!) ?? 0) + n(i.metrado_actual)));
    return m;
  }

  const contratadoProyecto = (id: string) => partidas.filter((p) => p.proyecto_id === id).reduce((s, p) => s + n(p.metrado) * n(p.precio_unitario), 0);
  const valorizadoProyecto = (id: string) => vals.filter((v) => v.proyecto_id === id && (v.estado === "Aprobada" || v.estado === "Preliquidada")).reduce((s, v) => s + n(v.costo_directo), 0);
  const tarjetas = useMemo(() => {
    const ids = proyectoId ? [proyectoId] : Array.from(new Set(vals.map((v) => v.proyecto_id)));
    const c = ids.reduce((s, id) => s + contratadoProyecto(id), 0);
    const v = ids.reduce((s, id) => s + valorizadoProyecto(id), 0);
    return { c, v, saldo: c - v, pct: c > 0 ? (v / c) * 100 : 0 };
  }, [proyectoId, vals, partidas]);

  function nueva() {
    if (!proyectoId) return toast.error("Elige primero el proyecto en la lupa de filtros.");
    const p = proyectos.find((x) => x.id === proyectoId)!;
    const deProy = vals.filter((v) => v.proyecto_id === proyectoId);
    if (deProy.some((v) => v.estado === "Borrador" || v.estado === "En revisión")) return toast.error("Este proyecto ya tiene una valorización sin aprobar. Termínala antes de crear otra.");
    const numero = deProy.reduce((m, v) => Math.max(m, v.numero), 0) + 1;
    const ultimaFin = deProy.filter((v) => v.numero === numero - 1)[0]?.periodo_fin;
    const inicio = ultimaFin ? new Date(new Date(ultimaFin).getTime() + 86400000).toISOString().slice(0, 10) : (p.fecha_inicio ?? hoy().slice(0, 8) + "01");
    const ant = anteriorDe(proyectoId, numero);
    setForm({ id: "", proyecto_id: proyectoId, numero, periodo_inicio: inicio, periodo_fin: hoy(), estado: "Borrador", pct_gg: n(p.pct_gastos_generales), pct_utilidad: n(p.pct_utilidad), pct_adelanto: 0, pct_retencion: 0, costo_directo: 0, neto: 0, firma_nombre: "", firma_cargo: "", firma_fecha: null, observacion: "", preliquidacion_id: null });
    setLineas(
      partidas.filter((x) => x.proyecto_id === proyectoId).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true })).map((x, i) => {
        const anterior = ant.get(x.id) ?? 0;
        return { partida_id: x.id, codigo: x.codigo, descripcion: x.nombre, unidad: x.unidad, metrado_contratado: n(x.metrado), precio_unitario: n(x.precio_unitario), metrado_anterior: anterior, metrado_actual: metradoSugerido(n(x.metrado), n(x.avance_pct), anterior), orden: i };
      }),
    );
    setAbierta(true);
  }

  function abrir(v: Valorizacion) {
    const ant = anteriorDe(v.proyecto_id, v.numero);
    setForm({ ...v });
    setLineas(items.filter((i) => i.valorizacion_id === v.id).map((i) => ({ ...i, metrado_contratado: n(i.metrado_contratado), precio_unitario: n(i.precio_unitario), metrado_actual: n(i.metrado_actual), metrado_anterior: i.partida_id ? ant.get(i.partida_id) ?? 0 : 0 })));
    setAbierta(true);
  }

  const cdForm = lineas.reduce((s, l) => s + filaValorizacion(l).actual, 0);
  const res = form ? resumenValorizacion(cdForm, form) : null;

  async function guardar(estado?: string) {
    if (!form || !res) return;
    const destino = estado ?? form.estado;
    if (destino === "Aprobada" && faltaFirma(form)) return toast.error("Para aprobar completa la firma de conformidad del supervisor: nombre, cargo y fecha.");
    setGuardando(true);
    const datos = { proyecto_id: form.proyecto_id, numero: form.numero, periodo_inicio: form.periodo_inicio, periodo_fin: form.periodo_fin, pct_gg: form.pct_gg, pct_utilidad: form.pct_utilidad, pct_adelanto: form.pct_adelanto, pct_retencion: form.pct_retencion, costo_directo: res.cd, neto: res.neto, firma_nombre: form.firma_nombre.trim(), firma_cargo: form.firma_cargo.trim(), firma_fecha: form.firma_fecha || null, observacion: form.observacion };
    try {
      let id = form.id;
      // Los ítems se guardan antes de aprobar (al aprobar quedan congelados).
      const estadoPrevio = destino === "Aprobada" ? (form.estado === "Aprobada" ? "En revisión" : form.estado) : destino;
      if (id) {
        const { error } = await db.from("valorizaciones").update({ ...datos, estado: estadoPrevio }).eq("id", id);
        if (error) throw error;
        await db.from("valorizacion_items").delete().eq("valorizacion_id", id);
      } else {
        const { data, error } = await db.from("valorizaciones").insert({ ...datos, estado: estadoPrevio }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { error: e2 } = await db.from("valorizacion_items").insert(lineas.map(({ metrado_anterior: _a, id: _i, ...l }, i) => ({ ...l, valorizacion_id: id, orden: i })));
      if (e2) throw e2;
      if (destino === "Aprobada") {
        const { error: e3 } = await db.from("valorizaciones").update({ estado: "Aprobada" }).eq("id", id);
        if (e3) throw e3;
      }
      toast.success(destino === "Aprobada" ? "Valorización aprobada y congelada" : "Valorización guardada");
      await qc.invalidateQueries({ queryKey: ["valorizaciones"] });
      await qc.invalidateQueries({ queryKey: ["valorizacion_items"] });
      setSel(id);
      setAbierta(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (e as { message?: string }).message ?? "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!actual) return;
    if (actual.estado === "Aprobada" || actual.estado === "Preliquidada") return toast.error("Una valorización aprobada no se puede eliminar.");
    if (!confirm(`¿Eliminar la Valorización N° ${actual.numero}?`)) return;
    const { error } = await db.from("valorizaciones").delete().eq("id", actual.id);
    if (error) return toast.error(error.message);
    setSel(null);
    qc.invalidateQueries({ queryKey: ["valorizaciones"] });
  }

  async function generarPreliquidacion() {
    if (!actual || actual.estado !== "Aprobada") return;
    const p = proyectos.find((x) => x.id === actual.proyecto_id);
    if (!p) return;
    const r = resumenValorizacion(n(actual.costo_directo), actual);
    try {
      const { data: cli } = await supabase.from("terceros").select("id, razon_social").eq("es_cliente", true);
      const clave = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f.]/g, "").toLowerCase().trim();
      const cliente = (cli ?? []).find((c) => clave(c.razon_social) === clave(p.cliente ?? ""));
      const { reservarCodigo } = await import("@/lib/codigos.functions");
      const codigo = await reservarCodigo({ data: { tipo: "preliquidacion" } });
      const concepto = `Valorización N° ${actual.numero} – ${fecha(actual.periodo_inicio)} al ${fecha(actual.periodo_fin)}`;
      const { data: pl, error } = await supabase.from("preliquidaciones").insert({
        codigo, proyecto_id: p.id, cliente_id: cliente?.id ?? null, concepto, orden_compra: p.documento_numero ?? "", fecha: hoy(), moneda: "PEN", tipo_cambio: 1,
        observacion: r.retencion > 0 ? `Retención de garantía ${actual.pct_retencion}%: ${soles(r.retencion)}` : "",
      } as never).select("id").single();
      if (error) throw error;
      const plId = (pl as { id: string }).id;
      const { error: e2 } = await supabase.from("preliquidacion_items").insert({ preliquidacion_id: plId, descripcion: `${p.codigo ?? ""} ${p.nombre} – ${concepto}`.trim(), unidad: "GLB", cantidad: 1, precio_unitario: r.base, orden: 0 } as never);
      if (e2) throw e2;
      const { error: e3 } = await db.from("valorizaciones").update({ estado: "Preliquidada", preliquidacion_id: plId }).eq("id", actual.id);
      if (e3) throw e3;
      toast.success(`Preliquidación ${codigo} creada`);
      qc.invalidateQueries({ queryKey: ["valorizaciones"] });
      qc.invalidateQueries({ queryKey: ["preliquidaciones"] });
      void navigate({ to: "/valorizaciones" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (e as { message?: string }).message ?? "No se pudo generar la preliquidación");
    }
  }

  function excel() {
    if (!form) return;
    void exportarExcel(`Valorizacion-${proyecto?.codigo ?? ""}-${form.numero}`, [{
      nombre: `Valorización ${form.numero}`,
      filas: lineas.map((l) => {
        const f = filaValorizacion(l);
        return { Código: l.codigo, Descripción: l.descripcion, Und: l.unidad, "Metrado contratado": l.metrado_contratado, ...(dinero ? { "P.U.": l.precio_unitario, Contratado: f.contratado } : {}), "Metrado anterior": l.metrado_anterior, "Metrado actual": l.metrado_actual, "% acumulado": Number(f.pctAcumulado.toFixed(2)), ...(dinero ? { Anterior: f.anterior, Actual: f.actual, Acumulado: f.acumulado, Saldo: f.saldo } : {}) };
      }),
    }]);
  }

  const setF = <K extends keyof Valorizacion>(k: K, v: Valorizacion[K]) => form && setForm({ ...form, [k]: v });

  return (
    <>
      <Encabezado titulo="Valorizaciones" subtitulo="Operaciones · metrado ejecutado por período, firma y paso a preliquidación" />
      <div className="grid gap-3 sm:grid-cols-4">
        <TarjetaResumen etiqueta="Contratado (CD)" valor={dinero ? soles(tarjetas.c) : "—"} tipo="monto" />
        <TarjetaResumen etiqueta="Valorizado acumulado" valor={dinero ? soles(tarjetas.v) : "—"} tipo="monto" />
        <TarjetaResumen etiqueta="Saldo por valorizar" valor={dinero ? soles(tarjetas.saldo) : "—"} tipo="monto" />
        <TarjetaResumen etiqueta="Avance valorizado" valor={`${fmt(tarjetas.pct)}%`} tipo="avance" />
      </div>
      <div className="mt-3 flex gap-2">
        <Panel titulo={proyecto ? `${proyecto.codigo ?? ""} ${proyecto.nombre}` : "Todas las obras"} className="min-w-0 flex-1">
          {isLoading ? <table className="w-full"><tbody><FilasCargando columnas={7} /></tbody></table> : lista.length === 0 ? (
            <Vacio texto={proyectoId ? "Aún no hay valorizaciones en este proyecto. Usa + para crear la primera." : "Elige un proyecto en la lupa y pulsa + para crear una valorización."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-1.5">N°</th><th className="px-3">Proyecto</th><th className="px-3">Período</th><th className="px-3 text-right">Monto del período</th><th className="px-3 text-right">Neto a cobrar</th><th className="px-3">Supervisor</th><th className="px-3">Estado</th></tr></thead>
                <tbody>
                  {lista.map((v) => {
                    const p = proyectos.find((x) => x.id === v.proyecto_id);
                    return (
                      <tr key={v.id} onClick={() => setSel(v.id)} onDoubleClick={() => abrir(v)} className={`cursor-pointer border-t border-line ${sel === v.id ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                        <td className="px-3 py-1.5 font-mono">Val. N° {v.numero}</td>
                        <td className="px-3">{p?.codigo} {p?.nombre}</td>
                        <td className="px-3">{fecha(v.periodo_inicio)} – {fecha(v.periodo_fin)}</td>
                        <td className="px-3 text-right">{dinero ? soles(n(v.costo_directo)) : "—"}</td>
                        <td className="px-3 text-right">{dinero ? soles(n(v.neto)) : "—"}</td>
                        <td className="px-3">{v.firma_nombre || <span className="text-muted-foreground">Sin firma</span>}</td>
                        <td className="px-3"><Etiqueta tono={TONO[v.estado] ?? "neutro"}>{v.estado}</Etiqueta></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <BarraIconosHoja
          objeto="valorización"
          haySeleccion={!!actual}
          filtros={
            <MenuFiltros activos={proyectoId ? 1 : 0} onLimpiar={() => setProyectoId("")}>
              <Campo etiqueta="Proyecto">
                <Select value={proyectoId} onChange={(e) => { setProyectoId(e.target.value); setSel(null); }}>
                  <option value="">Todos</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}
                </Select>
              </Campo>
            </MenuFiltros>
          }
          onAgregar={nueva}
          onEditar={() => actual && abrir(actual)}
          onEliminar={dinero ? () => void eliminar() : undefined}
          extras={dinero ? <BotonIcono etiqueta="Generar preliquidación" disabled={actual?.estado !== "Aprobada"} onClick={() => void generarPreliquidacion()}><Send size={15} /></BotonIcono> : undefined}
        />
      </div>

      <VentanaFlotante abierta={abierta && !!form} onCerrar={() => setAbierta(false)} pantallaCompleta ancho="max-w-[96rem]"
        titulo={form ? `Valorización N° ${form.numero} — ${proyecto?.codigo ?? ""} ${proyecto?.nombre ?? ""}` : ""}
        subtitulo={congelada ? "Aprobada: congelada, solo lectura" : "El metrado actual se sugiere desde el Avance Físico y puedes ajustarlo"}>
        {form && res && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="no-print grid shrink-0 gap-3 border-b border-line p-3 sm:grid-cols-6">
              <Campo etiqueta="Del"><Input type="date" disabled={congelada} value={form.periodo_inicio} onChange={(e) => setF("periodo_inicio", e.target.value)} /></Campo>
              <Campo etiqueta="Al"><Input type="date" disabled={congelada} value={form.periodo_fin} onChange={(e) => setF("periodo_fin", e.target.value)} /></Campo>
              {dinero && <>
                <Campo etiqueta="Amortización adelanto %"><Input type="number" step="0.01" min={0} disabled={congelada} value={form.pct_adelanto} onChange={(e) => setF("pct_adelanto", Number(e.target.value))} /></Campo>
                <Campo etiqueta="Retención garantía %"><Input type="number" step="0.01" min={0} disabled={congelada} value={form.pct_retencion} onChange={(e) => setF("pct_retencion", Number(e.target.value))} /></Campo>
              </>}
              <div className="col-span-2 flex items-end justify-end gap-1.5">
                <BotonIcono etiqueta="Exportar Excel" onClick={excel}><FileSpreadsheet size={15} /></BotonIcono>
                <BotonIcono etiqueta="Imprimir / PDF A4" onClick={() => window.print()}><Printer size={15} /></BotonIcono>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto print-area">
              <div className="hidden p-4 print:block">
                <p className="text-lg font-bold">Valorización N° {form.numero}</p>
                <p className="text-sm">{proyecto?.codigo} {proyecto?.nombre} · {proyecto?.cliente} · Período {fecha(form.periodo_inicio)} al {fecha(form.periodo_fin)}</p>
              </div>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-muted text-left">
                  <tr><th rowSpan={2} className="px-2">Código</th><th rowSpan={2} className="px-2">Descripción</th><th rowSpan={2} className="px-2">Und</th>
                    <th colSpan={dinero ? 3 : 1} className="border-l border-line px-2 text-center">Contratado</th>
                    <th colSpan={dinero ? 3 : 2} className="border-l border-line px-2 text-center">Anterior</th>
                    <th colSpan={dinero ? 3 : 2} className="border-l border-line px-2 text-center">Actual</th>
                    <th colSpan={dinero ? 2 : 1} className="border-l border-line px-2 text-center">Acumulado</th>
                    {dinero && <th className="border-l border-line px-2 text-center">Saldo</th>}</tr>
                  <tr className="text-right">
                    <th className="border-l border-line px-2">Metrado</th>{dinero && <><th className="px-2">P.U.</th><th className="px-2">Parcial</th></>}
                    <th className="border-l border-line px-2">Metrado</th>{dinero && <th className="px-2">S/</th>}<th className="px-2">%</th>
                    <th className="border-l border-line px-2">Metrado</th>{dinero && <th className="px-2">S/</th>}<th className="px-2">%</th>
                    {dinero && <th className="border-l border-line px-2">S/</th>}<th className="px-2">%</th>
                    {dinero && <th className="border-l border-line px-2">S/</th>}
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const f = filaValorizacion(l);
                    return (
                      <tr key={l.partida_id ?? i} className="border-t border-line text-right">
                        <td className="px-2 py-1 text-left font-mono">{l.codigo}</td><td className="px-2 text-left">{l.descripcion}</td><td className="px-2 text-left">{l.unidad}</td>
                        <td className="border-l border-line px-2">{fmt(l.metrado_contratado)}</td>{dinero && <><td className="px-2">{fmt(l.precio_unitario)}</td><td className="px-2">{fmt(f.contratado)}</td></>}
                        <td className="border-l border-line px-2">{fmt(l.metrado_anterior)}</td>{dinero && <td className="px-2">{fmt(f.anterior)}</td>}<td className="px-2">{fmt(f.pctAnterior)}</td>
                        <td className="border-l border-line px-1">
                          {congelada ? fmt(l.metrado_actual) : (
                            <input type="number" step="0.01" min={0} aria-label={`Metrado actual ${l.descripcion}`} className="h-6 w-20 rounded border border-line bg-background px-1 text-right"
                              value={l.metrado_actual}
                              onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? { ...x, metrado_actual: limitarMetrado(x, Number(e.target.value)) } : x)))} />
                          )}
                        </td>
                        {dinero && <td className="px-2">{fmt(f.actual)}</td>}<td className="px-2">{fmt(f.pctActual)}</td>
                        {dinero && <td className="border-l border-line px-2">{fmt(f.acumulado)}</td>}<td className="px-2">{fmt(f.pctAcumulado)}</td>
                        {dinero && <td className="border-l border-line px-2">{fmt(f.saldo)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Conformidad del supervisor del cliente (obligatoria para aprobar)</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Campo etiqueta="Nombre"><Input disabled={congelada} value={form.firma_nombre} onChange={(e) => setF("firma_nombre", e.target.value)} /></Campo>
                    <Campo etiqueta="Cargo"><Input disabled={congelada} value={form.firma_cargo} onChange={(e) => setF("firma_cargo", e.target.value)} /></Campo>
                    <Campo etiqueta="Fecha"><Input type="date" disabled={congelada} value={form.firma_fecha ?? ""} onChange={(e) => setF("firma_fecha", e.target.value || null)} /></Campo>
                  </div>
                  <div className="mt-8 hidden grid-cols-2 gap-8 pt-10 text-center text-xs print:grid">
                    <div className="border-t border-ink pt-1">Residente de obra — TELXEN SAC</div>
                    <div className="border-t border-ink pt-1">{form.firma_nombre || "Supervisor"}<br />{form.firma_cargo} · {fecha(form.firma_fecha)}</div>
                  </div>
                </div>
                {dinero && (
                  <table className="ml-auto w-full max-w-sm text-xs">
                    <tbody>
                      {([["Costo directo del período", res.cd], [`Gastos generales ${fmt(form.pct_gg)}%`, res.gg], [`Utilidad ${fmt(form.pct_utilidad)}%`, res.utilidad], ["Subtotal", res.subtotal], [`Amortización adelanto ${fmt(form.pct_adelanto)}%`, -res.adelanto], ["Base imponible", res.base], ["IGV 18%", res.igv], ["Total", res.total], [`Retención de garantía ${fmt(form.pct_retencion)}%`, -res.retencion]] as [string, number][]).map(([t, v]) => (
                        <tr key={t} className="border-t border-line"><td className="py-1">{t}</td><td className="text-right">{soles(v)}</td></tr>
                      ))}
                      <tr className="border-t-2 border-ink font-bold"><td className="py-1">Neto a cobrar</td><td className="text-right">{soles(res.neto)}</td></tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {!congelada && (
              <div className="no-print flex shrink-0 justify-end gap-2 border-t border-line p-3">
                <Boton variante="linea" onClick={() => setAbierta(false)}>Cancelar</Boton>
                <Boton variante="linea" disabled={guardando} onClick={() => void guardar("Borrador")}><FileText size={14} /> Guardar borrador</Boton>
                <Boton variante="accion" disabled={guardando} onClick={() => void guardar("En revisión")}>Enviar a revisión</Boton>
                {dinero && <Boton disabled={guardando} onClick={() => void guardar("Aprobada")}><CheckCircle2 size={14} /> Aprobar</Boton>}
              </div>
            )}
          </div>
        )}
      </VentanaFlotante>
    </>
  );
}

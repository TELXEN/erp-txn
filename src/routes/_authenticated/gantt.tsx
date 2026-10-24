import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChartGantt, ChevronDown, ChevronRight, FileDown, FileSpreadsheet, Plus, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, CabeceraModulo, Campo, FilasCargando, FranjaResumen, Input, MenuFiltros, Panel, Select, Vacio } from "@/components/ui-kit";
import { useRecordado } from "@/lib/recordado";
import {
  PERIODICIDADES, generarPeriodos, hoyISO, programadoPartida, useCronograma, usePartidas, useProyectos,
  type Partida, type Periodicidad,
} from "@/lib/datos";
import { NOMBRE_TIPO, aDia, cabeceras, diaSemana, feriadosPeru, calcularCpm, deDia, estadoAvance, rangoPartida, type Dependencia, type TipoDependencia } from "@/lib/gantt";
import { exportarExcel, exportarPdf } from "@/lib/exportar";
import { leerTodo } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/gantt")({
  head: () => ({
    meta: [
      { title: "Diagrama Gantt — ERP TELXEN" },
      { name: "description", content: "Calendario de partidas por obra con dependencias y ruta crítica." },
      { property: "og:title", content: "Diagrama Gantt — ERP TELXEN" },
      { property: "og:description", content: "Gantt de obra con ruta crítica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gantt,
});

type DepFila = Dependencia & { id: string; proyecto_id: string };
const useDependencias = () =>
  useQuery({
    queryKey: ["dependencias_partidas"],
    queryFn: () => leerTodo<DepFila>(() => supabase.from("dependencias_partidas").select("*").order("id")),
  });

// El calendario se estira para caber en la pantalla: sin barra de desplazamiento horizontal.
const ANCHO_FIJO = 306;
const ALTO = 26;
const fecha = (iso: string) => iso.split("-").reverse().join("/");

type Fila = {
  partida: Partida;
  inicio: number | null;
  fin: number | null; // exclusivo
  programado: number;
  real: number;
};

function Gantt() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [], isLoading } = usePartidas();
  const { data: cron = [] } = useCronograma();
  const { data: deps = [] } = useDependencias();
  const [proyectoId, setProyectoId] = useRecordado<string>("gantt:proyecto", "");
  const [zoomGuardado, setZoom] = useRecordado<Periodicidad | "">("gantt:zoom", "");
  const [plegados, setPlegados] = useRecordado<string[]>("gantt:plegados", []);
  const [verCritica, setVerCritica] = useRecordado("gantt:critica", true);
  const [filtroEsp, setFiltroEsp] = useState("");
  const [soloAtrasadas, setSoloAtrasadas] = useState(false);
  const [soloCriticas, setSoloCriticas] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const proyecto = proyectos.find((p) => p.id === proyectoId) ?? null;
  const per: Periodicidad = proyecto?.periodicidad_cronograma ?? "mes";
  const zoom: Periodicidad = zoomGuardado || per;
  const hoy = hoyISO();

  const datos = useMemo(() => {
    if (!proyecto) return null;
    const lista = partidas.filter((p) => p.proyecto_id === proyecto.id);
    const periodos = generarPeriodos(proyecto.fecha_inicio, proyecto.fecha_fin, per);
    const finDe = (ini: string) => {
      const encontrado = periodos.find((p) => p.inicio === ini);
      if (encontrado) return encontrado.fin;
      return generarPeriodos(ini, ini, per)[0]?.fin ?? ini;
    };
    const filas: Fila[] = lista.map((p) => {
      const r = rangoPartida(p.id, cron, per, finDe);
      return {
        partida: p,
        inicio: r ? aDia(r.inicio) : null,
        fin: r ? aDia(r.fin) + 1 : null,
        programado: programadoPartida(p.id, cron, hoy, per),
        real: Number(p.avance_pct) || 0,
      };
    });
    const conBarra = filas.filter((f) => f.inicio !== null);
    const depsObra = deps.filter((d) => d.proyecto_id === proyecto.id);
    let cpm: ReturnType<typeof calcularCpm> | null = null;
    let errorCpm = "";
    try {
      cpm = calcularCpm(conBarra.map((f) => ({ id: f.partida.id, inicio: f.inicio!, duracion: f.fin! - f.inicio! })), depsObra);
    } catch (e) {
      errorCpm = (e as Error).message;
    }
    const inicios = [proyecto.fecha_inicio ? aDia(proyecto.fecha_inicio) : null, ...conBarra.map((f) => f.inicio!)].filter((n): n is number => n !== null);
    const fines = [proyecto.fecha_fin ? aDia(proyecto.fecha_fin) + 1 : null, ...conBarra.map((f) => f.fin!), cpm?.fin ?? null].filter((n): n is number => n !== null);
    const d0 = inicios.length ? Math.min(...inicios) : aDia(hoy);
    const d1 = Math.max(fines.length ? Math.max(...fines) : d0 + 30, d0 + 7);
    return { filas, depsObra, cpm, errorCpm, d0, d1 };
  }, [proyecto, partidas, cron, deps, per, hoy]);

  const [factor, setFactor] = useRecordado("gantt:factor", 1);
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchoVista, setAnchoVista] = useState(0);
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAnchoVista(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const diasTotales = datos ? datos.d1 - datos.d0 : 1;
  const px = Math.max(0.5, ((anchoVista - ANCHO_FIJO - 2) / diasTotales) * Math.max(1, factor));
  const cab = useMemo(() => (datos ? cabeceras(datos.d0, datos.d1, zoom) : { superior: [], inferior: [] }), [datos, zoom]);
  const noLaborables = useMemo(() => {
    if (!datos || px < 3) return [] as { dia: number; nombre: string }[];
    const fer = new Map<number, string>();
    for (let a = new Date(datos.d0 * 86400000).getUTCFullYear(); a <= new Date(datos.d1 * 86400000).getUTCFullYear(); a++) feriadosPeru(a).forEach((n, d) => fer.set(d, n));
    const lista: { dia: number; nombre: string }[] = [];
    for (let d = datos.d0; d < datos.d1; d++) {
      const f = fer.get(d);
      if (f) lista.push({ dia: d, nombre: f });
      else if (diaSemana(d) === 0 || diaSemana(d) === 6) lista.push({ dia: d, nombre: diaSemana(d) === 0 ? "Domingo" : "Sábado" });
    }
    return lista;
  }, [datos, px]);
  const irAHoy = () => {
    const el = contenedor.current;
    if (el && datos) el.scrollTo({ left: Math.max(0, (aDia(hoy) - datos.d0) * px - (el.clientWidth - ANCHO_FIJO) / 2), behavior: "smooth" });
  };

  const visibles = useMemo(() => {
    if (!datos) return [];
    return datos.filas.filter((f) => {
      if (filtroEsp && f.partida.especialidad !== filtroEsp) return false;
      if (soloAtrasadas && estadoAvance(f.real, f.programado) === "ok") return false;
      if (soloCriticas && !datos.cpm?.criticas.has(f.partida.id)) return false;
      return true;
    });
  }, [datos, filtroEsp, soloAtrasadas, soloCriticas]);

  const grupos = useMemo(() => {
    const m = new Map<string, Fila[]>();
    visibles.forEach((f) => m.set(f.partida.especialidad || "Sin especialidad", [...(m.get(f.partida.especialidad || "Sin especialidad") ?? []), f]));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [visibles]);

  const especialidades = useMemo(() => [...new Set((datos?.filas ?? []).map((f) => f.partida.especialidad).filter(Boolean))].sort(), [datos]);

  // Filas renderizadas (grupo + partidas) para calcular posiciones de flechas
  const render: ({ tipo: "grupo"; nombre: string; filas: Fila[] } | { tipo: "partida"; fila: Fila })[] = [];
  grupos.forEach(([nombre, filas]) => {
    render.push({ tipo: "grupo", nombre, filas });
    if (!plegados.includes(nombre)) filas.forEach((fila) => render.push({ tipo: "partida", fila }));
  });
  const posY = new Map<string, number>();
  render.forEach((r, i) => r.tipo === "partida" && posY.set(r.fila.partida.id, i * ALTO + ALTO / 2));

  const anchoTotal = datos ? (datos.d1 - datos.d0) * px : 0;
  const x = (dia: number) => (dia - (datos?.d0 ?? 0)) * px;
  const cpm = datos?.cpm;

  const atrasoCritico = useMemo(() => {
    if (!datos?.cpm) return [];
    return datos.filas.filter((f) => datos.cpm!.criticas.has(f.partida.id) && estadoAvance(f.real, f.programado) !== "ok");
  }, [datos]);

  const finEstimado = cpm && datos?.filas.some((f) => f.inicio !== null) ? deDia(cpm.fin - 1) : null;
  const diasVsContrato = finEstimado && proyecto?.fecha_fin ? aDia(finEstimado) - aDia(proyecto.fecha_fin) : null;

  const exportar = async (tipo: "pdf" | "xlsx") => {
    if (!datos || !proyecto) return;
    const filas = datos.filas.map((f) => ({
      Partida: f.partida.nombre,
      Especialidad: f.partida.especialidad,
      Inicio: f.inicio !== null ? fecha(deDia(f.inicio)) : "Sin programar",
      Fin: f.fin !== null ? fecha(deDia(f.fin - 1)) : "",
      "Programado %": Number(f.programado.toFixed(2)),
      "Real %": Number(f.real.toFixed(2)),
      Holgura: cpm && f.inicio !== null ? (cpm.holgura[f.partida.id] ?? "") : "",
      Crítica: cpm?.criticas.has(f.partida.id) ? "Sí" : "No",
    }));
    const nombre = `Gantt ${proyecto.codigo ?? ""} ${proyecto.nombre}`.trim();
    if (tipo === "xlsx") await exportarExcel(nombre, [{ nombre: "Gantt", filas }]);
    else
      await exportarPdf({
        titulo: "Diagrama Gantt — ruta crítica",
        subtitulo: `${proyecto.codigo ?? ""} ${proyecto.nombre} · corte ${fecha(hoy)}${finEstimado ? ` · fin estimado ${fecha(finEstimado)}` : ""}`,
        tabla: { columnas: Object.keys(filas[0] ?? { Partida: "" }), filas: filas.map((f) => Object.values(f) as (string | number)[]) },
        archivo: nombre,
      });
  };

  const filtrosActivos = (filtroEsp ? 1 : 0) + (soloAtrasadas ? 1 : 0) + (soloCriticas ? 1 : 0);
  const selFila = datos?.filas.find((f) => f.partida.id === seleccion) ?? null;

  return (
    <div className="space-y-4">
      <CabeceraModulo
        ruta="Operaciones"
        titulo="Diagrama Gantt"
        descripcion="Calendario de partidas, dependencias y ruta crítica"
        icono={<ChartGantt size={20} />}
        contexto={
          <Select value={proyectoId} onChange={(e) => { setProyectoId(e.target.value); setSeleccion(null); }} className="min-w-64">
            <option value="">Todas las obras</option>
            {proyectos.filter((p) => !p.archivado_en).map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>)}
          </Select>
        }
        acciones={
          proyecto && (
            <>
              <div className="flex rounded-md border border-line p-0.5">
                {PERIODICIDADES.map((z) => (
                  <button key={z.valor} type="button" onClick={() => setZoom(z.valor)} className={`rounded px-2 py-1 text-xs ${zoom === z.valor ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}>{z.nombre}</button>
                ))}
              </div>
              <div className="flex rounded-md border border-line p-0.5">
                <button type="button" title="Alejar (ajustar a la pantalla)" aria-label="Alejar" onClick={() => setFactor(Math.max(1, factor / 1.5))} className="rounded px-1.5 py-1 text-muted-foreground hover:bg-muted"><ZoomOut size={14} /></button>
                <button type="button" title="Acercar" aria-label="Acercar" onClick={() => setFactor(Math.min(8, factor * 1.5))} className="rounded px-1.5 py-1 text-muted-foreground hover:bg-muted"><ZoomIn size={14} /></button>
                <button type="button" onClick={irAHoy} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"><CalendarCheck size={14} /> Ir a hoy</button>
              </div>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={verCritica} onChange={(e) => setVerCritica(e.target.checked)} /> Ver ruta crítica
              </label>
              <Boton variante="linea" onClick={() => exportar("pdf")}><FileDown size={14} /> PDF</Boton>
              <Boton variante="linea" onClick={() => exportar("xlsx")}><FileSpreadsheet size={14} /> Excel</Boton>
            </>
          )
        }
      />

      {proyecto && (
        <MenuFiltros flotante activos={filtrosActivos} onLimpiar={() => { setFiltroEsp(""); setSoloAtrasadas(false); setSoloCriticas(false); }}>
          <Campo etiqueta="Especialidad">
            <Select value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}>
              <option value="">Todas</option>
              {especialidades.map((e) => <option key={e}>{e}</option>)}
            </Select>
          </Campo>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={soloAtrasadas} onChange={(e) => setSoloAtrasadas(e.target.checked)} /> Solo atrasadas</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={soloCriticas} onChange={(e) => setSoloCriticas(e.target.checked)} /> Solo críticas</label>
        </MenuFiltros>
      )}

      {!proyecto ? (
        <Cartera proyectos={proyectos.filter((p) => !p.archivado_en)} onElegir={setProyectoId} hoy={hoy} />
      ) : isLoading ? (
        <Panel><table className="w-full"><tbody><FilasCargando /></tbody></table></Panel>
      ) : !datos || datos.filas.length === 0 ? (
        <Panel><Vacio texto="Esta obra no tiene partidas" /></Panel>
      ) : (
        <>
          <FranjaResumen
            items={[
              { etiqueta: "Partidas programadas", valor: `${datos.filas.filter((f) => f.inicio !== null).length} / ${datos.filas.length}`, tipo: "cantidad" },
              { etiqueta: "Partidas críticas", valor: String(cpm?.criticas.size ?? 0), tipo: "cantidad", tono: "text-bad" },
              { etiqueta: "Fin estimado", valor: finEstimado ? fecha(finEstimado) : "—", guia: proyecto.fecha_fin ? `Contractual ${fecha(proyecto.fecha_fin)}` : "Sin fin contractual", tipo: "avance" },
              {
                etiqueta: "Frente al contrato",
                valor: diasVsContrato === null ? "—" : diasVsContrato > 0 ? `+${diasVsContrato} días` : `${diasVsContrato} días`,
                tono: diasVsContrato !== null && diasVsContrato > 0 ? "text-bad" : "text-good",
                guia: diasVsContrato !== null && diasVsContrato > 0 ? "Excede el plazo" : "Dentro del plazo",
                tipo: "avance",
              },
            ]}
          />

          {datos.errorCpm && <div className="rounded-md border border-bad/40 bg-bad/10 p-3 text-xs text-bad">{datos.errorCpm}. Revisa las dependencias.</div>}
          {atrasoCritico.length > 0 && (
            <div className="rounded-md border border-bad/40 bg-bad/10 p-3 text-xs text-bad">
              <b>{atrasoCritico.length} partida(s) crítica(s) atrasada(s):</b> {atrasoCritico.slice(0, 5).map((f) => `${f.partida.nombre} (real ${f.real.toFixed(0)}% vs ${f.programado.toFixed(0)}%)`).join(" · ")}. Su atraso empuja directamente el fin de la obra.
            </div>
          )}

          <Panel>
            <div ref={contenedor} className="sin-slider flex max-h-[70vh] overflow-auto text-[11px]">
              {/* Columna fija */}
              <div className="sticky left-0 z-20 w-[19rem] shrink-0 border-r border-line bg-card">
                <div className="sticky top-0 z-10 flex h-10 items-end border-b border-line bg-card px-2 pb-0.5 text-[10px] font-semibold text-muted-foreground">
                  <span className="flex-1">Partida</span><span className="w-12 text-right">Real</span><span className="w-14 text-right">Holgura</span>
                </div>
                {render.map((r) =>
                  r.tipo === "grupo" ? (
                    <button key={"g" + r.nombre} type="button" style={{ height: ALTO }} onClick={() => setPlegados(plegados.includes(r.nombre) ? plegados.filter((n) => n !== r.nombre) : [...plegados, r.nombre])} className="flex w-full items-center gap-1 border-b border-line bg-muted/50 px-2 text-left font-semibold">
                      {plegados.includes(r.nombre) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      <span className="flex-1 truncate">{r.nombre}</span>
                      <span className="w-12 text-right">{promedio(r.filas).toFixed(0)}%</span><span className="w-14" />
                    </button>
                  ) : (
                    <button key={r.fila.partida.id} type="button" style={{ height: ALTO }} onClick={() => setSeleccion(r.fila.partida.id)} className={`flex w-full items-center border-b border-line px-2 pl-6 text-left hover:bg-muted ${seleccion === r.fila.partida.id ? "bg-primary/10" : ""}`}>
                      <span className="flex-1 truncate" title={r.fila.partida.nombre}>{r.fila.partida.nombre}</span>
                      <span className="w-12 text-right font-mono">{r.fila.real.toFixed(0)}%</span>
                      <span className={`w-14 text-right font-mono ${cpm?.criticas.has(r.fila.partida.id) ? "font-bold text-bad" : ""}`}>
                        {r.fila.inicio === null ? "—" : cpm ? `${cpm.holgura[r.fila.partida.id]} d` : ""}
                      </span>
                    </button>
                  ),
                )}
              </div>
              {/* Línea de tiempo */}
              <div className="relative shrink-0" style={{ width: anchoTotal }}>
                <div className="sticky top-0 z-10 h-10 border-b border-line bg-card">
                  <div className="relative h-5 border-b border-line">
                    {cab.superior.map((t) => (
                      <div key={t.inicio} className="absolute inset-y-0 overflow-hidden border-r border-line px-1 text-[10px] leading-[18px] font-semibold whitespace-nowrap" style={{ left: x(t.inicio), width: (t.fin - t.inicio) * px }}>{t.etiqueta}</div>
                    ))}
                  </div>
                  <div className="relative h-5">
                    {cab.inferior.map((t) => {
                      const finde = zoom === "dia" && (diaSemana(t.inicio) === 0 || diaSemana(t.inicio) === 6);
                      const esHoy = t.inicio <= aDia(hoy) && aDia(hoy) < t.fin;
                      return (
                        <div key={t.inicio} className={`absolute inset-y-0 overflow-hidden border-r border-line text-center text-[10px] leading-[18px] whitespace-nowrap ${esHoy ? "bg-cta/20 font-semibold text-foreground" : finde ? "bg-muted text-muted-foreground" : "text-muted-foreground"}`} style={{ left: x(t.inicio), width: (t.fin - t.inicio) * px }}>
                          {(t.fin - t.inicio) * px >= 16 ? t.etiqueta : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="relative" style={{ height: render.length * ALTO }}>
                  {render.map((r, i) => <div key={i} className={`absolute inset-x-0 border-b border-line ${r.tipo === "grupo" ? "bg-muted/50" : ""}`} style={{ top: i * ALTO, height: ALTO }} />)}
                  {noLaborables.map((n) => <div key={n.dia} title={`${fecha(deDia(n.dia))} · ${n.nombre}`} className={`absolute inset-y-0 ${n.nombre === "Sábado" || n.nombre === "Domingo" ? "bg-muted/70" : "bg-warn/15"}`} style={{ left: x(n.dia), width: px }} />)}
                  {cab.inferior.map((t) => <div key={"l" + t.inicio} className="absolute inset-y-0 border-l border-line/60" style={{ left: x(t.inicio) }} />)}
                  {proyecto.fecha_inicio && <Marca x={x(aDia(proyecto.fecha_inicio))} texto="Inicio" />}
                  {proyecto.fecha_fin && <Marca x={x(aDia(proyecto.fecha_fin) + 1)} texto="Fin contrato" />}
                  <div className="absolute inset-y-0 z-[5] w-0.5 bg-cta" style={{ left: x(aDia(hoy)) }} title={`Hoy ${fecha(hoy)}`} />
                  {render.map((r, i) => {
                    if (r.tipo === "grupo") {
                      const con = r.filas.filter((f) => f.inicio !== null);
                      if (!con.length) return null;
                      const a = Math.min(...con.map((f) => f.inicio!));
                      const b = Math.max(...con.map((f) => f.fin!));
                      return <div key={i} className="absolute h-2 rounded-sm bg-foreground/60" style={{ top: i * ALTO + ALTO / 2 - 4, left: x(a), width: (b - a) * px }} />;
                    }
                    const f = r.fila;
                    if (f.inicio === null) return <span key={i} className="absolute left-2 whitespace-nowrap text-[10px] italic text-muted-foreground" style={{ top: i * ALTO + 7 }}>Sin programar</span>;
                    const est = estadoAvance(f.real, f.programado);
                    const critica = verCritica && cpm?.criticas.has(f.partida.id);
                    const color = est === "ok" ? "bg-good" : est === "alerta" ? "bg-warn" : "bg-bad";
                    return (
                      <div key={i} className="contents">
                      <span className="pointer-events-none absolute z-[6] whitespace-nowrap text-[9px] text-muted-foreground" style={{ top: i * ALTO + 8, left: x(f.fin!) + 5 }}>{fecha(deDia(f.inicio)).slice(0, 5)} – {fecha(deDia(f.fin! - 1)).slice(0, 5)}</span>
                      <button
                        type="button"
                        onClick={() => setSeleccion(f.partida.id)}
                        title={`${f.partida.nombre}\n${fecha(deDia(f.inicio))} – ${fecha(deDia(f.fin! - 1))}\nProgramado a hoy ${f.programado.toFixed(1)}% · Real ${f.real.toFixed(1)}%\nHolgura ${cpm?.holgura[f.partida.id] ?? "—"} días · ${Math.max(0, f.fin! - aDia(hoy))} días restantes`}
                        className={`absolute z-[6] overflow-hidden rounded-sm bg-muted ${critica ? "ring-2 ring-bad" : "ring-1 ring-line"}`}
                        style={{ top: i * ALTO + 6, height: ALTO - 12, left: x(f.inicio), width: Math.max(4, (f.fin! - f.inicio) * px) }}
                      >
                        <span className={`block h-full ${color}`} style={{ width: `${Math.min(100, f.real)}%` }} />
                        {(f.fin! - f.inicio) * px >= 30 && <span className="absolute inset-0 grid place-items-center text-[9px] font-semibold text-foreground">{f.real.toFixed(0)}%</span>}
                      </button>
                      </div>
                    );
                  })}
                  <svg className="pointer-events-none absolute inset-0 z-[7]" width={anchoTotal} height={render.length * ALTO}>
                    <defs>
                      <marker id="flecha" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="currentColor" /></marker>
                    </defs>
                    {datos.depsObra.map((d) => {
                      const p = datos.filas.find((f) => f.partida.id === d.predecesora_id);
                      const s = datos.filas.find((f) => f.partida.id === d.sucesora_id);
                      const y1 = posY.get(d.predecesora_id);
                      const y2 = posY.get(d.sucesora_id);
                      if (!p || !s || p.inicio === null || s.inicio === null || y1 === undefined || y2 === undefined) return null;
                      const x1 = d.tipo === "SS" ? x(p.inicio) : x(p.fin!);
                      const x2 = d.tipo === "FF" ? x(s.fin!) : x(s.inicio);
                      const critica = verCritica && cpm?.criticas.has(p.partida.id) && cpm?.criticas.has(s.partida.id);
                      const medio = d.tipo === "FF" ? Math.max(x1, x2) + 8 : x1 + 8;
                      return (
                        <path key={d.id} d={`M${x1},${y1} H${medio} V${y2} H${x2}`} fill="none" strokeWidth={critica ? 1.8 : 1.1} markerEnd="url(#flecha)" className={critica ? "text-bad" : "text-muted-foreground"} stroke="currentColor" />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
            <p className="border-t border-line px-3 py-2 text-[10px] text-muted-foreground">
              Barra: periodo programado · relleno: avance real (verde a tiempo, ámbar ligero atraso, rojo atrasada) · borde rojo: ruta crítica · línea vertical: hoy.
            </p>
          </Panel>

          {selFila && (
            <PanelDependencias
              fila={selFila}
              proyectoId={proyecto.id}
              filas={datos.filas}
              deps={datos.depsObra}
              holgura={cpm?.holgura[selFila.partida.id]}
              onCambio={() => qc.invalidateQueries({ queryKey: ["dependencias_partidas"] })}
              onAbrir={() => navigate({ to: "/avance" })}
            />
          )}
        </>
      )}
    </div>
  );
}

function promedio(filas: Fila[]) {
  const base = filas.reduce((s, f) => s + Number(f.partida.presupuesto_inicial || 0), 0);
  if (base > 0) return filas.reduce((s, f) => s + f.real * Number(f.partida.presupuesto_inicial || 0), 0) / base;
  return filas.reduce((s, f) => s + f.real, 0) / (filas.length || 1);
}

function Marca({ x, texto }: { x: number; texto: string }) {
  return (
    <div className="absolute inset-y-0 z-[4] border-l border-dashed border-primary/60" style={{ left: x }}>
      <span className="absolute -left-[5px] top-1 size-2.5 rotate-45 bg-primary" />
      <span className="absolute left-2 top-0.5 whitespace-nowrap rounded bg-card/90 px-1 text-[9px] font-semibold text-primary">{texto}</span>
    </div>
  );
}

function PanelDependencias({
  fila, proyectoId, filas, deps, holgura, onCambio, onAbrir,
}: {
  fila: Fila; proyectoId: string; filas: Fila[]; deps: DepFila[]; holgura: number | undefined; onCambio: () => void; onAbrir: () => void;
}) {
  const [pred, setPred] = useState("");
  const [tipo, setTipo] = useState<TipoDependencia>("FS");
  const [desfase, setDesfase] = useState("0");
  const [guardando, setGuardando] = useState(false);
  const propias = deps.filter((d) => d.sucesora_id === fila.partida.id);
  const nombre = (id: string) => filas.find((f) => f.partida.id === id)?.partida.nombre ?? "—";

  const agregar = async () => {
    if (!pred) return;
    setGuardando(true);
    const { error } = await supabase.from("dependencias_partidas").insert({
      proyecto_id: proyectoId, predecesora_id: pred, sucesora_id: fila.partida.id, tipo, desfase_dias: Number(desfase) || 0,
    });
    setGuardando(false);
    if (error) { toast.error(error.message.includes("círculo") ? "No se puede: esa dependencia crea un círculo entre partidas" : error.message.includes("duplicate") ? "Esa dependencia ya existe" : error.message); return; }
    setPred(""); setDesfase("0");
    toast.success("Dependencia agregada");
    onCambio();
  };
  const quitar = async (id: string) => {
    const { error } = await supabase.from("dependencias_partidas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onCambio();
  };

  return (
    <Panel>
      <div className="space-y-3 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{fila.partida.nombre}</h2>
            <p className="text-muted-foreground">
              {fila.inicio !== null ? `${fecha(deDia(fila.inicio))} – ${fecha(deDia(fila.fin! - 1))}` : "Sin programar"} · Programado a hoy {fila.programado.toFixed(1)}% · Real {fila.real.toFixed(1)}%
              {holgura !== undefined && ` · Holgura ${holgura} días${holgura <= 0 ? " (crítica)" : ""}`}
            </p>
          </div>
          <Boton variante="linea" onClick={onAbrir}>Abrir en Avance programado</Boton>
        </div>
        <div>
          <p className="mb-1 font-semibold">Depende de…</p>
          {propias.length === 0 ? <p className="text-muted-foreground">Sin dependencias.</p> : (
            <ul className="space-y-1">
              {propias.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="flex-1">{nombre(d.predecesora_id)} · {NOMBRE_TIPO[d.tipo]}{d.desfase_dias ? ` · ${d.desfase_dias > 0 ? "+" : ""}${d.desfase_dias} días` : ""}</span>
                  <BotonIcono etiqueta="Quitar dependencia" tono="peligro" onClick={() => quitar(d.id)}><Trash2 size={13} /></BotonIcono>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Campo etiqueta="Partida predecesora">
            <Select value={pred} onChange={(e) => setPred(e.target.value)} className="min-w-64">
              <option value="">Elegir…</option>
              {filas.filter((f) => f.partida.id !== fila.partida.id).map((f) => <option key={f.partida.id} value={f.partida.id}>{f.partida.nombre}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDependencia)}>
              {(Object.keys(NOMBRE_TIPO) as TipoDependencia[]).map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Desfase (días)">
            <Input type="number" className="w-20" value={desfase} onChange={(e) => setDesfase(e.target.value)} />
          </Campo>
          <Boton onClick={agregar} disabled={!pred || guardando}><Plus size={14} /> Agregar</Boton>
        </div>
      </div>
    </Panel>
  );
}

function Cartera({ proyectos, onElegir, hoy }: { proyectos: { id: string; codigo: string | null; nombre: string; fecha_inicio: string | null; fecha_fin: string | null }[]; onElegir: (id: string) => void; hoy: string }) {
  const con = proyectos.filter((p) => p.fecha_inicio && p.fecha_fin);
  if (!con.length) return <Panel><Vacio texto="No hay obras con fechas de inicio y fin" /></Panel>;
  const d0 = Math.min(...con.map((p) => aDia(p.fecha_inicio!)));
  const d1 = Math.max(...con.map((p) => aDia(p.fecha_fin!) + 1), aDia(hoy) + 1);
  const pct = (d: number) => ((d - d0) / (d1 - d0)) * 100;
  return (
    <Panel>
      <div className="space-y-1 p-3 text-xs">
        <div className="flex justify-between pl-72 text-muted-foreground"><span>{fecha(deDia(d0))}</span><span>{fecha(deDia(d1 - 1))}</span></div>
        {con.map((p) => (
          <button key={p.id} type="button" onClick={() => onElegir(p.id)} className="flex h-8 w-full items-center gap-2 rounded hover:bg-muted">
            <span className="w-70 shrink-0 truncate px-2 text-left" style={{ width: "17.5rem" }}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</span>
            <span className="relative h-4 flex-1">
              <span className="absolute inset-y-0 w-0.5 bg-cta" style={{ left: `${pct(aDia(hoy))}%` }} />
              <span className="absolute inset-y-0 rounded-sm bg-primary/70" style={{ left: `${pct(aDia(p.fecha_inicio!))}%`, width: `${pct(aDia(p.fecha_fin!) + 1) - pct(aDia(p.fecha_inicio!))}%` }} />
            </span>
          </button>
        ))}
        <p className="pt-2 text-muted-foreground">Elige una obra para ver sus partidas y su ruta crítica.</p>
      </div>
    </Panel>
  );
}

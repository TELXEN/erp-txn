import { useRecordado } from "@/lib/recordado";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Gauge, Minus, Plus, Save, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, FranjaResumen, Input, MenuFiltros, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { ESPECIALIDADES } from "@/lib/format";
import { CronogramaObra } from "@/components/CronogramaObra";
import { agruparPorEspecialidad, usePartidas, useProyectos } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/avance")({
  head: () => ({
    meta: [
      { title: "Avance Físico — ERP TELXEN" },
      { name: "description", content: "Registro del porcentaje de avance físico actual por partida en obra." },
      { property: "og:title", content: "Avance Físico — ERP TELXEN" },
      { property: "og:description", content: "Registro del avance físico por partida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avance,
});

const LS_PROYECTO = "avance:proyecto";

function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${
        activa ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function ControlAvance({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (v: number) => void;
}) {
  const paso = (d: number) => onChange(Math.min(100, Math.max(0, valor + d)));
  const btn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-card text-foreground transition-colors hover:bg-muted active:bg-muted/70";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Disminuir" className={btn} onClick={() => paso(-1)}>
          <Minus size={16} />
        </button>
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          className="w-16 text-right"
          value={String(valor)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(Math.min(100, Math.max(0, n)));
          }}
        />
        <span className="font-mono text-xs text-muted-foreground">%</span>
        <button type="button" aria-label="Aumentar" className={btn} onClick={() => paso(1)}>
          <Plus size={16} />
        </button>
      </div>
      <div className="flex gap-1">
        {[0, 25, 50, 75, 100].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              valor === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

type Orden = "wbs" | "avance" | "nombre";

function Avance() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const [filtroProyecto, setFiltroProyecto] = useRecordado(LS_PROYECTO + ":v2", "");
  const [filtroEsp, setFiltroEsp] = useRecordado("avance:especialidad", "");
  const [busqueda, setBusqueda] = useRecordado("avance:busqueda", "");
  const [orden, setOrden] = useRecordado<Orden>("avance:orden", "wbs");
  const [valores, setValores] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState("");
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const [error, setError] = useState("");
  const [vista, setVista] = useRecordado<"real" | "cronograma">("avance:vista", "real");
  const [plegadas, setPlegadas] = useRecordado<Record<string, boolean>>("avance:plegadas", {});

  // Si el proyecto recordado ya no existe, vuelve a «Todos»
  useEffect(() => {
    if (filtroProyecto && proyectos.length > 0 && !proyectos.some((p) => p.id === filtroProyecto)) {
      setFiltroProyecto("");
    }
  }, [filtroProyecto, proyectos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = partidas.filter(
      (p) =>
        (!filtroProyecto || p.proyecto_id === filtroProyecto) &&
        (!filtroEsp || p.especialidad === filtroEsp) &&
        (!q || p.nombre.toLowerCase().includes(q)),
    );
    const copia = [...lista];
    if (orden === "avance") copia.sort((a, b) => Number(b.avance_pct) - Number(a.avance_pct));
    else if (orden === "nombre") copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    else copia.sort((a, b) => String((a as { codigo?: string }).codigo ?? "").localeCompare(String((b as { codigo?: string }).codigo ?? "")) || a.nombre.localeCompare(b.nombre));
    return copia;
  }, [partidas, filtroProyecto, filtroEsp, busqueda, orden]);

  // Resumen del alcance visible
  const resumen = useMemo(() => {
    const total = visibles.length;
    const sinIniciar = visibles.filter((p) => Number(p.avance_pct) === 0).length;
    const terminadas = visibles.filter((p) => Number(p.avance_pct) >= 100).length;
    const enCurso = total - sinIniciar - terminadas;
    const promedio = total > 0 ? visibles.reduce((s, p) => s + Number(p.avance_pct), 0) / total : 0;
    return { total, sinIniciar, enCurso, terminadas, promedio };
  }, [visibles]);

  // Agrupa por proyecto y dentro por especialidad
  const porProyecto = useMemo(() => {
    const mapa = new Map<string, typeof visibles>();
    for (const p of visibles) {
      const lista = mapa.get(p.proyecto_id) ?? [];
      lista.push(p);
      mapa.set(p.proyecto_id, lista);
    }
    return [...mapa.entries()].map(([pid, lista]) => ({
      pid,
      nombre: proyectos.find((pr) => pr.id === pid)?.nombre ?? "—",
      grupos: agruparPorEspecialidad(lista),
    }));
  }, [visibles, proyectos]);

  const pendientes = Object.keys(valores).length;

  async function guardar(id: string, actual: number) {
    const valor = Math.min(100, Math.max(0, valores[id] ?? actual));
    if (Number.isNaN(valor)) return;
    setGuardando(id);
    setError("");
    const { error: err } = await supabase.from("partidas").update({ avance_pct: valor }).eq("id", id);
    setGuardando("");
    if (err) return setError(err.message);
    setValores((v) => {
      const copia = { ...v };
      delete copia[id];
      return copia;
    });
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  async function guardarTodo() {
    const entradas = Object.entries(valores);
    if (entradas.length === 0) return;
    setGuardandoTodo(true);
    setError("");
    for (const [id, valor] of entradas) {
      const v = Math.min(100, Math.max(0, valor));
      const { error: err } = await supabase.from("partidas").update({ avance_pct: v }).eq("id", id);
      if (err) {
        setGuardandoTodo(false);
        setError(err.message);
        return;
      }
    }
    setGuardandoTodo(false);
    setValores({});
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  if (rol !== "ingeniero" && rol !== "gerente" && rol !== "administrador") return <SinAcceso />;

  return (
    <>
      <Encabezado titulo="Avance Físico por Partida" subtitulo="Registro de campo" />
      <div className="mb-3 flex flex-wrap gap-1">
        <Boton variante="primario"><Gauge size={13} />Control de avance</Boton>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        <Pestana activa={vista === "real"} onClick={() => setVista("real")}>
          Avance real
        </Pestana>
        <Pestana activa={vista === "cronograma"} onClick={() => setVista("cronograma")}>
          Avance programado
        </Pestana>
      </div>
      {vista === "cronograma" ? (
        <CronogramaObra />
      ) : (
        <>
          {error && <p className="mb-3 rounded-md bg-bad/10 px-3 py-2 font-mono text-xs text-bad">{error}</p>}

          {/* Resumen del alcance visible */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Avance promedio</p>
              <p className="text-lg font-bold tabular-nums">{resumen.promedio.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Partidas</p>
              <p className="text-lg font-bold tabular-nums">{resumen.total}</p>
            </div>
            <div className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sin iniciar</p>
              <p className="text-lg font-bold tabular-nums text-muted-foreground">{resumen.sinIniciar}</p>
            </div>
            <div className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">En curso</p>
              <p className="text-lg font-bold tabular-nums text-warn">{resumen.enCurso}</p>
            </div>
            <div className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Terminadas</p>
              <p className="text-lg font-bold tabular-nums text-good">{resumen.terminadas}</p>
            </div>
          </div>

          <Panel
            titulo="Partidas asignadas"
            extra={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Select className="w-full sm:w-52" value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
                <Select className="w-full sm:w-56" value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}>
                  <option value="">Todas las especialidades</option>
                  {ESPECIALIDADES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
                <div className="relative w-full sm:w-52">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar partida..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <Select className="w-full sm:w-44" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                  <option value="wbs">Orden: código WBS</option>
                  <option value="avance">Orden: mayor avance</option>
                  <option value="nombre">Orden: alfabético</option>
                </Select>
              </div>
            }
          >
            {porProyecto.length === 0 ? (
              <Vacio texto="No hay partidas con estos filtros." />
            ) : (
              porProyecto.map(({ pid, nombre, grupos }) => (
                <div key={pid}>
                  <div className="flex items-center justify-between gap-3 border-b-2 border-primary/40 bg-primary px-5 py-2.5">
                    <p className="text-sm font-bold uppercase tracking-wide text-primary-foreground">
                      {nombre}
                    </p>
                    <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/90">
                      Proyecto
                    </span>
                  </div>
                  {grupos.map(([esp, lista]) => {
                    const clave = `${pid}|${esp}`;
                    const plegada = plegadas[clave] ?? false;
                    return (
                      <div key={esp}>
                        <button
                          type="button"
                          onClick={() => setPlegadas((s) => ({ ...s, [clave]: !plegada }))}
                          className="flex w-full items-center gap-2 bg-muted/20 px-5 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-foreground/80 hover:bg-muted/40"
                        >
                          {plegada ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          {esp}
                          <span className="ml-auto font-mono text-[10px] normal-case text-muted-foreground">
                            {lista.length} partida{lista.length === 1 ? "" : "s"}
                          </span>
                        </button>
                        {!plegada && (
                          <ul className="divide-y divide-line/60">
                            {lista.map((p) => {
                              const actual = Number(p.avance_pct);
                              const valor = valores[p.id] ?? actual;
                              const modificado = valor !== actual;
                              const colorBarra = valor >= 100 ? "bg-good" : valor > 0 ? "bg-warn" : "bg-muted-foreground/30";
                              return (
                                <li
                                  key={p.id}
                                  className={`flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between ${modificado ? "bg-primary/5" : ""}`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                      {p.nombre}
                                      {modificado && (
                                        <span className="ml-2 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-warn">
                                          Sin guardar
                                        </span>
                                      )}
                                    </p>
                                    <div className="mt-1.5 flex h-4 w-full max-w-md items-center overflow-hidden rounded-full bg-muted">
                                      <div
                                        className={`flex h-full items-center justify-end rounded-full ${colorBarra} transition-all`}
                                        style={{ width: `${Math.max(valor, 8)}%` }}
                                      >
                                        <span className="pr-1 text-[9px] font-bold tabular-nums text-primary-foreground">
                                          {valor}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <ControlAvance
                                      valor={valor}
                                      onChange={(v) => setValores({ ...valores, [p.id]: v })}
                                    />
                                    <Boton
                                      variante={modificado ? "primario" : "linea"}
                                      onClick={() => guardar(p.id, actual)}
                                      disabled={!modificado || guardando === p.id}
                                    >
                                      {guardando === p.id ? (
                                        "Guardando..."
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                          <Check size={15} /> Actualizar
                                        </span>
                                      )}
                                    </Boton>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </Panel>

          {/* Barra fija de guardado masivo */}
          {pendientes > 0 && (
            <div className="sticky bottom-3 z-10 mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-lg">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{pendientes}</span> partida{pendientes === 1 ? "" : "s"} con cambios sin guardar
              </p>
              <div className="flex gap-2">
                <Boton variante="linea" onClick={() => setValores({})} disabled={guardandoTodo}>
                  <span className="inline-flex items-center gap-1.5">
                    <X size={14} /> Descartar
                  </span>
                </Boton>
                <Boton variante="primario" onClick={guardarTodo} disabled={guardandoTodo}>
                  <span className="inline-flex items-center gap-1.5">
                    <Save size={14} /> {guardandoTodo ? "Guardando..." : `Guardar cambios (${pendientes})`}
                  </span>
                </Boton>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

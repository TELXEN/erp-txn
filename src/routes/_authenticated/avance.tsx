import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
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
    ],
  }),
  component: Avance,
});

function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        activa ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
  );
}

function Avance() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");
  const [valores, setValores] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");
  const [vista, setVista] = useState<"real" | "cronograma">("real");

  const visibles = useMemo(
    () =>
      partidas.filter(
        (p) =>
          (!filtroProyecto || p.proyecto_id === filtroProyecto) &&
          (!filtroEsp || p.especialidad === filtroEsp),
      ),
    [partidas, filtroProyecto, filtroEsp],
  );

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

  if (rol !== "ingeniero" && rol !== "gerente" && rol !== "administrador") return <SinAcceso />;

  return (
    <>
      <Encabezado titulo="Avance Físico por Partida" subtitulo="Registro de campo" />
      <div className="mb-4 inline-flex gap-1 rounded-full bg-muted p-1">
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

          <Panel
            titulo="Partidas asignadas"
            extra={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select className="w-full sm:w-52" value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
                <Select className="w-full sm:w-60" value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}>
                  <option value="">Todas las especialidades</option>
                  {ESPECIALIDADES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
              </div>
            }
          >
            {porProyecto.length === 0 ? (
              <Vacio texto="No hay partidas con estos filtros." />
            ) : (
              porProyecto.map(({ pid, nombre, grupos }) => (
                <div key={pid}>
                  <p className="border-b border-line bg-muted/40 px-5 py-2.5 text-sm font-bold text-foreground">
                    Proyecto: {nombre}
                  </p>
                  {grupos.map(([esp, lista]) => (
                    <div key={esp}>
                      <p className="bg-muted/20 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80">
                        {esp}
                      </p>
                      <ul className="divide-y divide-line/60">
                        {lista.map((p) => {
                          const actual = Number(p.avance_pct);
                          const valor = valores[p.id] ?? actual;
                          const modificado = valor !== actual;
                          return (
                            <li
                              key={p.id}
                              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{p.nombre}</p>
                                {actual > 0 && (
                                  <div className="mt-1.5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-good" style={{ width: `${actual}%` }} />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
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
                    </div>
                  ))}
                </div>
              ))
            )}
          </Panel>
        </>
      )}
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { ESPECIALIDADES } from "@/lib/format";
import { agruparPorEspecialidad, usePartidas, useProyectos } from "@/lib/datos";


export const Route = createFileRoute("/_authenticated/avance")({
  head: () => ({
    meta: [
      { title: "Avance Físico — Control de Proyectos" },
      { name: "description", content: "Registro del porcentaje de avance físico actual por partida en obra." },
      { property: "og:title", content: "Avance Físico — Control de Proyectos" },
      { property: "og:description", content: "Registro del avance físico por partida." },
    ],
  }),
  component: Avance,
});

function Avance() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();

  const { data: partidas = [] } = usePartidas();
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState("");
  const [error, setError] = useState("");

  const visibles = useMemo(
    () =>
      partidas.filter(
        (p) =>
          (!filtroProyecto || p.proyecto_id === filtroProyecto) &&
          (!filtroEsp || p.especialidad === filtroEsp),
      ),
    [partidas, filtroProyecto, filtroEsp],
  );
  const grupos = useMemo(() => agruparPorEspecialidad(visibles), [visibles]);
  const nombreProyecto = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";

  async function guardar(id: string, actual: number) {
    const bruto = valores[id];
    const valor = Math.min(100, Math.max(0, Number(bruto ?? actual)));
    if (Number.isNaN(valor)) return;
    setGuardando(id);
    setError("");
    const { error: err } = await supabase.from("partidas").update({ avance_pct: valor }).eq("id", id);
    setGuardando("");
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  if (rol !== "ingeniero" && rol !== "gerente") return <SinAcceso />;

  return (

    <>
      <Encabezado titulo="Avance Físico por Partida" subtitulo="Registro de campo" />

      {error && <p className="mb-3 rounded-md bg-bad/10 px-3 py-2 font-mono text-xs text-bad">{error}</p>}

      <Panel
        titulo="Partidas asignadas"
        extra={
          <div className="flex gap-2">
            <Select className="w-52" value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
              <option value="">Todos los proyectos</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
            <Select className="w-60" value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}>
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
        {grupos.length === 0 ? (
          <Vacio texto="No hay partidas con estos filtros." />
        ) : (
          grupos.map(([esp, lista]) => (
            <div key={esp}>
              <p className="bg-muted/60 px-5 py-2 label-mono">{esp}</p>
              <ul className="divide-y divide-line/60">
                {lista.map((p) => {
                  const actual = Number(p.avance_pct);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-56 flex-1">
                        <p className="text-sm font-semibold">{p.nombre}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{nombreProyecto(p.proyecto_id)}</p>
                        <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                          <div className="h-full growx rounded-full bg-good" style={{ width: `${actual}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          className="w-24 text-right"
                          value={valores[p.id] ?? String(actual)}
                          onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })}
                        />
                        <span className="font-mono text-xs text-muted-foreground">%</span>
                        <Boton onClick={() => guardar(p.id, actual)} disabled={guardando === p.id}>
                          {guardando === p.id ? "Guardando..." : "Actualizar"}
                        </Boton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { ESPECIALIDADES, pct, soles } from "@/lib/format";
import {
  agruparPorEspecialidad,
  costoRealPartida,
  useGastosDirectos,
  usePartidas,
  useProyectos,
  useTareos,
} from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { Pencil, Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partidas")({
  head: () => ({
    meta: [
      { title: "Partidas — Control de Proyectos" },
      { name: "description", content: "Partidas agrupadas por tipo de instalación o especialidad, con presupuesto y costo real." },
      { property: "og:title", content: "Partidas — Control de Proyectos" },
      { property: "og:description", content: "Partidas por especialidad con presupuesto y costo real." },
    ],
  }),
  component: Partidas,
});

function Partidas() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: tareos = [] } = useTareos();
  const { data: gastos = [] } = useGastosDirectos();

  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");
  const [form, setForm] = useState({
    proyecto_id: "",
    nombre: "",
    especialidad: ESPECIALIDADES[0] as string,
    presupuesto_inicial: "",
  });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{ id: string; nombre: string; especialidad: string; presupuesto_inicial: string } | null>(null);

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

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.from("partidas").insert({
      proyecto_id: form.proyecto_id,
      nombre: form.nombre.trim(),
      especialidad: form.especialidad,
      presupuesto_inicial: Number(form.presupuesto_inicial || 0),
    });
    if (err) return setError(err.message);
    setForm({ ...form, nombre: "", presupuesto_inicial: "" });
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  async function actualizar(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    const { error: err } = await supabase
      .from("partidas")
      .update({
        nombre: editando.nombre.trim(),
        especialidad: editando.especialidad,
        presupuesto_inicial: Number(editando.presupuesto_inicial || 0),
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta partida? Se perderán los tareos y gastos vinculados.")) return;
    setError("");
    const { error: err } = await supabase.from("partidas").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  function exportar() {
    exportarExcel("partidas", [
      {
        nombre: "Partidas",
        filas: visibles.map((p) => ({
          Proyecto: nombreProyecto(p.proyecto_id),
          Especialidad: p.especialidad,
          Partida: p.nombre,
          "Presupuesto (S/)": Number(p.presupuesto_inicial),
          "Costo Real (S/)": costoRealPartida(p.id, tareos, gastos),
          "Avance Fisico %": Number(p.avance_pct),
        })),
      },
    ]);
  }

  return (
    <>
      <Encabezado
        titulo="Partidas"
        subtitulo="Agrupadas por especialidad"
        acciones={
          <Boton variante="linea" onClick={exportar}>
            Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Nueva partida" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-5">
          <Campo etiqueta="Proyecto">
            <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Tipo de Instalación / Especialidad">
            <Select value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })}>
              {ESPECIALIDADES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Descripción de partida">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={140} />
          </Campo>
          <Campo etiqueta="Presupuesto inicial (S/)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.presupuesto_inicial}
              onChange={(e) => setForm({ ...form, presupuesto_inicial: e.target.value })}
              required
            />
          </Campo>
          <div className="flex items-end">
            <Boton type="submit" className="w-full py-2.5">
              Registrar partida
            </Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-5">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Listado por especialidad"
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
            <div key={esp} className="border-b border-line/60 last:border-0">
              <p className="bg-muted/60 px-5 py-2 label-mono">{esp}</p>
              <table className="w-full table-fixed font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="w-4/12 px-5 py-2 font-medium">Partida</th>
                    <th className="w-2/12 px-3 py-2 font-medium">Proyecto</th>
                    <th className="w-1/12 px-3 py-2 text-right font-medium">Presupuesto</th>
                    <th className="w-1/12 px-3 py-2 text-right font-medium">Costo real</th>
                    <th className="w-1/12 px-3 py-2 text-right font-medium">Avance</th>
                    <th className="w-1/12 px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="w-2/12 px-5 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const costo = costoRealPartida(p.id, tareos, gastos);
                    const dif = Number(p.presupuesto_inicial) - costo;
                    const enEdicion = editando?.id === p.id;
                    if (enEdicion) {
                      return (
                        <tr key={p.id} className="border-b border-line/40 last:border-0">
                          <td className="px-5 py-2">
                            <Input
                              value={editando.nombre}
                              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                              className="py-1 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{nombreProyecto(p.proyecto_id)}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editando.presupuesto_inicial}
                              onChange={(e) => setEditando({ ...editando, presupuesto_inicial: e.target.value })}
                              className="py-1 text-right text-xs"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right">{soles(costo)}</td>
                          <td className="px-3 py-2.5 text-right">{pct(Number(p.avance_pct))}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${dif < 0 ? "text-bad" : "text-good"}`}>
                            {soles(dif)}
                          </td>
                          <td className="px-5 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={actualizar}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                title="Guardar"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditando(null)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={p.id} className="border-b border-line/40 last:border-0">
                        <td className="px-5 py-2.5 font-semibold text-ink">{p.nombre}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{nombreProyecto(p.proyecto_id)}</td>
                        <td className="px-3 py-2.5 text-right">{soles(Number(p.presupuesto_inicial))}</td>
                        <td className="px-3 py-2.5 text-right">{soles(costo)}</td>
                        <td className="px-3 py-2.5 text-right">{pct(Number(p.avance_pct))}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${dif < 0 ? "text-bad" : "text-good"}`}>
                          {soles(dif)}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEditando({
                                  id: p.id,
                                  nombre: p.nombre,
                                  especialidad: p.especialidad,
                                  presupuesto_inicial: String(p.presupuesto_inicial),
                                })
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminar(p.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

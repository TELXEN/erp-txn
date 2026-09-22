import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { ESPECIALIDADES, pct, soles } from "@/lib/format";
import {
  agruparPorProyectoYEspecialidad,
  costoRealPartida,
  esContractual,
  resumenPresupuesto,
  useGastosDirectos,
  usePartidas,
  useProyectos,
  useTiposPresupuesto,
} from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { Pencil, Trash2, Check, X, LayoutGrid, Table2 } from "lucide-react";
import { Kanban } from "@/components/Kanban";
import { InsigniaPrioridad, InsigniaTipoPresupuesto } from "@/components/estado-ui";
import { PRIORIDADES, type Situacion } from "@/lib/configuracion";

export const Route = createFileRoute("/_authenticated/partidas")({
  head: () => ({
    meta: [
      { title: "Partidas — ERP TELXEN" },
      { name: "description", content: "Partidas organizadas por proyecto y especialidad, con presupuesto y costo real." },
      { property: "og:title", content: "Partidas — ERP TELXEN" },
      { property: "og:description", content: "Partidas por proyecto y especialidad con presupuesto y costo real." },
    ],
  }),
  component: Partidas,
});

function Partidas() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastos = [] } = useGastosDirectos();

  const { data: tipos = [] } = useTiposPresupuesto();

  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");
  const [form, setForm] = useState({
    proyecto_id: "",
    nombre: "",
    especialidad: ESPECIALIDADES[0] as string,
    presupuesto_inicial: "",
    prioridad: "Media",
    tipo_presupuesto: "Contractual",
    aplica_gg_utilidad: true,
  });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
    especialidad: string;
    presupuesto_inicial: string;
    tipo_presupuesto: string;
    aplica_gg_utilidad: boolean;
  } | null>(null);

  const nombreProyecto = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";

  const visibles = useMemo(
    () =>
      partidas.filter(
        (p) =>
          (!filtroProyecto || p.proyecto_id === filtroProyecto) &&
          (!filtroEsp || p.especialidad === filtroEsp) &&
          (!filtroTipo || (p.tipo_presupuesto ?? "Contractual") === filtroTipo),
      ),
    [partidas, filtroProyecto, filtroEsp, filtroTipo],
  );
  const resumen = useMemo(() => resumenPresupuesto(visibles, tipos), [visibles, tipos]);
  const nombresTipos = useMemo(() => {
    const activos = tipos.filter((t) => t.activo).map((t) => t.nombre);
    const usados = partidas.map((p) => p.tipo_presupuesto ?? "Contractual");
    return [...new Set(["Contractual", ...activos, ...usados])];
  }, [tipos, partidas]);
  const grupos = useMemo(() => agruparPorProyectoYEspecialidad(visibles, nombreProyecto), [visibles, nombreProyecto]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.from("partidas").insert({
      proyecto_id: form.proyecto_id,
      nombre: form.nombre.trim(),
      especialidad: form.especialidad,
      prioridad: form.prioridad,
      tipo_presupuesto: form.tipo_presupuesto,
      aplica_gg_utilidad: esContractual(form.tipo_presupuesto, tipos) ? true : form.aplica_gg_utilidad,
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
        tipo_presupuesto: editando.tipo_presupuesto,
        aplica_gg_utilidad: esContractual(editando.tipo_presupuesto, tipos) ? true : editando.aplica_gg_utilidad,
        presupuesto_inicial: Number(editando.presupuesto_inicial || 0),
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta partida? Se perderán los gastos directos vinculados.")) return;
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
          "Tipo de Presupuesto": p.tipo_presupuesto ?? "Contractual",
          "Presupuesto (S/)": Number(p.presupuesto_inicial),
          "Aplica GG y Utilidad": esContractual(p.tipo_presupuesto ?? "Contractual", tipos) || p.aplica_gg_utilidad !== false ? "Si" : "No",
          "Costo Real (S/)": costoRealPartida(p.id, gastos),
          "Avance Fisico %": Number(p.avance_pct),
        })),
      },
    ]);
  }

  async function crearTipo() {
    const nombre = window.prompt("Nombre del nuevo tipo de presupuesto (ej. Adicional 04)")?.trim();
    if (!nombre) return;
    setError("");
    const { error: err } = await supabase
      .from("tipos_presupuesto")
      .insert({ nombre, es_contractual: false, orden: tipos.length + 1 });
    if (err && !err.message.includes("duplicate")) return setError(err.message);
    await qc.invalidateQueries({ queryKey: ["tipos_presupuesto"] });
    setForm((f) => ({ ...f, tipo_presupuesto: nombre }));
  }

  async function mover(id: string, situacion: Situacion) {
    setError("");
    const { error: err } = await supabase.from("partidas").update({ situacion }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  return (
    <>
      <Encabezado
        titulo="Partidas"
        subtitulo="Organizadas por proyecto y especialidad"
        acciones={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-line bg-card p-1">
              <button
                type="button"
                onClick={() => setVista("tabla")}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[11px] ${vista === "tabla" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-ink"}`}
              >
                <Table2 size={13} /> Tabla
              </button>
              <button
                type="button"
                onClick={() => setVista("kanban")}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[11px] ${vista === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-ink"}`}
              >
                <LayoutGrid size={13} /> Kanban
              </button>
            </div>
            <Boton variante="linea" onClick={exportar}>
              Exportar a Excel
            </Boton>
          </div>
        }
      />

      <Panel titulo="Nueva partida" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-6">
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
          <Campo etiqueta="Tipo de presupuesto">
            <Select
              value={form.tipo_presupuesto}
              onChange={(e) => {
                if (e.target.value === "__nuevo__") void crearTipo();
                else setForm({ ...form, tipo_presupuesto: e.target.value });
              }}
            >
              {nombresTipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__nuevo__">+ Agregar tipo…</option>
            </Select>
            {!esContractual(form.tipo_presupuesto, tipos) && (
              <label className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.aplica_gg_utilidad}
                  onChange={(e) => setForm({ ...form, aplica_gg_utilidad: e.target.checked })}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                Cobrar gastos generales y utilidad en este adicional
              </label>
            )}
          </Campo>
          <Campo etiqueta="Prioridad">
            <Select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="flex items-end">
            <Boton type="submit" className="w-full py-2.5">
              Registrar partida
            </Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-6">{error}</p>}
        </form>
      </Panel>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { etiqueta: "Presupuesto contractual", valor: resumen.contractual },
          { etiqueta: "Total adicionales", valor: resumen.adicionales },
          { etiqueta: "Presupuesto vigente", valor: resumen.vigente },
        ].map((d) => (
          <div key={d.etiqueta} className="rounded-md border border-line bg-card p-4">
            <p className="label-mono text-muted-foreground">{d.etiqueta}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-ink">{soles(d.valor)}</p>
          </div>
        ))}
      </div>

      <Panel
        titulo={vista === "kanban" ? "Tablero Kanban de partidas" : "Listado por proyecto y especialidad"}
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
            <Select className="w-52" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {nombresTipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {grupos.length === 0 ? (
          <Vacio texto="No hay partidas con estos filtros." />
        ) : vista === "kanban" ? (
          <Kanban
            onMover={mover}
            tarjetas={visibles.map((p) => {
              const costo = costoRealPartida(p.id, gastos);
              const presu = Number(p.presupuesto_inicial);
              const gastoPct = presu > 0 ? (costo / presu) * 100 : 0;
              const sano = gastoPct <= Number(p.avance_pct);
              return {
                id: p.id,
                situacion: p.situacion,
                contenido: (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold leading-tight text-ink">{p.nombre}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{nombreProyecto(p.proyecto_id)}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.especialidad}</p>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Number(p.avance_pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{pct(Number(p.avance_pct))}</span>
                      <span className={`font-mono text-[10px] font-semibold ${sano ? "text-good" : "text-bad"}`}>
                        {soles(costo)} / {soles(presu)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <InsigniaPrioridad valor={p.prioridad} />
                      <InsigniaTipoPresupuesto valor={p.tipo_presupuesto ?? "Contractual"} />
                    </div>
                  </div>
                ),
              };
            })}
          />
        ) : (
          grupos.map(({ proyecto, grupos: espGrupos }) => (
            <div key={proyecto} className="border-b border-line last:border-0">
              <p className="bg-ink px-5 py-2 text-xs font-semibold uppercase tracking-wider text-paper">{proyecto}</p>
              <table className="w-full table-fixed font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th style={{ width: "18%" }} className="whitespace-nowrap px-5 py-2 font-medium">Proyecto</th>
                    <th style={{ width: "20%" }} className="whitespace-nowrap px-3 py-2 font-medium">Partida</th>
                    <th style={{ width: "13%" }} className="whitespace-nowrap px-3 py-2 font-medium">Tipo</th>
                    <th style={{ width: "11%" }} className="whitespace-nowrap px-3 py-2 text-right font-medium">Presupuesto</th>
                    <th style={{ width: "11%" }} className="whitespace-nowrap px-3 py-2 text-right font-medium">Costo real</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap px-3 py-2 text-right font-medium">Avance</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap px-3 py-2 text-right font-medium">Saldo</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap px-5 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {espGrupos.map(([esp, lista]) => (
                    <>
                      <tr key={`${esp}-header`} className="border-b border-line/40 bg-muted/40">
                        <td colSpan={8} className="px-5 py-1.5 label-mono">{esp}</td>
                      </tr>
                      {lista.map((p) => {
                        const costo = costoRealPartida(p.id, gastos);
                        const dif = Number(p.presupuesto_inicial) - costo;
                        const enEdicion = editando?.id === p.id;
                        if (enEdicion) {
                          return (
                            <tr key={p.id} className="border-b border-line/40 last:border-0">
                              <td className="px-5 py-2.5 font-semibold text-ink">{nombreProyecto(p.proyecto_id)}</td>
                              <td className="px-3 py-2">
                                <Input
                                  value={editando.nombre}
                                  onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                                  className="py-1 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={editando.tipo_presupuesto}
                                  onChange={(e) => setEditando({ ...editando, tipo_presupuesto: e.target.value })}
                                  className="py-1 text-xs"
                                >
                                  {nombresTipos.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </Select>
                                {!esContractual(editando.tipo_presupuesto, tipos) && (
                                  <label className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={editando.aplica_gg_utilidad}
                                      onChange={(e) => setEditando({ ...editando, aplica_gg_utilidad: e.target.checked })}
                                      className="size-3 accent-[var(--color-primary)]"
                                    />
                                    Con GG y utilidad
                                  </label>
                                )}
                              </td>
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
                            <td className="px-5 py-2.5 font-semibold text-ink">{nombreProyecto(p.proyecto_id)}</td>
                            <td className="px-3 py-2.5 font-semibold text-ink">{p.nombre}</td>
                            <td className="px-3 py-2.5">
                              <InsigniaTipoPresupuesto valor={p.tipo_presupuesto ?? "Contractual"} />
                              {!esContractual(p.tipo_presupuesto ?? "Contractual", tipos) && p.aplica_gg_utilidad === false && (
                                <span className="mt-1 block font-mono text-[10px] text-muted-foreground">Sin GG ni utilidad</span>
                              )}
                            </td>
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
                                      tipo_presupuesto: p.tipo_presupuesto ?? "Contractual",
                                      aplica_gg_utilidad: p.aplica_gg_utilidad !== false,
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
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

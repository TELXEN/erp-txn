import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LayoutGrid, Pencil, Table2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { Kanban } from "@/components/Kanban";
import { PRIORIDADES, SITUACIONES, type Situacion } from "@/lib/configuracion";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { useProyectos } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — ERP TELXEN" },
      { name: "description", content: "Registro y estado de los proyectos de la empresa constructora." },
      { property: "og:title", content: "Proyectos — ERP TELXEN" },
      { property: "og:description", content: "Registro y estado de los proyectos de la empresa." },
    ],
  }),
  component: Proyectos,
});

function Proyectos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");
  const [form, setForm] = useState({
    nombre: "",
    cliente: "",
    ubicacion: "",
    estado: "En Ejecucion",
    situacion: "No iniciado",
    prioridad: "Media",
  });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
    estado: "En Ejecucion" | "Finalizado";
    situacion: string;
    prioridad: string;
  } | null>(null);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.from("proyectos").insert({
      nombre: form.nombre.trim(),
      cliente: form.cliente.trim(),
      ubicacion: form.ubicacion.trim(),
      estado: form.estado as "En Ejecucion" | "Finalizado",
      situacion: form.situacion,
      prioridad: form.prioridad,
    });
    if (err) return setError(err.message);
    setForm({ nombre: "", cliente: "", ubicacion: "", estado: "En Ejecucion", situacion: "No iniciado", prioridad: "Media" });
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function actualizar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    const { error: err } = await supabase
      .from("proyectos")
      .update({
        nombre: editando.nombre.trim(),
        estado: editando.estado,
        situacion: editando.situacion,
        prioridad: editando.prioridad,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function mover(id: string, situacion: Situacion) {
    setError("");
    const { error: err } = await supabase.from("proyectos").update({ situacion }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este proyecto? Se perderán las partidas, tareos y gastos vinculados.")) return;
    await supabase.from("proyectos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  return (
    <>
      <Encabezado
        titulo="Proyectos"
        subtitulo="Obras de la empresa"
        acciones={
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
        }
      />

      <Panel
        titulo="Nuevo proyecto"
        className="mb-4"
        extra={<Boton type="submit" form="form-proyecto">Registrar</Boton>}
      >
        <form id="form-proyecto" onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-6">
          <Campo etiqueta="Nombre de la obra">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={120} />
          </Campo>
          <Campo etiqueta="Cliente">
            <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Estado">
            <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="En Ejecucion">En Ejecución</option>
              <option value="Finalizado">Finalizado</option>
            </Select>
          </Campo>
          <Campo etiqueta="Status">
            <Select value={form.situacion} onChange={(e) => setForm({ ...form, situacion: e.target.value })}>
              {SITUACIONES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
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
          {error && <p className="font-mono text-xs text-bad sm:col-span-6">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo={vista === "tabla" ? "Listado de proyectos" : "Tablero Kanban de proyectos"}
        extra={<span className="font-mono text-[11px] text-muted-foreground">{proyectos.length} proyectos</span>}
      >
        {proyectos.length === 0 ? (
          <Vacio texto="Aún no hay proyectos registrados." />
        ) : vista === "kanban" ? (
          <Kanban
            onMover={mover}
            tarjetas={proyectos.map((p) => ({
              id: p.id,
              situacion: p.situacion,
              contenido: (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold leading-tight text-ink">{p.nombre}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.cliente || "Sin cliente"}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.ubicacion || "Sin ubicación"}</p>
                  <InsigniaPrioridad valor={p.prioridad} />
                </div>
              ),
            }))}
          />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-3/12 px-5 py-2 font-medium">Descripción</th>
                <th className="w-2/12 px-3 py-2 font-medium">Cliente</th>
                <th className="w-2/12 px-3 py-2 font-medium">Ubicación</th>
                <th className="w-2/12 px-3 py-2 font-medium">Status</th>
                <th className="w-1/12 px-3 py-2 font-medium">Prioridad</th>
                <th className="w-2/12 px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => {
                const enEdicion = editando?.id === p.id;
                return (
                  <tr key={p.id} className="border-b border-line/60">
                    {enEdicion ? (
                      <>
                        <td className="px-5 py-2">
                          <Input
                            value={editando.nombre}
                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                            maxLength={120}
                            autoFocus
                          />
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.cliente || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.ubicacion || "—"}</td>
                        <td className="px-3 py-2">
                          <Select
                            value={editando.situacion}
                            onChange={(e) => setEditando({ ...editando, situacion: e.target.value })}
                            className="py-1 text-xs"
                          >
                            {SITUACIONES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={editando.prioridad}
                            onChange={(e) => setEditando({ ...editando, prioridad: e.target.value })}
                            className="py-1 text-xs"
                          >
                            {PRIORIDADES.map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => actualizar()}
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-primary hover:text-primary"
                              title="Guardar"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-bad hover:text-bad"
                              title="Cancelar"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2.5 font-semibold text-ink">{p.nombre}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.cliente || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.ubicacion || "—"}</td>
                        <td className="px-3 py-2.5">
                          <InsigniaSituacion valor={p.situacion} />
                        </td>
                        <td className="px-3 py-2.5">
                          <InsigniaPrioridad valor={p.prioridad} />
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setEditando({
                                  id: p.id,
                                  nombre: p.nombre,
                                  estado: p.estado,
                                  situacion: p.situacion,
                                  prioridad: p.prioridad,
                                })
                              }
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-primary hover:text-primary"
                              title="Editar"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              onClick={() => eliminar(p.id)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-bad hover:text-bad"
                              title="Eliminar"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

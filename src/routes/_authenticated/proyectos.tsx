import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { useProyectos } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — Control de Proyectos" },
      { name: "description", content: "Registro y estado de los proyectos de la empresa constructora." },
      { property: "og:title", content: "Proyectos — Control de Proyectos" },
      { property: "og:description", content: "Registro y estado de los proyectos de la empresa." },
    ],
  }),
  component: Proyectos,
});

function Proyectos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const [form, setForm] = useState({ nombre: "", cliente: "", ubicacion: "", estado: "En Ejecucion" });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
    estado: "En Ejecucion" | "Finalizado";
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
    });
    if (err) return setError(err.message);
    setForm({ nombre: "", cliente: "", ubicacion: "", estado: "En Ejecucion" });
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function actualizar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    const { error: err } = await supabase
      .from("proyectos")
      .update({ nombre: editando.nombre.trim(), estado: editando.estado })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este proyecto? Se perderán las partidas, tareos y gastos vinculados.")) return;
    await supabase.from("proyectos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  return (
    <>
      <Encabezado titulo="Proyectos" subtitulo="Obras de la empresa" />

      <Panel
        titulo="Nuevo proyecto"
        className="mb-4"
        extra={<Boton type="submit" form="form-proyecto">Registrar</Boton>}
      >
        <form id="form-proyecto" onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
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
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Listado de proyectos" extra={<span className="font-mono text-[11px] text-muted-foreground">{proyectos.length} proyectos</span>}>
        {proyectos.length === 0 ? (
          <Vacio texto="Aún no hay proyectos registrados." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-4/12 px-5 py-2 font-medium">Descripción</th>
                <th className="w-2/12 px-3 py-2 font-medium">Cliente</th>
                <th className="w-2/12 px-3 py-2 font-medium">Ubicación</th>
                <th className="w-2/12 px-3 py-2 font-medium">Estado</th>
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
                            value={editando.estado}
                            onChange={(e) =>
                              setEditando({ ...editando, estado: e.target.value as "En Ejecucion" | "Finalizado" })
                            }
                          >
                            <option value="En Ejecucion">En Ejecución</option>
                            <option value="Finalizado">Finalizado</option>
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
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {p.estado === "En Ejecucion" ? "En Ejecución" : "Finalizado"}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setEditando({ id: p.id, nombre: p.nombre, estado: p.estado })
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

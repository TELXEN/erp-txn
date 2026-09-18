import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { useProyectos } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — Control de Obra" },
      { name: "description", content: "Registro y estado de los proyectos de la empresa constructora." },
      { property: "og:title", content: "Proyectos — Control de Obra" },
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

  async function cambiarEstado(id: string, estado: string) {
    await supabase
      .from("proyectos")
      .update({ estado: estado as "En Ejecucion" | "Finalizado" })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  return (
    <>
      <Encabezado titulo="Proyectos" subtitulo="Obras de la empresa" />

      <Panel titulo="Nuevo proyecto" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Nombre de la obra">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={120} />
          </Campo>
          <Campo etiqueta="Cliente">
            <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} maxLength={120} />
          </Campo>
          <div className="flex items-end gap-2">
            <Campo etiqueta="Estado">
              <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="En Ejecucion">En Ejecución</option>
                <option value="Finalizado">Finalizado</option>
              </Select>
            </Campo>
            <Boton type="submit">Registrar</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Listado de proyectos" extra={<span className="font-mono text-[11px] text-muted-foreground">{proyectos.length} proyectos</span>}>
        {proyectos.length === 0 ? (
          <Vacio texto="Aún no hay proyectos registrados." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Obra</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Ubicación</th>
                <th className="px-5 py-2 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="px-5 py-2.5 font-semibold text-ink">{p.nombre}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.cliente || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.ubicacion || "—"}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Etiqueta tono={p.estado === "Finalizado" ? "neutro" : "good"}>
                        {p.estado === "Finalizado" ? "Finalizado" : "En Ejecución"}
                      </Etiqueta>
                      <Select
                        className="w-36"
                        value={p.estado}
                        onChange={(e) => cambiarEstado(p.id, e.target.value)}
                      >
                        <option value="En Ejecucion">En Ejecución</option>
                        <option value="Finalizado">Finalizado</option>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

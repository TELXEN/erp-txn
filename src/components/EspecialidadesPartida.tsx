import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { useEspecialidadesPartida, type EspecialidadPartida } from "@/lib/especialidades";

const vacio = { codigo: "", nombre: "", orden: "" };

export function EspecialidadesPartida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useEspecialidadesPartida();
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState<EspecialidadPartida | null>(null);
  const [error, setError] = useState("");

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["especialidades_partida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
  };

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nombre = form.nombre.trim();
    if (!nombre) return setError("Escribe el nombre de la especialidad.");
    const orden = Number(form.orden) || lista.length + 1;
    const { error: err } = await supabase
      .from("especialidades_partida")
      .insert({ codigo: "", nombre, orden });
    if (err)
      return setError(
        err.message.includes("duplicate") ? "Ya existe una especialidad con ese nombre." : err.message,
      );
    setForm(vacio);
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const anterior = lista.find((e) => e.id === editando.id);
    const { error: err } = await supabase
      .from("especialidades_partida")
      .update({
        nombre: editando.nombre.trim(),
        orden: Number(editando.orden) || 0,
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    // Si cambió el nombre, se propaga a las partidas que ya lo usaban.
    if (anterior && anterior.nombre !== editando.nombre.trim()) {
      await supabase
        .from("partidas")
        .update({ especialidad: editando.nombre.trim() })
        .eq("especialidad", anterior.nombre);
    }
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este capítulo del catálogo?")) return;
    setError("");
    const { error: err } = await supabase.from("especialidades_partida").delete().eq("id", id);
    if (err) return setError(err.message);
    refrescar();
  }

  return (
    <>
      <Panel titulo="Nuevo registro de especialidades" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-3">
          <Campo etiqueta="Nombre del capítulo">
            <Input
              className="py-1.5"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              maxLength={80}
              placeholder="Instalaciones Mecánicas"
            />
          </Campo>
          <Campo etiqueta="Orden">
            <Input
              className="py-1.5"
              type="number"
              min={0}
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: e.target.value })}
              placeholder={String(lista.length + 1)}
            />
          </Campo>
          <div className="flex items-end">
            <Boton type="submit" className="w-full py-2.5">
              Agregar especialidad
            </Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-3">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Listado de especialidades">
        {lista.length === 0 ? (
          <Vacio texto="Aún no hay capítulos registrados." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[58%] px-5 py-2 font-medium">Especialidad</th>
                <th className="w-[12%] px-3 py-2 text-right font-medium">Orden</th>
                <th className="w-[15%] px-3 py-2 font-medium">Estado</th>
                <th className="w-[15%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) =>
                editando?.id === e.id ? (
                  <tr key={e.id} className="border-b border-line/40 last:border-0">
                    <td className="px-3 py-2">
                      <Input
                        className="py-1 text-xs"
                        value={editando.nombre}
                        onChange={(ev) => setEditando({ ...editando, nombre: ev.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="py-1 text-right text-xs"
                        type="number"
                        value={editando.orden}
                        onChange={(ev) => setEditando({ ...editando, orden: Number(ev.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        className="py-1 text-xs"
                        value={editando.activo ? "si" : "no"}
                        onChange={(ev) => setEditando({ ...editando, activo: ev.target.value === "si" })}
                      >
                        <option value="si">Activo</option>
                        <option value="no">Inactivo</option>
                      </Select>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={guardar}
                          title="Guardar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          title="Cancelar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-line/40 last:border-0">
                    <td className="px-3 py-2.5 font-semibold text-ink">{e.nombre}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{e.orden}</td>
                    <td className="px-3 py-2.5">
                      <span className={e.activo ? "text-good" : "text-muted-foreground"}>
                        {e.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditando(e)}
                          title="Editar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(e.id)}
                          title="Eliminar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
        <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Las especialidades no llevan código fijo: el capítulo (01, 02...) se asigna según el orden en que se cargan en cada obra o cotización.
        </p>
      </Panel>
    </>
  );
}

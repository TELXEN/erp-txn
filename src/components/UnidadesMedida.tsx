import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { useUnidadesMedida, type UnidadMedida } from "@/lib/unidades";

const vacio = { simbolo: "", descripcion: "", orden: "" };

export function UnidadesMedida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useUnidadesMedida();
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState<UnidadMedida | null>(null);
  const [error, setError] = useState("");

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["unidades_medida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
  };

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const simbolo = form.simbolo.trim();
    if (!simbolo) return setError("Escribe el símbolo de la unidad (ej. m2).");
    const { error: err } = await supabase.from("unidades_medida").insert({
      simbolo,
      descripcion: form.descripcion.trim(),
      orden: Number(form.orden) || lista.length + 1,
    });
    if (err)
      return setError(err.message.includes("duplicate") ? "Esa unidad ya está registrada." : err.message);
    setForm(vacio);
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const anterior = lista.find((u) => u.id === editando.id);
    const simbolo = editando.simbolo.trim();
    const { error: err } = await supabase
      .from("unidades_medida")
      .update({
        simbolo,
        descripcion: editando.descripcion.trim(),
        orden: Number(editando.orden) || 0,
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    if (anterior && anterior.simbolo !== simbolo) {
      await supabase.from("partidas").update({ unidad: simbolo }).eq("unidad", anterior.simbolo);
    }
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta unidad de medida del catálogo?")) return;
    setError("");
    const { error: err } = await supabase.from("unidades_medida").delete().eq("id", id);
    if (err) return setError(err.message);
    refrescar();
  }

  return (
    <>
      <Panel titulo="Nueva unidad de medida" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-4">
          <Campo etiqueta="Símbolo">
            <Input
              className="py-1.5 font-mono"
              value={form.simbolo}
              onChange={(e) => setForm({ ...form, simbolo: e.target.value })}
              maxLength={10}
              placeholder="m2"
            />
          </Campo>
          <Campo etiqueta="Descripción">
            <Input
              className="py-1.5"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              maxLength={60}
              placeholder="Metro cuadrado"
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
              Agregar unidad
            </Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Unidades de medida">
        {lista.length === 0 ? (
          <Vacio texto="Aún no hay unidades registradas." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[14%] px-5 py-2 font-medium">Símbolo</th>
                <th className="w-[44%] px-3 py-2 font-medium">Descripción</th>
                <th className="w-[12%] px-3 py-2 text-right font-medium">Orden</th>
                <th className="w-[15%] px-3 py-2 font-medium">Estado</th>
                <th className="w-[15%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) =>
                editando?.id === u.id ? (
                  <tr key={u.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-2">
                      <Input
                        className="py-1 font-mono text-xs"
                        value={editando.simbolo}
                        onChange={(ev) => setEditando({ ...editando, simbolo: ev.target.value })}
                        maxLength={10}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="py-1 text-xs"
                        value={editando.descripcion}
                        onChange={(ev) => setEditando({ ...editando, descripcion: ev.target.value })}
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
                        <option value="si">Activa</option>
                        <option value="no">Inactiva</option>
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
                  <tr key={u.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-2.5 font-semibold text-primary">{u.simbolo}</td>
                    <td className="px-3 py-2.5 text-ink">{u.descripcion}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{u.orden}</td>
                    <td className="px-3 py-2.5">
                      <span className={u.activo ? "text-good" : "text-muted-foreground"}>
                        {u.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditando(u)}
                          title="Editar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(u.id)}
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
          El presupuesto de cada partida se calcula como metrado × precio unitario. Para trabajos a suma alzada
          usa la unidad «glb» con metrado 1.
        </p>
      </Panel>
    </>
  );
}

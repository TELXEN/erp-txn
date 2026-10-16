import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Panel, Select } from "@/components/ui-kit";
import { useUnidadesMedida, type UnidadMedida } from "@/lib/unidades";

const vacio = { simbolo: "", descripcion: "", orden: "" };

export function UnidadesMedida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useUnidadesMedida();
  const [nueva, setNueva] = useState(vacio);
  const [editando, setEditando] = useState<UnidadMedida | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["unidades_medida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
  };

  async function crear() {
    if (guardando) return;
    setError("");
    const simbolo = nueva.simbolo.trim();
    if (!simbolo) return setError("Escribe el símbolo de la unidad (ej. m2).");
    setGuardando(true);
    try {
      const { error: err } = await supabase.from("unidades_medida").insert({
        simbolo,
        descripcion: nueva.descripcion.trim(),
        orden: Number(nueva.orden) || lista.length + 1,
      });
      if (err)
        throw new Error(err.message.includes("duplicate") ? "Esa unidad ya está registrada." : err.message);
      setNueva(vacio);
      refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar.");
    } finally {
      setGuardando(false);
    }
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

  const teclaNueva = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void crear();
    }
  };

  const inputCls = "w-full rounded-md border border-line bg-background px-2 py-1 text-xs outline-none focus:border-primary";

  return (
    <Panel titulo="Unidades de medida">
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
          {/* Fila de captura rápida (siempre visible arriba) */}
          <tr className="border-b border-dashed border-line/60 bg-muted/20">
            <td className="px-5 py-2">
              <input
                className={`${inputCls} font-mono`}
                placeholder="m2"
                maxLength={10}
                value={nueva.simbolo} data-formato="unidad"
                onChange={(e) => setNueva({ ...nueva, simbolo: e.target.value })}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2">
              <input
                className={inputCls}
                placeholder="Descripción y Enter…"
                maxLength={60}
                value={nueva.descripcion} data-formato="oracion"
                onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2">
              <input
                className={`${inputCls} text-right`}
                type="number"
                min={0}
                placeholder={String(lista.length + 1)}
                value={nueva.orden}
                onChange={(e) => setNueva({ ...nueva, orden: e.target.value })}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2 text-muted-foreground/60">Activa</td>
            <td className="px-5 py-2">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => void crear()}
                  disabled={guardando}
                  title="Registrar unidad"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              </div>
            </td>
          </tr>
          {lista.map((u) =>
            editando?.id === u.id ? (
              <tr key={u.id} className="border-b border-line/40 last:border-0">
                <td className="px-5 py-2">
                  <Input
                    className="py-1 font-mono text-xs"
                    value={editando.simbolo} data-formato="unidad"
                    onChange={(ev) => setEditando({ ...editando, simbolo: ev.target.value })}
                    maxLength={10}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="py-1 text-xs"
                    value={editando.descripcion} data-formato="oracion"
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
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bad/40 text-bad hover:border-bad"
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
      {error && <p className="px-5 py-2 font-mono text-xs text-bad">{error}</p>}
      <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Escribe en la primera fila y pulsa Enter para registrar. El presupuesto de cada partida se calcula como metrado × precio unitario. Para trabajos a suma alzada usa la unidad «glb» con metrado 1.
      </p>
    </Panel>
  );
}

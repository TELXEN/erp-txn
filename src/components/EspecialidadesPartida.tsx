import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Panel, Select } from "@/components/ui-kit";
import { useEspecialidadesPartida, type EspecialidadPartida } from "@/lib/especialidades";
import { FlechasOrden } from "@/components/FlechasOrden";
import { moverWbs, recodificarWbs } from "@/lib/wbs";

export function EspecialidadesPartida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useEspecialidadesPartida();
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<EspecialidadPartida | null>(null);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [moviendo, setMoviendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const indiceSeleccionado = lista.findIndex((e) => e.id === seleccionadaId);

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["especialidades_partida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
    qc.invalidateQueries({ queryKey: ["categorias_partida"] });
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
  };

  async function mover(id: string, dir: -1 | 1) {
    setMoviendo(true);
    try { await moverWbs("especialidades", id, dir); refrescar(); }
    catch (e) { setError((e as Error).message); }
    setMoviendo(false);
  }

  async function crear() {
    if (guardando) return;
    setError("");
    const nombre = nueva.trim();
    if (!nombre) return setError("Escribe el nombre de la especialidad.");
    setGuardando(true);
    try {
      const orden = Math.max(0, ...lista.map((x) => x.orden)) + 1;
      const { error: err } = await supabase
        .from("especialidades_partida")
        .insert({ codigo: "", nombre, orden });
      if (err)
        throw new Error(
          err.message.includes("duplicate") ? "Ya existe una especialidad con ese nombre." : err.message,
        );
      setNueva("");
      await recodificarWbs().catch(() => undefined);
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
    const anterior = lista.find((e) => e.id === editando.id);
    const { error: err } = await supabase
      .from("especialidades_partida")
      .update({
        nombre: editando.nombre.trim(),
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
    await recodificarWbs().catch(() => undefined);
    refrescar();
  }

  const teclaNueva = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void crear();
    }
  };

  return (
    <Panel
      titulo="Listado de especialidades"
      extra={
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
            {indiceSeleccionado >= 0 ? "Especialidad seleccionada" : "Selecciona una fila"}
          </span>
          <FlechasOrden
            primero={indiceSeleccionado <= 0}
            ultimo={indiceSeleccionado < 0 || indiceSeleccionado === lista.length - 1}
            ocupado={moviendo || indiceSeleccionado < 0}
            onMover={(d) => {
              const seleccionada = lista[indiceSeleccionado];
              if (seleccionada) void mover(seleccionada.id, d);
            }}
          />
        </div>
      }
    >
      <table className="w-full table-fixed font-mono text-xs">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="w-[10%] px-3 py-2 font-medium">Código</th>
            <th className="w-[48%] px-3 py-2 font-medium">Especialidad</th>
            <th className="w-[12%] px-3 py-2 text-center font-medium">Orden</th>
            <th className="w-[15%] px-3 py-2 font-medium">Estado</th>
            <th className="w-[15%] px-5 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {/* Fila de captura rápida (siempre visible arriba) */}
          <tr className="border-b border-dashed border-line/60 bg-muted/20">
            <td className="px-3 py-2 text-muted-foreground/60">auto</td>
            <td className="px-3 py-2">
              <input
                className="w-full rounded-md border border-line bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                placeholder="Escribe la especialidad y pulsa Enter…"
                value={nueva}
                maxLength={80}
                onChange={(e) => setNueva(e.target.value)}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2 text-center text-muted-foreground/60">auto</td>
            <td className="px-3 py-2 text-muted-foreground/60">Activo</td>
            <td className="px-5 py-2">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => void crear()}
                  disabled={guardando}
                  title="Registrar especialidad"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              </div>
            </td>
          </tr>
          {lista.map((e, i) =>
            editando?.id === e.id ? (
              <tr key={e.id} className="border-b border-line/40 last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{e.codigo}</td>
                <td className="px-3 py-2">
                  <Input
                    className="py-1 text-xs"
                    value={editando.nombre}
                    onChange={(ev) => setEditando({ ...editando, nombre: ev.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-center text-muted-foreground">{e.orden}</td>
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
              <tr
                key={e.id}
                tabIndex={0}
                aria-selected={seleccionadaId === e.id}
                onClick={() => setSeleccionadaId(e.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setSeleccionadaId(e.id);
                  }
                }}
                className={`cursor-pointer border-b border-line/40 outline-none transition-colors last:border-0 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                  seleccionadaId === e.id ? "bg-primary/10" : ""
                }`}
              >
                <td className="px-3 py-2.5 text-primary">{e.codigo}</td>
                <td className="px-3 py-2.5 font-semibold text-ink">{e.nombre}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{i + 1}</td>
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
      {error && <p className="px-5 py-2 font-mono text-xs text-bad">{error}</p>}
      <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Escribe en la primera fila y pulsa Enter para registrar. Selecciona una fila y usa las flechas de la cabecera para reordenar. Los códigos de sus categorías y partidas se actualizan solos.
      </p>
    </Panel>
  );
}

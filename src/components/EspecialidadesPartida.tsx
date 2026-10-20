import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Info, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Panel, Select } from "@/components/ui-kit";
import {
  BLOQUES_ESPECIALIDAD,
  useEspecialidadesPartida,
  type BloqueEspecialidad,
  type EspecialidadPartida,
} from "@/lib/especialidades";
import { FlechasOrden } from "@/components/FlechasOrden";
import { moverWbs, recodificarWbs } from "@/lib/wbs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const btn =
  "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors disabled:opacity-50";

export function EspecialidadesPartida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useEspecialidadesPartida();
  const [nueva, setNueva] = useState<Record<BloqueEspecialidad, string>>({ ingenieria: "", construccion: "" });
  const [editando, setEditando] = useState<EspecialidadPartida | null>(null);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [cerrados, setCerrados] = useState<Set<BloqueEspecialidad>>(new Set());
  const [error, setError] = useState("");
  const [moviendo, setMoviendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const seleccionada = lista.find((e) => e.id === seleccionadaId);
  const delBloque = (b: BloqueEspecialidad) => lista.filter((e) => e.bloque === b);
  const hermanos = seleccionada ? delBloque(seleccionada.bloque) : [];
  const indice = seleccionada ? hermanos.findIndex((e) => e.id === seleccionada.id) : -1;

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

  async function crear(bloque: BloqueEspecialidad) {
    if (guardando) return;
    setError("");
    const nombre = nueva[bloque].trim();
    if (!nombre) return setError("Escribe el nombre de la especialidad.");
    setGuardando(true);
    try {
      const orden = Math.max(0, ...delBloque(bloque).map((x) => x.orden)) + 1;
      const { error: err } = await supabase
        .from("especialidades_partida")
        .insert({ codigo: `n${Date.now()}`, nombre, orden, bloque });
      if (err)
        throw new Error(
          err.message.includes("duplicate") ? "Ya existe una especialidad con ese nombre." : err.message,
        );
      setNueva((n) => ({ ...n, [bloque]: "" }));
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
    const cambioBloque = anterior && anterior.bloque !== editando.bloque;
    const { error: err } = await supabase
      .from("especialidades_partida")
      .update({
        nombre: editando.nombre.trim(),
        activo: editando.activo,
        descripcion: editando.descripcion?.trim() || null,
        bloque: editando.bloque,
        ...(cambioBloque ? { orden: Math.max(0, ...delBloque(editando.bloque).map((x) => x.orden)) + 1 } : {}),
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    if (anterior && anterior.nombre !== editando.nombre.trim()) {
      await supabase
        .from("partidas")
        .update({ especialidad: editando.nombre.trim() })
        .eq("especialidad", anterior.nombre);
    }
    if (cambioBloque) await recodificarWbs().catch(() => undefined);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta especialidad del catálogo?")) return;
    setError("");
    const { error: err } = await supabase.from("especialidades_partida").delete().eq("id", id);
    if (err) return setError(err.message);
    await recodificarWbs().catch(() => undefined);
    refrescar();
  }

  const alternar = (b: BloqueEspecialidad) =>
    setCerrados((s) => {
      const n = new Set(s);
      if (n.has(b)) n.delete(b); else n.add(b);
      return n;
    });

  return (
    <TooltipProvider delayDuration={150}>
      <Panel
        titulo="Catálogo maestro de especialidades"
        extra={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
              {seleccionada ? seleccionada.nombre : "Selecciona una especialidad"}
            </span>
            <FlechasOrden
              primero={indice <= 0}
              ultimo={indice < 0 || indice === hermanos.length - 1}
              ocupado={moviendo || indice < 0}
              onMover={(d) => seleccionada && void mover(seleccionada.id, d)}
            />
          </div>
        }
      >
        {BLOQUES_ESPECIALIDAD.map(({ clave, titulo }) => {
          const items = delBloque(clave);
          const abierto = !cerrados.has(clave);
          return (
            <section key={clave} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => alternar(clave)}
                className="flex w-full items-center gap-2 bg-muted/40 px-4 py-2 text-left"
              >
                {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink">{titulo}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length} especialidades</span>
              </button>
              {abierto && (
                <ul className="divide-y divide-line/40 font-mono text-xs">
                  {items.map((e) =>
                    editando?.id === e.id ? (
                      <li key={e.id} className="grid gap-2 bg-primary/5 px-4 py-2 sm:grid-cols-[70px_1fr_1.4fr_150px_110px_auto] sm:items-center">
                        <span className="text-muted-foreground">{e.codigo}</span>
                        <Input className="py-1 text-xs" value={editando.nombre} data-formato="titulo"
                          onChange={(ev) => setEditando({ ...editando, nombre: ev.target.value })} />
                        <Input className="py-1 text-xs" placeholder="Descripción de ayuda" value={editando.descripcion ?? ""}
                          onChange={(ev) => setEditando({ ...editando, descripcion: ev.target.value })} />
                        <Select className="py-1 text-xs" value={editando.bloque}
                          onChange={(ev) => setEditando({ ...editando, bloque: ev.target.value as BloqueEspecialidad })}>
                          {BLOQUES_ESPECIALIDAD.map((b) => <option key={b.clave} value={b.clave}>{b.titulo}</option>)}
                        </Select>
                        <Select className="py-1 text-xs" value={editando.activo ? "si" : "no"}
                          onChange={(ev) => setEditando({ ...editando, activo: ev.target.value === "si" })}>
                          <option value="si">Activo</option>
                          <option value="no">Inactivo</option>
                        </Select>
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={guardar} title="Guardar" className={`${btn} border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground`}><Check size={13} /></button>
                          <button type="button" onClick={() => setEditando(null)} title="Cancelar" className={`${btn} border-line hover:bg-muted`}><X size={13} /></button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={e.id}
                        tabIndex={0}
                        aria-selected={seleccionadaId === e.id}
                        onClick={() => setSeleccionadaId(e.id)}
                        className={`group flex cursor-pointer items-center gap-3 px-4 py-1.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${seleccionadaId === e.id ? "bg-primary/10" : ""}`}
                      >
                        <span className="w-12 shrink-0 tabular-nums text-primary">{e.codigo}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`flex min-w-0 items-center gap-1.5 font-semibold ${e.activo ? "text-ink" : "text-muted-foreground line-through"}`}>
                              <span className="truncate">{e.nombre}</span>
                              <Info size={13} className="shrink-0 text-muted-foreground/70 group-hover:text-primary" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs bg-ink text-[11px] leading-relaxed text-paper">
                            {e.descripcion || "Sin descripción. Usa editar para agregar una ayuda."}
                          </TooltipContent>
                        </Tooltip>
                        {!e.activo && <span className="text-[10px] text-muted-foreground">Inactivo</span>}
                        <div className="ml-auto flex gap-1 opacity-60 group-hover:opacity-100">
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); setEditando(e); }} title="Editar" className={`${btn} border-line text-muted-foreground hover:border-primary hover:text-primary`}><Pencil size={12} /></button>
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); void eliminar(e.id); }} title="Eliminar" className={`${btn} border-bad/40 text-bad hover:border-bad`}><Trash2 size={12} /></button>
                        </div>
                      </li>
                    ),
                  )}
                  <li className="flex items-center gap-3 border-t border-dashed border-line/60 bg-muted/20 px-4 py-1.5">
                    <span className="w-12 shrink-0 text-muted-foreground/60">auto</span>
                    <input
                      className="flex-1 rounded-md border border-line bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                      placeholder="Nueva especialidad y Enter…"
                      value={nueva[clave]} data-formato="titulo" maxLength={80}
                      onChange={(ev) => setNueva((n) => ({ ...n, [clave]: ev.target.value }))}
                      onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); void crear(clave); } }}
                    />
                    <button type="button" onClick={() => void crear(clave)} disabled={guardando} title="Registrar especialidad"
                      className={`${btn} border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground`}><Check size={13} /></button>
                  </li>
                </ul>
              )}
            </section>
          );
        })}
        {error && <p className="px-5 py-2 font-mono text-xs text-bad">{error}</p>}
        <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Pasa el mouse sobre una especialidad para ver su alcance. Selecciónala y usa las flechas para reordenar dentro de su bloque; los códigos de categorías y partidas se actualizan solos.
        </p>
      </Panel>
    </TooltipProvider>
  );
}

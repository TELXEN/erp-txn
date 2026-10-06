import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, Panel, Select } from "@/components/ui-kit";
import { useCategoriasPartida, type CategoriaPartida } from "@/lib/categorias";
import { useGruposCotizacion } from "@/lib/cotizaciones";
import { FlechasOrden } from "@/components/FlechasOrden";
import { moverWbs, recodificarWbs, ORDEN_FINAL } from "@/lib/wbs";

const vacio = { nombre: "", grupo: "" };

export function CategoriasPartida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useCategoriasPartida();
  const { data: grupos = [] } = useGruposCotizacion();
  const [nueva, setNueva] = useState(vacio);
  const [editando, setEditando] = useState<CategoriaPartida | null>(null);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");
  const [moviendo, setMoviendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["categorias_partida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
  };

  async function mover(id: string, dir: -1 | 1) {
    setMoviendo(true);
    try { await moverWbs("categorias", id, dir); refrescar(); }
    catch (e) { setError((e as Error).message); }
    setMoviendo(false);
  }

  const opcionesGrupo = grupos.filter((g) => g.activo);

  const visibles = useMemo(
    () => (filtro ? lista.filter((c) => c.grupo === filtro) : lista),
    [lista, filtro],
  );

  const indiceSeleccionado = visibles.findIndex((c) => c.id === seleccionadaId);
  const categoriaSeleccionada = indiceSeleccionado >= 0 ? visibles[indiceSeleccionado] : undefined;
  const primeraDelGrupo = categoriaSeleccionada
    ? !visibles.some(
        (c) => c.grupo === categoriaSeleccionada.grupo && c.orden < categoriaSeleccionada.orden,
      )
    : true;
  const ultimaDelGrupo = categoriaSeleccionada
    ? !visibles.some(
        (c) => c.grupo === categoriaSeleccionada.grupo && c.orden > categoriaSeleccionada.orden,
      )
    : true;

  async function crear() {
    if (guardando) return;
    setError("");
    const nombre = nueva.nombre.trim();
    if (!nombre) return setError("Escribe el nombre de la categoría.");
    if (!nueva.grupo) return setError("Elige el grupo al que pertenece.");
    setGuardando(true);
    try {
      const orden = Math.max(0, ...lista.filter((c) => c.grupo === nueva.grupo).map((c) => c.orden)) + 1;
      const { error: err } = await supabase
        .from("categorias_partida")
        .insert({ codigo: "", nombre, grupo: nueva.grupo, orden });
      if (err)
        throw new Error(
          err.code === "23505" ? "Ya existe esa categoría en el grupo elegido." : err.message,
        );
      setNueva({ ...vacio, grupo: nueva.grupo });
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
    const anterior = lista.find((c) => c.id === editando.id);
    const cambioGrupo = anterior !== undefined && anterior.grupo !== editando.grupo;
    const nombre = editando.nombre.trim();
    const { error: err } = await supabase
      .from("categorias_partida")
      .update({
        nombre,
        grupo: editando.grupo ?? "",
        ...(cambioGrupo ? { orden: ORDEN_FINAL } : {}),
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    if (anterior && anterior.nombre !== nombre) {
      await supabase.from("partidas").update({ categoria: nombre }).eq("categoria", anterior.nombre);
      await supabase
        .from("partidas_maestras")
        .update({ categoria: nombre })
        .eq("categoria", anterior.nombre);
      await supabase
        .from("cotizacion_items")
        .update({ categoria: nombre })
        .eq("categoria", anterior.nombre);
    }
    await recodificarWbs().catch(() => undefined);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta categoría del catálogo?")) return;
    const { error: err } = await supabase.from("categorias_partida").delete().eq("id", id);
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

  const inputCls = "w-full rounded-md border border-line bg-background px-2 py-1 text-xs outline-none focus:border-primary";
  const selCls = "w-full rounded-md border border-line bg-background px-1.5 py-1 text-xs outline-none focus:border-primary";

  return (
    <Panel
      titulo="Listado de categorías"
      extra={
        <div className="flex items-center gap-2">
          <div className="w-64">
            <Select
              className="py-1 text-xs"
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value);
                setSeleccionadaId(null);
              }}
            >
              <option value="">Todos los grupos</option>
              {opcionesGrupo.map((g) => (
                <option key={g.id} value={g.nombre}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </div>
          <FlechasOrden
            primero={primeraDelGrupo}
            ultimo={ultimaDelGrupo}
            ocupado={moviendo || !categoriaSeleccionada}
            onMover={(d) => {
              if (categoriaSeleccionada) void mover(categoriaSeleccionada.id, d);
            }}
          />
        </div>
      }
    >
      <table className="w-full table-fixed font-mono text-xs">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="w-[9%] px-3 py-2 font-medium">Código</th>
            <th className="w-[39%] px-3 py-2 font-medium">Categoría</th>
            <th className="w-[24%] px-3 py-2 font-medium">Grupo</th>
            <th className="w-[9%] px-3 py-2 text-center font-medium">Orden</th>
            <th className="w-[11%] px-3 py-2 font-medium">Estado</th>
            <th className="w-[8%] px-5 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {/* Fila de captura rápida (siempre visible arriba) */}
          <tr className="border-b border-dashed border-line/60 bg-muted/20">
            <td className="px-3 py-2 text-muted-foreground/60">auto</td>
            <td className="px-3 py-2">
              <input
                className={inputCls}
                placeholder="Escribe la categoría y pulsa Enter…"
                maxLength={120}
                value={nueva.nombre}
                onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2">
              <select
                className={selCls}
                value={nueva.grupo}
                onChange={(e) => setNueva({ ...nueva, grupo: e.target.value })}
              >
                <option value="">Selecciona…</option>
                {opcionesGrupo.map((g) => (
                  <option key={g.id} value={g.nombre}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2 text-center text-muted-foreground/60">auto</td>
            <td className="px-3 py-2 text-muted-foreground/60">Activa</td>
            <td className="px-5 py-2">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => void crear()}
                  disabled={guardando}
                  title="Registrar categoría"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              </div>
            </td>
          </tr>
          {visibles.map((c) =>
            editando?.id === c.id ? (
              <tr key={c.id} className="border-b border-line/40 last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{c.codigo}</td>
                <td className="px-3 py-2">
                  <Input
                    className="py-1 text-xs"
                    value={editando.nombre}
                    onChange={(ev) => setEditando({ ...editando, nombre: ev.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Select
                    className="py-1 text-xs"
                    value={editando.grupo ?? ""}
                    onChange={(ev) => setEditando({ ...editando, grupo: ev.target.value })}
                  >
                    <option value="">Sin grupo</option>
                    {opcionesGrupo.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-2 text-center text-muted-foreground">{c.orden}</td>
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
              <tr
                key={c.id}
                tabIndex={0}
                aria-selected={seleccionadaId === c.id}
                onClick={() => setSeleccionadaId(c.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setSeleccionadaId(c.id);
                  }
                }}
                className={`cursor-pointer border-b border-line/40 outline-none transition-colors last:border-0 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                  seleccionadaId === c.id ? "bg-primary/10" : ""
                }`}
              >
                <td className="px-3 py-2.5 text-primary">{c.codigo}</td>
                <td className="px-3 py-2.5 font-semibold text-ink">{c.nombre}</td>
                <td className="px-3 py-2.5 uppercase text-muted-foreground">{c.grupo || "—"}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{c.orden}</td>
                <td className="px-3 py-2.5">
                  <span className={c.activo ? "text-good" : "text-muted-foreground"}>
                    {c.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditando(c)}
                      title="Editar"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(c.id)}
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
        Escribe en la primera fila y pulsa Enter para registrar. Selecciona una fila y usa las flechas de la cabecera para ordenarla dentro de su grupo. Sus códigos dependientes se actualizan automáticamente.
      </p>
    </Panel>
  );
}

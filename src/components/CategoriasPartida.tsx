import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import {
  useCategoriasPartida,
  type CategoriaPartida,
} from "@/lib/categorias";
import { FlechasOrden } from "@/components/FlechasOrden";
import { moverWbs, recodificarWbs, ORDEN_FINAL } from "@/lib/wbs";

const vacio = { codigo: "", nombre: "", especialidad: "", orden: "" };

export function CategoriasPartida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useCategoriasPartida();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState<CategoriaPartida | null>(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState("");
  const [moviendo, setMoviendo] = useState(false);

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

  const opcionesEspecialidad = especialidades.filter((e) => e.activo);

  const visibles = useMemo(
    () => (filtro ? lista.filter((c) => c.especialidad === filtro) : lista),
    [lista, filtro],
  );

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nombre = form.nombre.trim();
    if (!nombre) return setError("Escribe el nombre de la categoría.");
    if (!form.especialidad) return setError("Elige la especialidad a la que pertenece.");
    const orden = Math.max(0, ...lista.filter((c) => c.especialidad === form.especialidad).map((c) => c.orden)) + 1;
    const { error: err } = await supabase
      .from("categorias_partida")
      .insert({ codigo: "", nombre, especialidad: form.especialidad, orden });
    if (err)
      return setError(
        err.code === "23505" ? "Ya existe esa categoría en la especialidad elegida." : err.message,
      );
    setForm({ ...vacio, especialidad: form.especialidad });
    await recodificarWbs().catch(() => undefined);
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const anterior = lista.find((c) => c.id === editando.id);
    const anteriorEsp = (c: CategoriaPartida) => anterior !== undefined && anterior.especialidad !== c.especialidad;
    const nombre = editando.nombre.trim();
    const { error: err } = await supabase
      .from("categorias_partida")
      .update({
        nombre,
        especialidad: editando.especialidad,
        ...(anteriorEsp(editando) ? { orden: ORDEN_FINAL } : {}),
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    await recodificarWbs().catch(() => undefined);
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

  return (
    <>
      <Panel titulo="Nuevo registro de categorías" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-4">
          <Campo etiqueta="Especialidad">
            <Select
              className="py-1.5"
              value={form.especialidad}
              onChange={(e) => {
                const especialidad = e.target.value;
                setForm({ ...form, especialidad });
              }}
            >
              <option value="">Selecciona...</option>
              {opcionesEspecialidad.map((e) => (
                <option key={e.id} value={e.nombre}>
                  {e.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Nombre de la categoría">
              <Input
                className="py-1.5"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                maxLength={120}
                placeholder="SUMINISTRO DE TABLEROS ELÉCTRICOS"
              />
            </Campo>
          </div>
          <div className="sm:col-span-4">
            <Boton type="submit">Agregar categoría</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Listado de categorías "
        extra={
          <div className="w-64">
            <Select className="py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todas las especialidades</option>
              {opcionesEspecialidad.map((e) => (
                <option key={e.id} value={e.nombre}>
                  {e.nombre}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {visibles.length === 0 ? (
          <Vacio texto="Aún no hay categorías registradas." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[9%] px-3 py-2 font-medium">Código</th>
                <th className="w-[39%] px-3 py-2 font-medium">Categoría</th>
                <th className="w-[24%] px-3 py-2 font-medium">Especialidad</th>
                <th className="w-[9%] px-3 py-2 text-center font-medium">Orden</th>
                <th className="w-[11%] px-3 py-2 font-medium">Estado</th>
                <th className="w-[8%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
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
                        value={editando.especialidad}
                        onChange={(ev) => setEditando({ ...editando, especialidad: ev.target.value })}
                      >
                        <option value="">Sin especialidad</option>
                        {opcionesEspecialidad.map((e) => (
                          <option key={e.id} value={e.nombre}>
                            {e.nombre}
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
                    <tr key={c.id} className="border-b border-line/40 last:border-0">
                    <td className="px-3 py-2.5 text-primary">{c.codigo}</td>
                    <td className="px-3 py-2.5 font-semibold text-ink">{c.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.especialidad || "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <FlechasOrden
                        primero={!visibles.some((x) => x.especialidad === c.especialidad && x.orden < c.orden)}
                        ultimo={!visibles.some((x) => x.especialidad === c.especialidad && x.orden > c.orden)}
                        ocupado={moviendo}
                        onMover={(d) => mover(c.id, d)}
                      />
                    </td>
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
        )}
        <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Las categorías agrupan las partidas dentro de cada especialidad. No llevan código fijo: el código
          (01.01, 01.02...) se asigna al cargarlas en cada obra o cotización.
        </p>
      </Panel>
    </>
  );
}

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import { siguienteCodigoEnCapitulo, useEspecialidadesPartida } from "@/lib/especialidades";
import { useUnidadesMedida } from "@/lib/unidades";
import { usePartidasMaestras, type PartidaMaestra } from "@/lib/cotizaciones";
import { categoriasDe, siguienteCodigoEnCategoria, useCategoriasPartida } from "@/lib/categorias";

const vacio = {
  codigo: "",
  nombre: "",
  especialidad: "",
  categoria: "",
  unidad: "glb",
  precio_unitario: "",
};

export function PartidasMaestras() {
  const qc = useQueryClient();
  const { data: lista = [] } = usePartidasMaestras();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: categorias = [] } = useCategoriasPartida();
  const [form, setForm] = useState(vacio);
  const [codigoManual, setCodigoManual] = useState(false);
  const [editando, setEditando] = useState<PartidaMaestra | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");

  const refrescar = () => qc.invalidateQueries({ queryKey: ["partidas_maestras"] });

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter((p) =>
      `${p.codigo} ${p.nombre} ${p.especialidad} ${p.categoria ?? ""}`.toLowerCase().includes(t),
    );
  }, [lista, busqueda]);

  /** Código sugerido: dentro de la categoría (05.01.01) o del capítulo (05.01). */
  const sugerir = (especialidad: string, categoria: string, extra: string[] = []) => {
    const usados = [...lista.map((p) => p.codigo), ...extra];
    return categoria
      ? siguienteCodigoEnCategoria(categoria, usados, categorias)
      : siguienteCodigoEnCapitulo(especialidad, usados, especialidades);
  };

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim()) return setError("Escribe la descripción de la partida.");
    const codigoFinal = form.codigo.trim() || sugerir(form.especialidad, form.categoria);
    const { error: err } = await supabase.from("partidas_maestras").insert({
      codigo: codigoFinal,
      nombre: form.nombre.trim(),
      especialidad: form.especialidad,
      categoria: form.categoria,
      unidad: form.unidad,
      precio_unitario: Number(form.precio_unitario || 0),
    });
    if (err) return setError(err.message);
    setForm({
      ...vacio,
      especialidad: form.especialidad,
      categoria: form.categoria,
      unidad: form.unidad,
      codigo: sugerir(form.especialidad, form.categoria, [codigoFinal]),
    });
    setCodigoManual(false);
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const { error: err } = await supabase
      .from("partidas_maestras")
      .update({
        codigo: editando.codigo.trim(),
        nombre: editando.nombre.trim(),
        especialidad: editando.especialidad,
        categoria: editando.categoria ?? "",
        unidad: editando.unidad,
        precio_unitario: Number(editando.precio_unitario || 0),
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta partida del banco maestro?")) return;
    const { error: err } = await supabase.from("partidas_maestras").delete().eq("id", id);
    if (err) return setError(err.message);
    refrescar();
  }

  const opcionesEspecialidad = especialidades.filter((e) => e.activo);
  const opcionesUnidad = unidades.filter((u) => u.activo);

  return (
    <>
      <Panel titulo="Nueva partida maestra" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-7">
          <Campo etiqueta="Código">
            <Input
              className="py-1.5 font-mono"
              value={form.codigo}
              onChange={(e) => {
                setCodigoManual(true);
                setForm({ ...form, codigo: e.target.value });
              }}
              maxLength={20}
              placeholder="05.01"
            />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Descripción de la partida">
              <Input
                className="py-1.5"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                maxLength={160}
                placeholder="Suministro y montaje de tablero de distribución"
              />
            </Campo>
          </div>
          <Campo etiqueta="Especialidad">
            <Select
              className="py-1.5"
              value={form.especialidad}
              onChange={(e) => {
                const especialidad = e.target.value;
                const sugerido = sugerir(especialidad, "");
                setForm({
                  ...form,
                  especialidad,
                  categoria: "",
                  codigo: codigoManual && form.codigo ? form.codigo : sugerido,
                });
              }}
            >
              <option value="">Selecciona...</option>
              {opcionesEspecialidad.map((e) => (
                <option key={e.id} value={e.nombre}>
                  {e.codigo} {e.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Categoría">
            <Select
              className="py-1.5"
              value={form.categoria}
              onChange={(e) => {
                const categoria = e.target.value;
                setForm({
                  ...form,
                  categoria,
                  codigo:
                    codigoManual && form.codigo
                      ? form.codigo
                      : sugerir(form.especialidad, categoria),
                });
              }}
            >
              <option value="">Sin categoría</option>
              {categoriasDe(form.especialidad, categorias).map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.codigo} {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Unidad">
            <Select className="py-1.5" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
              {opcionesUnidad.map((u) => (
                <option key={u.id} value={u.simbolo}>
                  {u.simbolo}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Precio unitario (S/)">
            <Input
              className="py-1.5 text-right"
              type="number"
              step="0.01"
              min="0"
              value={form.precio_unitario}
              onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
              placeholder="0.00"
            />
          </Campo>
          <div className="sm:col-span-7">
            <Boton type="submit">Agregar al banco</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-7">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Banco de partidas maestras"
        extra={
          <Input
            className="w-64 py-1.5 text-xs"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, partida, categoría o especialidad"
          />
        }
      >
        {filtradas.length === 0 ? (
          <Vacio texto="Aún no hay partidas en el banco maestro." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[9%] px-5 py-2 font-medium">Código</th>
                <th className="w-[26%] px-3 py-2 font-medium">Partida</th>
                <th className="w-[16%] px-3 py-2 font-medium">Especialidad</th>
                <th className="w-[17%] px-3 py-2 font-medium">Categoría</th>
                <th className="w-[7%] px-3 py-2 font-medium">Und.</th>
                <th className="w-[11%] px-3 py-2 text-right font-medium">P.U. (S/)</th>
                <th className="w-[8%] px-3 py-2 font-medium">Estado</th>
                <th className="w-[6%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) =>
                editando?.id === p.id ? (
                  <tr key={p.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-2">
                      <Input
                        className="py-1 font-mono text-xs"
                        value={editando.codigo}
                        onChange={(ev) => setEditando({ ...editando, codigo: ev.target.value })}
                        maxLength={20}
                      />
                    </td>
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
                        onChange={(ev) =>
                          setEditando({ ...editando, especialidad: ev.target.value, categoria: "" })
                        }
                      >
                        <option value="">Sin especialidad</option>
                        {opcionesEspecialidad.map((e) => (
                          <option key={e.id} value={e.nombre}>
                            {e.codigo} {e.nombre}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        className="py-1 text-xs"
                        value={editando.categoria ?? ""}
                        onChange={(ev) => setEditando({ ...editando, categoria: ev.target.value })}
                      >
                        <option value="">Sin categoría</option>
                        {categoriasDe(editando.especialidad, categorias).map((c) => (
                          <option key={c.id} value={c.nombre}>
                            {c.codigo} {c.nombre}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        className="py-1 text-xs"
                        value={editando.unidad}
                        onChange={(ev) => setEditando({ ...editando, unidad: ev.target.value })}
                      >
                        {opcionesUnidad.map((u) => (
                          <option key={u.id} value={u.simbolo}>
                            {u.simbolo}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="py-1 text-right text-xs"
                        type="number"
                        step="0.01"
                        value={editando.precio_unitario}
                        onChange={(ev) =>
                          setEditando({ ...editando, precio_unitario: Number(ev.target.value) })
                        }
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
                  <tr key={p.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-2.5 font-semibold text-primary">{p.codigo || "—"}</td>
                    <td className="px-3 py-2.5 text-ink">{p.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.especialidad || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.categoria || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.unidad}</td>
                    <td className="px-3 py-2.5 text-right">{soles(Number(p.precio_unitario))}</td>
                    <td className="px-3 py-2.5">
                      <span className={p.activo ? "text-good" : "text-muted-foreground"}>
                        {p.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditando(p)}
                          title="Editar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(p.id)}
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
          Estas partidas se reutilizan al armar una cotización: al elegir una del banco se copian su código,
          unidad y precio unitario, y puedes ajustarlos en la propuesta sin alterar el catálogo.
        </p>
      </Panel>
    </>
  );
}

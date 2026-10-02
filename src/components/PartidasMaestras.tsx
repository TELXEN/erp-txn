import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator, Check, Pencil, Trash2, X } from "lucide-react";
import { ApuPartida } from "@/components/ApuPartida";
import { supabase } from "@/integrations/supabase/client";
import { Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { soles } from "@/lib/format";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useUnidadesMedida } from "@/lib/unidades";
import { usePartidasMaestras, type PartidaMaestra } from "@/lib/cotizaciones";
import { categoriasDe, useCategoriasPartida } from "@/lib/categorias";
import { FlechasOrden } from "@/components/FlechasOrden";
import { codigoPartidaLegible, moverWbs, recodificarWbs, ORDEN_FINAL } from "@/lib/wbs";

const TIPOS_PARTIDA: [string, string][] = [
  ["MO", "Mano de obra"],
  ["MAT", "Materiales"],
  ["EQ", "Equipos y maquinaria"],
  ["HT", "Herramientas menores"],
  ["SC", "Subcontratos"],
];
const nombreTipo = (t?: string) => TIPOS_PARTIDA.find(([k]) => k === t)?.[1] ?? "Materiales";

const vacio = {
  nombre: "",
  especialidad: "",
  categoria: "",
  marca: "",
  unidad: "glb",
  precio_unitario: "",
  tipo_partida: "MAT",
};

type FilaNueva = typeof vacio;

export function PartidasMaestras() {
  const qc = useQueryClient();
  const { data: lista = [] } = usePartidasMaestras();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: categorias = [] } = useCategoriasPartida();
  const [nueva, setNueva] = useState<FilaNueva>(vacio);
  const [editando, setEditando] = useState<PartidaMaestra | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [apu, setApu] = useState<PartidaMaestra | null>(null);
  const [moviendo, setMoviendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const refrescar = () => qc.invalidateQueries({ queryKey: ["partidas_maestras"] });

  const filtradas = useMemo(() => {
    return lista
      .filter((p) =>
        coincide(busqueda, p.codigo ?? "", codigoPartidaLegible(p.codigo), p.nombre, p.especialidad, p.categoria, p.marca ?? ""),
      )
      .sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? ""));
  }, [lista, busqueda]);

  const grupo = (p: PartidaMaestra) => `${p.especialidad}|${p.categoria ?? ""}`;
  const enGrupo = (p: PartidaMaestra) => lista.filter((x) => grupo(x) === grupo(p)).map((x) => x.codigo ?? "").sort();

  async function mover(id: string, dir: -1 | 1) {
    setMoviendo(true);
    try { await moverWbs("partidas", id, dir); refrescar(); }
    catch (e) { setError((e as Error).message); }
    setMoviendo(false);
  }

  async function crearDesdeFila() {
    if (guardando) return;
    if (!nueva.nombre.trim()) return setError("Escribe la descripción de la partida.");
    setError("");
    setGuardando(true);
    const { error: err } = await supabase.from("partidas_maestras").insert({
      codigo: "",
      nombre: nueva.nombre.trim(),
      especialidad: nueva.especialidad,
      categoria: nueva.categoria,
      marca: nueva.marca.trim(),
      unidad: nueva.unidad,
      precio_unitario: Number(nueva.precio_unitario || 0),
      tipo_partida: nueva.tipo_partida,
      orden: ORDEN_FINAL,
    });
    setGuardando(false);
    if (err) return setError(err.message);
    await recodificarWbs().catch(() => undefined);
    setNueva({ ...vacio, especialidad: nueva.especialidad, categoria: nueva.categoria, unidad: nueva.unidad, tipo_partida: nueva.tipo_partida });
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const anterior = lista.find((x) => x.id === editando.id);
    const cambioGrupo = anterior ? grupo(anterior) !== `${editando.especialidad}|${editando.categoria ?? ""}` : false;
    const { error: err } = await supabase
      .from("partidas_maestras")
      .update({
        nombre: editando.nombre.trim(),
        especialidad: editando.especialidad,
        categoria: editando.categoria ?? "",
        marca: editando.marca ?? "",
        unidad: editando.unidad,
        precio_unitario: Number(editando.precio_unitario || 0),
        tipo_partida: editando.tipo_partida ?? "MAT",
        activo: editando.activo,
        ...(cambioGrupo ? { orden: ORDEN_FINAL } : {}),
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    await recodificarWbs().catch(() => undefined);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta partida del banco maestro?")) return;
    const { error: err } = await supabase.from("partidas_maestras").delete().eq("id", id);
    if (err) return setError(err.message);
    await recodificarWbs().catch(() => undefined);
    refrescar();
  }

  const opcionesEspecialidad = especialidades.filter((e) => e.activo);
  const opcionesUnidad = unidades.filter((u) => u.activo);

  const teclaNueva = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void crearDesdeFila();
    }
    if (e.key === "Escape") setNueva({ ...vacio, especialidad: nueva.especialidad });
  };

  return (
    <>
      <Panel
        titulo="Banco de partidas maestras"
        extra={<Buscador valor={busqueda} onChange={setBusqueda} total={filtradas.length} placeholder="Buscar por partida, categoría o especialidad..." />}
      >
        {filtradas.length === 0 && !busqueda ? (
          <Vacio texto="Aún no hay partidas en el banco maestro. Captura la primera en la fila de abajo." />
        ) : filtradas.length === 0 ? (
          <Vacio texto={`Sin coincidencias para «${busqueda}»`} />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[13%] px-3 py-2 font-medium">Código</th>
                <th className="w-[19%] px-3 py-2 font-medium">Partida</th>
                <th className="w-[12%] px-3 py-2 font-medium">Tipo</th>
                <th className="w-[12%] px-3 py-2 font-medium">Especialidad</th>
                <th className="w-[11%] px-3 py-2 font-medium">Categoría</th>
                <th className="w-[7%] px-3 py-2 font-medium">Marca</th>
                <th className="w-[5%] px-3 py-2 font-medium">Und.</th>
                <th className="w-[8%] px-3 py-2 text-right font-medium">P.U. (S/)</th>
                <th className="w-[6%] px-3 py-2 font-medium">Estado</th>
                <th className="w-[7%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) =>
                editando?.id === p.id ? (
                  <tr key={p.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-2 text-muted-foreground">{codigoPartidaLegible(p.codigo)}</td>
                    <td className="px-3 py-2">
                      <Input
                        className="py-1 text-xs"
                        value={editando.nombre}
                        onChange={(ev) => setEditando({ ...editando, nombre: ev.target.value })}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") { ev.preventDefault(); void guardar(); }
                          if (ev.key === "Escape") setEditando(null);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        className="py-1 text-xs"
                        value={editando.tipo_partida ?? "MAT"}
                        onChange={(ev) => setEditando({ ...editando, tipo_partida: ev.target.value })}
                      >
                        {TIPOS_PARTIDA.map(([k, nombre]) => (
                          <option key={k} value={k}>
                            {nombre}
                          </option>
                        ))}
                      </Select>
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
                            {e.nombre}
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
                            {c.nombre}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="py-1 text-xs"
                        value={editando.marca ?? ""}
                        placeholder="-"
                        onChange={(ev) => setEditando({ ...editando, marca: ev.target.value })}
                      />
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
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <FlechasOrden
                          primero={enGrupo(p)[0] === (p.codigo ?? "")}
                          ultimo={enGrupo(p).at(-1) === (p.codigo ?? "")}
                          ocupado={moviendo}
                          onMover={(d) => mover(p.id, d)}
                        />
                        <span className="text-primary"><Resaltar texto={codigoPartidaLegible(p.codigo)} termino={busqueda} /></span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-ink"><Resaltar texto={p.nombre} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{nombreTipo(p.tipo_partida)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={p.especialidad || "—"} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={p.categoria || "—"} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={p.marca || "-"} termino={busqueda} /></td>
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
                          onClick={() => setApu(p)}
                          title="Análisis de precios unitarios"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Calculator size={14} />
                        </button>
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
              {/* Fila de captura inmediata (WYSIWYG) */}
              <tr className="border-t border-dashed border-line">
                <td className="px-5 py-2 text-center text-muted-foreground" title="El código se genera automáticamente al guardar">—</td>
                <td className="px-3 py-2">
                    <Input
                      className="py-1 text-xs"
                      value={nueva.nombre}
                      onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                      onKeyDown={teclaNueva}
                      maxLength={160}
                      placeholder="Descripción de la partida…"
                    />
                </td>
                <td className="px-3 py-2">
                    <Select
                      className="py-1 text-xs"
                      value={nueva.tipo_partida}
                      onChange={(e) => setNueva({ ...nueva, tipo_partida: e.target.value })}
                    >
                      {TIPOS_PARTIDA.map(([k, nombre]) => (
                        <option key={k} value={k}>
                          {nombre}
                        </option>
                      ))}
                    </Select>
                </td>
                <td className="px-3 py-2">
                    <Select
                      className="py-1 text-xs"
                      value={nueva.especialidad}
                      onChange={(e) => setNueva({ ...nueva, especialidad: e.target.value, categoria: "" })}
                    >
                      <option value="">Selecciona…</option>
                      {opcionesEspecialidad.map((e) => (
                        <option key={e.id} value={e.nombre}>
                          {e.nombre}
                        </option>
                      ))}
                    </Select>
                </td>
                <td className="px-3 py-2">
                    <Select
                      className="py-1 text-xs"
                      value={nueva.categoria}
                      onChange={(e) => setNueva({ ...nueva, categoria: e.target.value })}
                    >
                      <option value="">Sin categoría</option>
                      {categoriasDe(nueva.especialidad, categorias).map((c) => (
                        <option key={c.id} value={c.nombre}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                </td>
                <td className="px-3 py-2">
                    <Input
                      className="py-1 text-xs"
                      value={nueva.marca}
                      onChange={(e) => setNueva({ ...nueva, marca: e.target.value })}
                      onKeyDown={teclaNueva}
                      maxLength={60}
                      placeholder="-"
                    />
                </td>
                <td className="px-3 py-2">
                    <Select
                      className="py-1 text-xs"
                      value={nueva.unidad}
                      onChange={(e) => setNueva({ ...nueva, unidad: e.target.value })}
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
                      min="0"
                      value={nueva.precio_unitario}
                      onChange={(e) => setNueva({ ...nueva, precio_unitario: e.target.value })}
                      onKeyDown={teclaNueva}
                      placeholder="0.00"
                    />
                </td>
                <td className="px-3 py-2 text-muted-foreground" title="Activa al guardar">—</td>
                <td className="px-5 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => void crearDesdeFila()}
                    disabled={guardando}
                    title="Guardar (Enter)"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        )}
        {error && <p className="border-t border-line px-5 py-2 font-mono text-xs text-bad">{error}</p>}
        <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Captura directa en la tabla: escribe la partida y pulsa Enter para guardar (el código se genera solo según el tipo,
          la especialidad y la categoría). Clic en una fila para editarla. Estas partidas se reutilizan al armar una cotización:
          se copian su descripción, unidad y precio unitario, y puedes ajustarlos en la propuesta sin alterar el catálogo.
        </p>
      </Panel>
      {apu && <ApuPartida partida={apu} onCerrar={() => setApu(null)} />}
    </>
  );
}

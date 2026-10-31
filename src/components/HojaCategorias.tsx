import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Area, Boton, BotonIcono, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useCategoriasInsumo, useSubfamilias, type CategoriaInsumo } from "@/lib/codigo-insumo";
import { claveNombre } from "@/lib/formato-texto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };
type Form = { especialidad_id: string; codigo: string; nombre: string; descripcion: string };

/** Categorías de insumo por especialidad: nivel intermedio de la cascada Especialidad → Categoría → Subcategoría. */
export function HojaCategorias() {
  const qc = useQueryClient();
  const { data: esp = [] } = useEspecialidadesPartida();
  const { data: cats = [] } = useCategoriasInsumo();
  const { data: subs = [] } = useSubfamilias();
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<CategoriaInsumo | null>(null);
  const [modo, setModo] = useState<"nuevo" | "editar" | null>(null);
  const [form, setForm] = useState<Form>({ especialidad_id: "", codigo: "", nombre: "", descripcion: "" });
  const [aviso, setAviso] = useState("");
  const refrescar = () => { qc.invalidateQueries({ queryKey: ["categorias_insumo"] }); qc.invalidateQueries({ queryKey: ["subfamilias_insumo"] }); };

  const especialidades = esp.filter((e) => e.codigo_modular).sort((a, b) => String(a.codigo_modular).localeCompare(String(b.codigo_modular)));
  const visibles = cats.filter((c) => coincide(busqueda, c.codigo, c.nombre));
  const nSubs = (id: string) => subs.filter((s) => s.categoria_id === id).length;

  function abrir(m: "nuevo" | "editar", objetivo: CategoriaInsumo | null = sel) {
    setAviso("");
    if (m === "nuevo") {
      const espId = sel?.especialidad_id ?? especialidades[0]?.id ?? "";
      const max = Math.max(0, ...cats.filter((c) => c.especialidad_id === espId).map((c) => Number(c.codigo) || 0));
      setForm({ especialidad_id: espId, codigo: String(max + 1).padStart(2, "0"), nombre: "", descripcion: "" });
    } else if (objetivo) setForm({ especialidad_id: objetivo.especialidad_id, codigo: objetivo.codigo, nombre: objetivo.nombre, descripcion: objetivo.descripcion ?? "" });
    else return;
    setModo(m);
  }

  async function guardar() {
    const codigo = form.codigo.trim(), nombre = form.nombre.trim();
    if (!form.especialidad_id) return setAviso("Elige la especialidad.");
    if (!/^\d{2}$/.test(codigo)) return setAviso("El código debe tener 2 dígitos (01–99).");
    if (!nombre) return setAviso("Escribe el nombre.");
    const mismas = cats.filter((c) => c.especialidad_id === form.especialidad_id && !(modo === "editar" && c.id === sel?.id));
    if (mismas.some((c) => c.codigo === codigo)) return setAviso(`El código ${codigo} ya existe en esta especialidad.`);
    if (mismas.some((c) => claveNombre(c.nombre) === claveNombre(nombre))) return setAviso(`La categoría «${nombre}» ya existe.`);
    const d = { especialidad_id: form.especialidad_id, codigo, nombre, descripcion: form.descripcion.trim() || null, orden: Number(codigo) };
    const { error } = modo === "editar" && sel ? await db.from("categorias_insumo").update(d).eq("id", sel.id) : await db.from("categorias_insumo").insert(d);
    if (error) return setAviso(error.message);
    if (modo === "editar" && sel) await db.from("subfamilias_insumo").update({ categoria_id: sel.id }).eq("categoria_id", sel.id); // refresca el nombre legado
    refrescar(); setModo(null);
  }

  async function quitar() {
    if (!sel) return;
    if (nSubs(sel.id) > 0) {
      if (!window.confirm(`«${sel.nombre}» tiene subcategorías. ¿Archivarla? Dejará de aparecer para nuevos insumos.`)) return;
      const { error } = await db.from("categorias_insumo").update({ activo: false }).eq("id", sel.id);
      if (error) return window.alert(error.message);
    } else {
      if (!window.confirm(`¿Eliminar «${sel.nombre}»?`)) return;
      const { error } = await db.from("categorias_insumo").delete().eq("id", sel.id);
      if (error) return window.alert(error.message);
    }
    setSel(null); refrescar();
  }

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1 rounded-md border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="text-xs font-semibold">Categorías de insumos</span>
          <Buscador valor={busqueda} onChange={setBusqueda} total={cats.length} />
        </div>
        {especialidades.map((e) => {
          const propias = visibles.filter((c) => c.especialidad_id === e.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
          if (propias.length === 0 && busqueda) return null;
          return (
            <div key={e.id}>
              <div className="border-b border-line bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                <span className="font-mono">{e.codigo_modular}</span> · {e.nombre} <span className="font-normal text-muted-foreground">({propias.length})</span>
              </div>
              {propias.length === 0 ? <p className="px-3 py-1.5 text-xs text-muted-foreground">Sin categorías</p> : (
                <table className="w-full text-xs"><tbody>
                  {propias.map((c) => (
                    <tr key={c.id} onClick={() => setSel(c)} onDoubleClick={() => { setSel(c); abrir("editar", c); }}
                      className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel?.id === c.id ? "bg-primary/10" : ""} ${c.activo ? "" : "text-muted-foreground line-through"}`}>
                      <td className="w-16 whitespace-nowrap px-2 py-0.5 font-mono">{c.codigo}</td>
                      <td className="px-2 py-0.5"><Resaltar texto={c.nombre} termino={busqueda} />{c.descripcion && <span className="ml-2 text-muted-foreground">{c.descripcion}</span>}</td>
                      <td className="w-28 px-2 py-0.5 text-right text-muted-foreground">{nSubs(c.id)} subcat.</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
        <BotonIcono etiqueta="Agregar categoría" title="Agregar categoría" tono="primario" onClick={() => abrir("nuevo")}><Plus size={15} /></BotonIcono>
        <BotonIcono etiqueta="Editar categoría" title="Editar categoría" disabled={!sel} onClick={() => abrir("editar")}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Eliminar categoría" title="Eliminar categoría" tono="peligro" disabled={!sel} onClick={quitar}><Trash2 size={15} /></BotonIcono>
      </div>

      <VentanaFlotante abierta={!!modo} onCerrar={() => setModo(null)} ancho="max-w-2xl" titulo={modo === "editar" ? "Editar categoría" : "Nueva categoría"}>
        <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <Campo etiqueta="Especialidad">
            <Select value={form.especialidad_id} disabled={modo === "editar"} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value })}>
              {especialidades.map((e) => <option key={e.id} value={e.id}>{e.codigo_modular} · {e.nombre}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Código (2 dígitos)">
            <Input maxLength={2} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/\D/g, "") })} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Nombre"><Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo etiqueta="Comentario"><Area rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Campo>
          </div>
          {aviso && <p className="text-xs text-destructive sm:col-span-2">{aviso}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Boton type="button" variante="linea" onClick={() => setModo(null)}>Cerrar</Boton>
            <Boton type="submit">Guardar</Boton>
          </div>
        </form>
      </VentanaFlotante>
    </div>
  );
}

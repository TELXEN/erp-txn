import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Area, Boton, BotonIcono, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useCategoriasInsumo, useSubfamilias, type Subfamilia } from "@/lib/codigo-insumo";
import { claveNombre } from "@/lib/formato-texto";

type Form = { especialidad_id: string; categoria_id: string; codigo: string; nombre: string; descripcion: string };

/** Hoja limpia de subcategorías agrupadas por especialidad y bloque, con barra de iconos a la derecha (igual que Insumos). */
export function HojaSubfamilias() {
  const qc = useQueryClient();
  const { data: esp = [] } = useEspecialidadesPartida();
  const { data: subs = [] } = useSubfamilias();
  const { data: cats = [] } = useCategoriasInsumo();
  const nombreCat = (id: string | null) => cats.find((c) => c.id === id)?.nombre ?? "";
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<Subfamilia | null>(null);
  const [modo, setModo] = useState<"nuevo" | "editar" | "copiar" | null>(null);
  const [form, setForm] = useState<Form>({ especialidad_id: "", categoria_id: "", codigo: "", nombre: "", descripcion: "" });
  const [aviso, setAviso] = useState("");
  const refrescar = () => qc.invalidateQueries({ queryKey: ["subfamilias_insumo"] });

  const especialidades = esp.filter((e) => e.codigo_modular).sort((a, b) => String(a.codigo_modular).localeCompare(String(b.codigo_modular)));
  const visibles = subs.filter((s) => coincide(busqueda, s.codigo, s.nombre, nombreCat(s.categoria_id)));

  function abrir(m: "nuevo" | "editar" | "copiar", objetivo = sel) {
    setAviso("");
    if (m === "nuevo") setForm({ especialidad_id: sel?.especialidad_id ?? especialidades[0]?.id ?? "", categoria_id: sel?.categoria_id ?? "", codigo: "", nombre: "", descripcion: "" });
    else if (objetivo) setForm({ especialidad_id: objetivo.especialidad_id, categoria_id: objetivo.categoria_id ?? "", codigo: m === "copiar" ? "" : objetivo.codigo, nombre: m === "copiar" ? `${objetivo.nombre} (copia)` : objetivo.nombre, descripcion: objetivo.descripcion ?? "" });
    else return;
    setModo(m);
  }

  async function guardar() {
    const codigo = form.codigo.trim(), nombre = form.nombre.trim();
    if (!form.especialidad_id) return setAviso("Elige la especialidad.");
    if (!/^\d{2}$/.test(codigo)) return setAviso("El código debe tener 2 dígitos (01–99).");
    if (!form.categoria_id) return setAviso("Elige la categoría.");
    if (!nombre) return setAviso("Escribe el nombre.");
    const mismas = subs.filter((s) => s.especialidad_id === form.especialidad_id && !(modo === "editar" && s.id === sel?.id));
    if (mismas.some((s) => s.codigo === codigo)) return setAviso(`El código ${codigo} ya existe en esta especialidad.`);
    if (mismas.some((s) => claveNombre(s.nombre) === claveNombre(nombre))) return setAviso(`La subcategoría «${nombre}» ya existe.`);
    const d = { especialidad_id: form.especialidad_id, categoria_id: form.categoria_id, codigo, nombre, descripcion: form.descripcion.trim() || null };
    const { error } = modo === "editar" && sel
      ? await supabase.from("subfamilias_insumo").update(d).eq("id", sel.id)
      : await supabase.from("subfamilias_insumo").insert(d);
    if (error) return setAviso(error.message);
    refrescar(); setModo(null);
  }

  async function quitar() {
    if (!sel || !window.confirm(`¿Eliminar «${sel.nombre}»? Los insumos que la usan quedarán sin clasificar.`)) return;
    const { error } = await supabase.from("subfamilias_insumo").delete().eq("id", sel.id);
    if (error) return window.alert(error.message);
    setSel(null); refrescar();
  }

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1 rounded-md border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="text-xs font-semibold">Subcategorías de insumos</span>
          <Buscador valor={busqueda} onChange={setBusqueda} total={subs.length} />
        </div>
        {especialidades.map((e) => {
          const propias = visibles.filter((s) => s.especialidad_id === e.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
          if (propias.length === 0 && busqueda) return null;
          const bloques = [...new Set(propias.map((s) => s.categoria_id))];
          return (
            <div key={e.id}>
              <div className="border-b border-line bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                <span className="font-mono">{e.codigo_modular}</span> · {e.nombre} <span className="font-normal text-muted-foreground">({propias.length})</span>
              </div>
              {propias.length === 0 ? <p className="px-3 py-1.5 text-xs text-muted-foreground">Sin subcategorías</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-line text-left label-mono">
                    <th className="w-16 px-2 py-0.5">Código</th><th className="px-2 py-0.5">Subcategoría</th>
                  </tr></thead>
                  <tbody>
                    {bloques.map((b) => [
                      <tr key={`b-${b ?? "x"}`} className="border-b border-line/60"><td colSpan={2} className="px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{b ? `${cats.find((c) => c.id === b)?.codigo ?? ""} · ${nombreCat(b)}` : "Sin categoría"}</td></tr>,
                      ...propias.filter((s) => s.categoria_id === b).map((s) => (
                        <tr key={s.id} onClick={() => setSel(s)} onDoubleClick={() => { setSel(s); abrir("editar", s); }}
                          className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel?.id === s.id ? "bg-primary/10" : ""}`}>
                          <td className="whitespace-nowrap px-2 py-0.5 font-mono">{s.codigo}</td>
                          <td className="w-full px-2 py-0.5"><Resaltar texto={s.nombre} termino={busqueda} />{s.descripcion && <span className="ml-2 text-muted-foreground">{s.descripcion}</span>}</td>
                        </tr>
                      )),
                    ])}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
        <BotonIcono etiqueta="Agregar nueva subcategoría" title="Agregar nueva subcategoría" tono="primario" onClick={() => abrir("nuevo")}><Plus size={15} /></BotonIcono>
        <BotonIcono etiqueta="Editar subcategoría" title="Editar subcategoría" disabled={!sel} onClick={() => abrir("editar")}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Copiar subcategoría" title="Copiar subcategoría" disabled={!sel} onClick={() => abrir("copiar")}><Copy size={15} /></BotonIcono>
        <BotonIcono etiqueta="Eliminar subcategoría" title="Eliminar subcategoría" tono="peligro" disabled={!sel} onClick={quitar}><Trash2 size={15} /></BotonIcono>
      </div>

      <VentanaFlotante abierta={!!modo} onCerrar={() => setModo(null)} ancho="max-w-2xl"
        titulo={modo === "editar" ? "Editar subcategoría" : modo === "copiar" ? "Copiar subcategoría" : "Nueva subcategoría"}>
        <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
          <Campo etiqueta="Especialidad">
            <Select value={form.especialidad_id} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value, categoria_id: "" })}>
              {especialidades.map((e) => <option key={e.id} value={e.id}>{e.codigo_modular} · {e.nombre}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Categoría">
            <Select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
              <option value="">— Elegir —</option>
              {cats.filter((c) => c.especialidad_id === form.especialidad_id && (c.activo || c.id === form.categoria_id)).map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Código (2 dígitos)">
            <Input maxLength={2} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/\D/g, "") })} />
          </Campo>
          <Campo etiqueta="Nombre">
            <Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Comentario">
              <Area
                value={form.descripcion}
                rows={3}
                placeholder="Ej. Tipo escalerilla pesada de aluminio/fierro galvanizado"
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
              <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                Guía que se ve en gris junto al nombre y al recorrer la lista de subcategorías. Sirve para complementar, cambiar o dejar vacío para quitarlo.
              </span>
            </Campo>
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

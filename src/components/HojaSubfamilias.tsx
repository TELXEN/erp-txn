import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Area, Boton, BotonIcono, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useSubfamilias, type Subfamilia } from "@/lib/codigo-insumo";
import { claveNombre } from "@/lib/formato-texto";

type Form = { especialidad_id: string; bloque: string; codigo: string; nombre: string; descripcion: string };

/** Hoja limpia de subfamilias agrupadas por especialidad y bloque, con barra de iconos a la derecha (igual que Insumos). */
export function HojaSubfamilias() {
  const qc = useQueryClient();
  const { data: esp = [] } = useEspecialidadesPartida();
  const { data: subs = [] } = useSubfamilias();
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<Subfamilia | null>(null);
  const [modo, setModo] = useState<"nuevo" | "editar" | "copiar" | null>(null);
  const [form, setForm] = useState<Form>({ especialidad_id: "", bloque: "", codigo: "", nombre: "", descripcion: "" });
  const [aviso, setAviso] = useState("");
  const refrescar = () => qc.invalidateQueries({ queryKey: ["subfamilias_insumo"] });

  const especialidades = esp.filter((e) => e.codigo_modular).sort((a, b) => String(a.codigo_modular).localeCompare(String(b.codigo_modular)));
  const visibles = subs.filter((s) => coincide(busqueda, s.codigo, s.nombre, s.bloque));

  function abrir(m: "nuevo" | "editar" | "copiar", objetivo = sel) {
    setAviso("");
    if (m === "nuevo") setForm({ especialidad_id: sel?.especialidad_id ?? especialidades[0]?.id ?? "", bloque: sel?.bloque ?? "", codigo: "", nombre: "", descripcion: "" });
    else if (objetivo) setForm({ especialidad_id: objetivo.especialidad_id, bloque: objetivo.bloque, codigo: m === "copiar" ? "" : objetivo.codigo, nombre: m === "copiar" ? `${objetivo.nombre} (copia)` : objetivo.nombre, descripcion: objetivo.descripcion ?? "" });
    else return;
    setModo(m);
  }

  async function guardar() {
    const codigo = form.codigo.trim(), nombre = form.nombre.trim();
    if (!form.especialidad_id) return setAviso("Elige la especialidad.");
    if (!/^\d{2}$/.test(codigo)) return setAviso("El código debe tener 2 dígitos (01–99).");
    if (!nombre) return setAviso("Escribe el nombre.");
    const mismas = subs.filter((s) => s.especialidad_id === form.especialidad_id && !(modo === "editar" && s.id === sel?.id));
    if (mismas.some((s) => s.codigo === codigo)) return setAviso(`El código ${codigo} ya existe en esta especialidad.`);
    if (mismas.some((s) => claveNombre(s.nombre) === claveNombre(nombre))) return setAviso(`La subfamilia «${nombre}» ya existe.`);
    const d = { especialidad_id: form.especialidad_id, bloque: form.bloque.trim(), codigo, nombre, descripcion: form.descripcion.trim() || null };
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
          <span className="text-xs font-semibold">Subfamilia de materiales</span>
          <Buscador valor={busqueda} onChange={setBusqueda} total={subs.length} />
        </div>
        {especialidades.map((e) => {
          const propias = visibles.filter((s) => s.especialidad_id === e.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
          if (propias.length === 0 && busqueda) return null;
          const bloques = [...new Set(propias.map((s) => s.bloque))];
          return (
            <div key={e.id}>
              <div className="border-b border-line bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                <span className="font-mono">{e.codigo_modular}</span> · {e.nombre} <span className="font-normal text-muted-foreground">({propias.length})</span>
              </div>
              {propias.length === 0 ? <p className="px-3 py-1.5 text-xs text-muted-foreground">Sin subfamilias</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-line text-left label-mono">
                    <th className="w-16 px-2 py-0.5">Código</th><th className="px-2 py-0.5">Subfamilia</th>
                  </tr></thead>
                  <tbody>
                    {bloques.map((b) => [
                      b ? <tr key={`b-${b}`} className="border-b border-line/60"><td colSpan={2} className="px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{b}</td></tr> : null,
                      ...propias.filter((s) => s.bloque === b).map((s) => (
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
        <BotonIcono etiqueta="Agregar nueva subfamilia" title="Agregar nueva subfamilia" tono="primario" onClick={() => abrir("nuevo")}><Plus size={15} /></BotonIcono>
        <BotonIcono etiqueta="Editar subfamilia" title="Editar subfamilia" disabled={!sel} onClick={() => abrir("editar")}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Copiar subfamilia" title="Copiar subfamilia" disabled={!sel} onClick={() => abrir("copiar")}><Copy size={15} /></BotonIcono>
        <BotonIcono etiqueta="Eliminar subfamilia" title="Eliminar subfamilia" tono="peligro" disabled={!sel} onClick={quitar}><Trash2 size={15} /></BotonIcono>
      </div>

      <VentanaFlotante abierta={!!modo} onCerrar={() => setModo(null)} ancho="max-w-2xl"
        titulo={modo === "editar" ? "Editar subfamilia" : modo === "copiar" ? "Copiar subfamilia" : "Nueva subfamilia"}>
        <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
          <Campo etiqueta="Especialidad">
            <Select value={form.especialidad_id} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value })}>
              {especialidades.map((e) => <option key={e.id} value={e.id}>{e.codigo_modular} · {e.nombre}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Bloque">
            <Input value={form.bloque} placeholder="Ej. Media Tensión" onChange={(e) => setForm({ ...form, bloque: e.target.value })} />
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
                Guía que se ve en gris junto al nombre y al recorrer la lista de subfamilias. Sirve para complementar, cambiar o dejar vacío para quitarlo.
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

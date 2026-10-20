import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { useUnidadesMedida } from "@/lib/unidades";

type Modo = "nuevo" | "editar" | "copiar";
const vacio = { simbolo: "", descripcion: "", orden: "", activo: true };

/** Catálogo de unidades de medida: hoja limpia + barra de iconos + ventana flotante. */
export function UnidadesMedida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useUnidadesMedida();
  const [sel, setSel] = useState("");
  const [modo, setModo] = useState<Modo | null>(null);
  const [form, setForm] = useState(vacio);
  const [aviso, setAviso] = useState("");
  const actual = lista.find((u) => u.id === sel);

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["unidades_medida"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
  };

  function abrir(m: Modo, id = sel) {
    const actual = lista.find((x) => x.id === id);
    setModo(m); setAviso("");
    if (m === "nuevo" || !actual) return setForm({ ...vacio, orden: String(lista.length + 1) });
    setForm({
      simbolo: m === "copiar" ? "" : actual.simbolo,
      descripcion: actual.descripcion ?? "",
      orden: m === "copiar" ? String(lista.length + 1) : String(actual.orden ?? ""),
      activo: actual.activo,
    });
  }

  async function guardar() {
    const simbolo = form.simbolo.trim();
    if (!simbolo) return setAviso("Escribe el símbolo de la unidad (ej. m2).");
    const datos = { simbolo, descripcion: form.descripcion.trim(), orden: Number(form.orden) || lista.length + 1, activo: form.activo };
    const editar = modo === "editar" && actual;
    const { error } = editar
      ? await supabase.from("unidades_medida").update(datos).eq("id", actual.id)
      : await supabase.from("unidades_medida").insert(datos);
    if (error) return setAviso(error.message.includes("duplicate") ? "Esa unidad ya está registrada." : error.message);
    if (editar && actual.simbolo !== simbolo) await supabase.from("partidas").update({ unidad: simbolo }).eq("unidad", actual.simbolo);
    setModo(null);
    refrescar();
  }

  async function eliminar() {
    if (!actual || !window.confirm(`¿Eliminar la unidad «${actual.simbolo}» del catálogo?`)) return;
    const { error } = await supabase.from("unidades_medida").delete().eq("id", actual.id);
    if (error) return window.alert(error.message);
    setSel("");
    refrescar();
  }

  return (
    <div className="flex items-start gap-3">
      <Panel titulo="Unidades de medida" className="min-w-0 flex-1">
        {lista.length === 0 ? <Vacio texto="Sin unidades." /> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left label-mono">
                <th className="w-28 px-2 py-1">Símbolo</th><th className="px-2 py-1">Descripción</th>
                <th className="w-20 px-2 py-1 text-right">Orden</th><th className="w-24 px-2 py-1">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} onClick={() => setSel(u.id)} onDoubleClick={() => { setSel(u.id); abrir("editar", u.id); }}
                  className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel === u.id ? "bg-primary/10" : ""}`}>
                  <td className="px-2 py-0.5 font-mono">{u.simbolo}</td>
                  <td className="px-2 py-0.5">{u.descripcion}</td>
                  <td className="px-2 py-0.5 text-right font-mono">{u.orden}</td>
                  <td className="px-2 py-0.5 text-muted-foreground">{u.activo ? "Activa" : "Inactiva"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto="unidad" haySeleccion={!!actual}
        onAgregar={() => abrir("nuevo")} onEditar={() => abrir("editar")} onCopiar={() => abrir("copiar")} onEliminar={() => void eliminar()} />

      <VentanaFlotante abierta={!!modo} onCerrar={() => setModo(null)} ancho="max-w-lg"
        titulo={modo === "editar" ? "Editar unidad" : modo === "copiar" ? "Copiar unidad" : "Nueva unidad"}>
        <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <Campo etiqueta="Símbolo">
            <Input autoFocus maxLength={10} value={form.simbolo} data-formato="unidad" placeholder="m2" onChange={(e) => setForm({ ...form, simbolo: e.target.value })} />
          </Campo>
          <Campo etiqueta="Orden">
            <Input type="number" min={0} value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Descripción">
              <Input maxLength={60} value={form.descripcion} data-formato="oracion" onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </Campo>
          </div>
          <label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activa</label>
          {aviso && <p className="text-xs text-bad sm:col-span-2">{aviso}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Boton type="button" variante="linea" onClick={() => setModo(null)}>Cerrar</Boton>
            <Boton type="submit">Guardar</Boton>
          </div>
        </form>
      </VentanaFlotante>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Input, Panel } from "@/components/ui-kit";
import { useNormativa, type FilaNormativa } from "@/lib/normativa";
import { fecha, soles } from "@/lib/format";

const db = supabase as unknown as { from: (t: string) => any };
const vacio = { vigencia_desde: "", rmv: "", uit: "", base_legal: "", observaciones: "" };

export function HistorialNormativo() {
  const qc = useQueryClient();
  const { data: filas = [] } = useNormativa();
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.vigencia_desde || !(Number(form.rmv) > 0) || !(Number(form.uit) > 0)) return setError("Completa vigencia, RMV y UIT.");
    const datos = { vigencia_desde: form.vigencia_desde, rmv: Number(form.rmv), uit: Number(form.uit), base_legal: form.base_legal.trim(), observaciones: form.observaciones.trim() || null };
    const { error: err } = editId ? await db.from("historial_normativo").update(datos).eq("id", editId) : await db.from("historial_normativo").insert(datos);
    if (err) return setError(err.message.includes("duplicate") ? "Ya existe una norma con esa fecha de vigencia." : err.message);
    setForm(vacio);
    setEditId(null);
    qc.invalidateQueries({ queryKey: ["historial_normativo"] });
  }

  async function eliminar(f: FilaNormativa) {
    if (!confirm(`¿Eliminar la norma vigente desde ${fecha(f.vigencia_desde)}?`)) return;
    const { error: err } = await db.from("historial_normativo").delete().eq("id", f.id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["historial_normativo"] });
  }

  const editar = (f: FilaNormativa) => {
    setEditId(f.id);
    setForm({ vigencia_desde: f.vigencia_desde, rmv: String(f.rmv), uit: String(f.uit), base_legal: f.base_legal, observaciones: f.observaciones ?? "" });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={guardar}>
        <Panel titulo={editId ? "Editar norma" : "Registrar nuevo decreto"}>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Campo etiqueta="Vigente desde"><Input type="date" value={form.vigencia_desde} onChange={(e) => setForm({ ...form, vigencia_desde: e.target.value })} /></Campo>
            <Campo etiqueta="RMV (S/)"><Input type="number" step="0.01" min={0} value={form.rmv} onChange={(e) => setForm({ ...form, rmv: e.target.value })} /></Campo>
            <Campo etiqueta="UIT (S/)"><Input type="number" step="0.01" min={0} value={form.uit} onChange={(e) => setForm({ ...form, uit: e.target.value })} /></Campo>
            <Campo etiqueta="Base legal"><Input value={form.base_legal} placeholder="D.S. N° …" onChange={(e) => setForm({ ...form, base_legal: e.target.value })} /></Campo>
            <Campo etiqueta="Observaciones"><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Campo>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
            <Boton type="submit">{editId ? "Guardar cambios" : "Registrar"}</Boton>
            {editId && <Boton type="button" variante="secundario" onClick={() => { setEditId(null); setForm(vacio); }}>Cancelar</Boton>}
            {error && <span className="text-xs text-bad">{error}</span>}
          </div>
        </Panel>
      </form>
      <Panel titulo="Historial normativo (RMV / UIT)">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-muted-foreground"><th className="px-3 py-1.5">Vigente desde</th><th className="px-3 py-1.5 text-right">RMV</th><th className="px-3 py-1.5 text-right">UIT</th><th className="px-3 py-1.5">Base legal</th><th className="px-3 py-1.5">Observaciones</th><th /></tr></thead>
          <tbody>
            {[...filas].reverse().map((f) => (
              <tr key={f.id} className="cursor-pointer border-t border-line hover:bg-muted/40" onClick={() => editar(f)}>
                <td className="px-3 py-1">{fecha(f.vigencia_desde)}</td>
                <td className="px-3 py-1 text-right tabular-nums">{soles(Number(f.rmv))}</td>
                <td className="px-3 py-1 text-right tabular-nums">{soles(Number(f.uit))}</td>
                <td className="px-3 py-1">{f.base_legal}</td>
                <td className="px-3 py-1 text-muted-foreground">{f.observaciones}</td>
                <td className="px-2 py-1 text-right"><BotonIcono tono="peligro" titulo="Eliminar" onClick={(e: React.MouseEvent) => { e.stopPropagation(); eliminar(f); }}><Trash2 className="size-3.5" /></BotonIcono></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-2 text-[11px] text-muted-foreground">Nómina toma la RMV vigente de cada mes y la UIT vigente al 1 de enero de cada año. Haz clic en una fila para editarla.</p>
      </Panel>
    </div>
  );
}

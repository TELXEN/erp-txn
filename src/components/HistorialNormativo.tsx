import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Input, Panel } from "@/components/ui-kit";
import { useRmv, useUit } from "@/lib/normativa";
import { fecha, soles } from "@/lib/format";

const db = supabase as unknown as { from: (t: string) => any };

type Config = {
  tabla: "normativa_rmv" | "normativa_uit";
  titulo: string;
  campoClave: "vigencia_desde" | "anio";
  etiquetaClave: string;
  nota: string;
};

function ListaNormativa({ cfg, filas }: { cfg: Config; filas: Array<{ id: string; monto: number; base_legal: string; observaciones: string | null } & Record<string, any>> }) {
  const qc = useQueryClient();
  const vacio = { clave: "", monto: "", base_legal: "", observaciones: "" };
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const esAnio = cfg.campoClave === "anio";
  const mostrar = (v: any) => (esAnio ? String(v) : fecha(v));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.clave || !(Number(form.monto) > 0)) return setError(`Completa ${cfg.etiquetaClave.toLowerCase()} y monto.`);
    const datos = { [cfg.campoClave]: esAnio ? Number(form.clave) : form.clave, monto: Number(form.monto), base_legal: form.base_legal.trim(), observaciones: form.observaciones.trim() || null };
    const { error: err } = editId ? await db.from(cfg.tabla).update(datos).eq("id", editId) : await db.from(cfg.tabla).insert(datos);
    if (err) return setError(err.message.includes("duplicate") ? `Ya existe un valor para ese ${esAnio ? "año" : "día"}.` : err.message);
    setForm(vacio);
    setEditId(null);
    qc.invalidateQueries({ queryKey: [cfg.tabla] });
  }

  async function eliminar(f: (typeof filas)[number]) {
    if (!confirm(`¿Eliminar el valor de ${mostrar(f[cfg.campoClave])}?`)) return;
    const { error: err } = await db.from(cfg.tabla).delete().eq("id", f.id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: [cfg.tabla] });
  }

  return (
    <Panel titulo={cfg.titulo}>
      <form onSubmit={guardar} className="border-b border-line">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Campo etiqueta={cfg.etiquetaClave}>
            {esAnio
              ? <Input type="number" min={2000} max={2100} value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />
              : <Input type="date" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />}
          </Campo>
          <Campo etiqueta="Monto (S/)"><Input type="number" step="0.01" min={0} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></Campo>
          <Campo etiqueta="Base legal"><Input value={form.base_legal} placeholder="D.S. N° …" onChange={(e) => setForm({ ...form, base_legal: e.target.value })} /></Campo>
          <Campo etiqueta="Observaciones"><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Campo>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Boton type="submit">{editId ? "Guardar cambios" : "Registrar"}</Boton>
          {editId && <Boton type="button" variante="linea" onClick={() => { setEditId(null); setForm(vacio); }}>Cancelar</Boton>}
          {error && <span className="text-xs text-bad">{error}</span>}
        </div>
      </form>
      <table className="w-full text-[12px]">
        <thead><tr className="text-left text-muted-foreground"><th className="px-3 py-1.5">{cfg.etiquetaClave}</th><th className="px-3 py-1.5 text-right">Monto</th><th className="px-3 py-1.5">Base legal</th><th className="px-3 py-1.5">Observaciones</th><th /></tr></thead>
        <tbody>
          {[...filas].reverse().map((f) => (
            <tr key={f.id} className="cursor-pointer border-t border-line hover:bg-muted/40" onClick={() => { setEditId(f.id); setForm({ clave: String(f[cfg.campoClave]), monto: String(f.monto), base_legal: f.base_legal, observaciones: f.observaciones ?? "" }); }}>
              <td className="px-3 py-1">{mostrar(f[cfg.campoClave])}</td>
              <td className="px-3 py-1 text-right tabular-nums">{soles(Number(f.monto))}</td>
              <td className="px-3 py-1">{f.base_legal}</td>
              <td className="px-3 py-1 text-muted-foreground">{f.observaciones}</td>
              <td className="px-2 py-1 text-right"><BotonIcono tono="peligro" etiqueta="Eliminar" onClick={(e) => { e.stopPropagation(); eliminar(f); }}><Trash2 className="size-3.5" /></BotonIcono></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted-foreground">{cfg.nota} Haz clic en una fila para editarla.</p>
    </Panel>
  );
}

export function HistorialNormativo() {
  const { data: rmv = [] } = useRmv();
  const { data: uit = [] } = useUit();
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ListaNormativa filas={rmv} cfg={{ tabla: "normativa_rmv", titulo: "Remuneración Mínima Vital (RMV)", campoClave: "vigencia_desde", etiquetaClave: "Vigente desde", nota: "Nómina usa la RMV vigente en cada mes." }} />
      <ListaNormativa filas={uit} cfg={{ tabla: "normativa_uit", titulo: "Unidad Impositiva Tributaria (UIT)", campoClave: "anio", etiquetaClave: "Año fiscal", nota: "La UIT rige del 1 de enero al 31 de diciembre." }} />
    </div>
  );
}

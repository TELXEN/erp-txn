import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BotonIcono, Input, Panel, Select } from "@/components/ui-kit";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { DIGITO_TIPO_INSUMO, NOMBRE_TIPO_INSUMO, useSubfamilias } from "@/lib/codigo-insumo";
import { claveNombre } from "@/lib/formato-texto";

const dos = (v: string) => /^\d{2}$/.test(v.trim());

export function CodificacionModularInsumos({ soloSubfamilias = false }: { soloSubfamilias?: boolean }) {
  const qc = useQueryClient();
  const { data: esp = [] } = useEspecialidadesPartida();
  const { data: subs = [] } = useSubfamilias();
  const [espSel, setEspSel] = useState("");
  const [nuevaSub, setNuevaSub] = useState({ bloque: "", codigo: "", nombre: "" });
  const [edit, setEdit] = useState<{ id: string; a: string; b: string; c?: string } | null>(null);
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["especialidades_partida"] });
    qc.invalidateQueries({ queryKey: ["subfamilias_insumo"] });
  };
  const ordenadas = [...esp].sort((a, b) => String(a.codigo_modular ?? "99").localeCompare(String(b.codigo_modular ?? "99")));
  const actual = espSel || ordenadas.find((e) => e.codigo_modular === "40")?.id || ordenadas[0]?.id || "";
  const subsEsp = subs.filter((s) => s.especialidad_id === actual);

  async function guardarCodigoEsp(id: string, codigo: string) {
    const c = codigo.trim();
    if (c && !dos(c)) return void toast.error("El código debe tener 2 dígitos (01–99).");
    if (c && esp.some((e) => e.id !== id && e.codigo_modular === c)) return void toast.error(`El código ${c} ya existe.`);
    const { error } = await supabase.from("especialidades_partida").update({ codigo_modular: c || null }).eq("id", id);
    if (error) return void toast.error(error.message);
    setEdit(null); refrescar();
  }

  async function crearSub() {
    const { bloque, codigo, nombre } = nuevaSub;
    if (!actual || !dos(codigo) || !nombre.trim()) return void toast.error("Completa código de 2 dígitos y nombre.");
    if (subsEsp.some((s) => s.codigo === codigo.trim())) return void toast.error(`El código ${codigo} ya existe en esta especialidad.`);
    if (subsEsp.some((s) => claveNombre(s.nombre) === claveNombre(nombre))) return void toast.error(`La subfamilia «${nombre.trim()}» ya existe.`);
    const { error } = await supabase.from("subfamilias_insumo").insert({ especialidad_id: actual, bloque: bloque.trim(), codigo: codigo.trim(), nombre: nombre.trim() });
    if (error) return void toast.error(error.message);
    setNuevaSub({ bloque, codigo: "", nombre: "" }); refrescar();
  }

  async function guardarSub(id: string, bloque: string, codigo: string, nombre: string) {
    if (!dos(codigo) || !nombre.trim()) return void toast.error("Completa código de 2 dígitos y nombre.");
    if (subsEsp.some((s) => s.id !== id && s.codigo === codigo.trim())) return void toast.error(`El código ${codigo} ya existe en esta especialidad.`);
    if (subsEsp.some((s) => s.id !== id && claveNombre(s.nombre) === claveNombre(nombre))) return void toast.error(`La subfamilia «${nombre.trim()}» ya existe.`);
    const { error } = await supabase.from("subfamilias_insumo").update({ bloque: bloque.trim(), codigo: codigo.trim(), nombre: nombre.trim() }).eq("id", id);
    if (error) return void toast.error(error.message);
    setEdit(null); refrescar();
  }

  async function quitarSub(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar la subfamilia «${nombre}»? Los insumos que la usan quedarán sin clasificar.`)) return;
    const { error } = await supabase.from("subfamilias_insumo").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    refrescar();
  }

  const bloques = [...new Set(subsEsp.map((s) => s.bloque))];
  const th = "px-2 py-1 text-left label-mono";
  const td = "px-2 py-0.5";

  return (
    <div className="space-y-3">
      {!soloSubfamilias && <>
      <p className="text-xs text-muted-foreground">
        Código de insumo de 8 dígitos: <span className="font-mono">T EE SS NNN</span> — tipo (1), especialidad (2), subfamilia (2, solo materiales; los demás 00) y correlativo (3). Ej. <span className="font-mono">10613001</span> / <span className="font-mono">20600001</span>.
      </p>
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <Panel titulo="Nivel 1 · Especialidades (2 dígitos)">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line"><th className={`${th} w-16`}>Código</th><th className={th}>Especialidad</th><th className="w-16" /></tr></thead>
            <tbody>
              {ordenadas.map((e) => (
                <tr key={e.id} className={`border-b border-line/60 ${e.id === actual ? "bg-primary/10" : ""}`} onClick={() => setEspSel(e.id)}>
                  <td className={`${td} font-mono`}>
                    {edit?.id === e.id ? (
                      <Input autoFocus maxLength={2} value={edit.a} className="h-6 w-12" onChange={(x) => setEdit({ ...edit, a: x.target.value.replace(/\D/g, "") })}
                        onKeyDown={(x) => { if (x.key === "Enter") guardarCodigoEsp(e.id, edit.a); if (x.key === "Escape") setEdit(null); }} />
                    ) : e.codigo_modular ?? <span className="text-destructive">—</span>}
                  </td>
                  <td className={`${td} cursor-pointer`}>{e.nombre}{!e.activo && <span className="ml-1 text-muted-foreground">(inactiva)</span>}</td>
                  <td className={`${td} text-right`}>
                    {edit?.id === e.id ? (
                      <span className="inline-flex gap-1">
                        <BotonIcono etiqueta="Guardar" tono="primario" onClick={() => guardarCodigoEsp(e.id, edit.a)}><Check size={13} /></BotonIcono>
                        <BotonIcono etiqueta="Cancelar" onClick={() => setEdit(null)}><X size={13} /></BotonIcono>
                      </span>
                    ) : (
                      <BotonIcono etiqueta="Editar código" onClick={() => setEdit({ id: e.id, a: e.codigo_modular ?? "", b: "" })}><Pencil size={13} /></BotonIcono>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-[11px] text-muted-foreground">Las especialidades nuevas se crean en Análisis de Precios Unitarios › Especialidad de partidas; aquí se les asigna su código.</p>
        </Panel>
        <Panel titulo="Nivel 2 · Tipo de insumo">
          <table className="w-full text-xs">
            <tbody>
              {(Object.keys(DIGITO_TIPO_INSUMO) as (keyof typeof DIGITO_TIPO_INSUMO)[]).map((k) => (
                <tr key={k} className="border-b border-line/60"><td className={`${td} w-8 font-mono`}>{DIGITO_TIPO_INSUMO[k]}</td><td className={td}>{NOMBRE_TIPO_INSUMO[k]}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      </>}
      <Panel titulo="Nivel 3 · Subfamilias técnicas" extra={
        <Select value={actual} onChange={(e) => setEspSel(e.target.value)} className="h-7 text-xs">
          {ordenadas.map((e) => <option key={e.id} value={e.id}>{e.codigo_modular ?? "—"} · {e.nombre}</option>)}
        </Select>
      }>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-line"><th className={`${th} w-48`}>Bloque</th><th className={`${th} w-16`}>Código</th><th className={th}>Subfamilia</th><th className="w-20" /></tr></thead>
          <tbody>
            {bloques.map((b) => subsEsp.filter((s) => s.bloque === b).map((s) => (
              <tr key={s.id} className="border-b border-line/60">
                {edit?.id === s.id ? (
                  <>
                    <td className={td}><Input value={edit.a} className="h-6" onChange={(x) => setEdit({ ...edit, a: x.target.value })} /></td>
                    <td className={td}><Input maxLength={2} value={edit.b} className="h-6 w-12" onChange={(x) => setEdit({ ...edit, b: x.target.value.replace(/\D/g, "") })} /></td>
                    <td className={td}><Input autoFocus value={edit.c ?? ""} className="h-6" onChange={(x) => setEdit({ ...edit, c: x.target.value })}
                      onKeyDown={(x) => { if (x.key === "Enter") guardarSub(s.id, edit.a, edit.b, edit.c ?? ""); if (x.key === "Escape") setEdit(null); }} /></td>
                    <td className={`${td} text-right`}><span className="inline-flex gap-1">
                      <BotonIcono etiqueta="Guardar" tono="primario" onClick={() => guardarSub(s.id, edit.a, edit.b, edit.c ?? "")}><Check size={13} /></BotonIcono>
                      <BotonIcono etiqueta="Cancelar" onClick={() => setEdit(null)}><X size={13} /></BotonIcono>
                    </span></td>
                  </>
                ) : (
                  <>
                    <td className={`${td} text-muted-foreground`}>{s.bloque || "—"}</td>
                    <td className={`${td} font-mono`}>{s.codigo}</td>
                    <td className={td}>{s.nombre}</td>
                    <td className={`${td} text-right`}><span className="inline-flex gap-1">
                      <BotonIcono etiqueta="Editar" onClick={() => setEdit({ id: s.id, a: s.bloque, b: s.codigo, c: s.nombre })}><Pencil size={13} /></BotonIcono>
                      <BotonIcono etiqueta="Eliminar" tono="peligro" onClick={() => quitarSub(s.id, s.nombre)}><Trash2 size={13} /></BotonIcono>
                    </span></td>
                  </>
                )}
              </tr>
            )))}
            <tr>
              <td className={td}><Input placeholder="Bloque" value={nuevaSub.bloque} className="h-6" onChange={(x) => setNuevaSub({ ...nuevaSub, bloque: x.target.value })} /></td>
              <td className={td}><Input placeholder="00" maxLength={2} value={nuevaSub.codigo} className="h-6 w-12" onChange={(x) => setNuevaSub({ ...nuevaSub, codigo: x.target.value.replace(/\D/g, "") })} /></td>
              <td className={td}><Input placeholder="Nueva subfamilia (Enter)" value={nuevaSub.nombre} className="h-6" onChange={(x) => setNuevaSub({ ...nuevaSub, nombre: x.target.value })} onKeyDown={(x) => x.key === "Enter" && crearSub()} /></td>
              <td className={`${td} text-right`}><BotonIcono etiqueta="Agregar subfamilia" tono="primario" onClick={crearSub}><Plus size={13} /></BotonIcono></td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

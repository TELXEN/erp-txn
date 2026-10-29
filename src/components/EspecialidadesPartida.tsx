import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Boton, BotonIcono, Campo, Input, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useEspecialidadesPartida, type EspecialidadPartida } from "@/lib/especialidades";
import { formatearTexto } from "@/lib/formato-texto";
import { validarEspecialidad } from "@/lib/especialidad-form";

type Form = { codigo: string; nombre: string; descripcion: string };
export function EspecialidadesPartida() {
  const qc = useQueryClient();
  const { data: lista = [] } = useEspecialidadesPartida();
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const sel = lista.find((e) => e.id === seleccionadaId && e.activo);
  const [modo, setModo] = useState<"nuevo" | "editar" | "copiar" | null>(null);
  const [form, setForm] = useState<Form>({ codigo: "", nombre: "", descripcion: "" });
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const activas = lista.filter((e) => e.activo).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const visibles = activas.filter((e) => coincide(busqueda, e.codigo, e.nombre, e.descripcion));
  const refrescar = () => {
    for (const key of ["especialidades_partida", "categorias_partida", "partidas", "partidas_maestras", "banco_apu", "subfamilias_insumo", "insumos", "maestro_insumos", "partidas_apu"])
      void qc.invalidateQueries();
      void qc.invalidateQueries({ queryKey: [key] });
  };
  const idx = sel ? activas.findIndex((e) => e.id === sel.id) : -1;
  const [moviendo, setMoviendo] = useState(false);
  async function mover(dir: -1 | 1) {
    if (!sel || moviendo) return;
    setMoviendo(true);
    const { data, error } = await supabase.rpc("mover_especialidad", { _id: sel.id, _direccion: dir });
    setMoviendo(false);
    if (error) return void toast.error(error.message);
    const r = data as { insumos: number; partidas: number; codigo: string };
    toast.success(`Especialidad movida a ${r.codigo}: ${r.insumos} insumos y ${r.partidas} partidas recodificados.`);
    refrescar();
  }
  function abrir(m: "nuevo" | "editar" | "copiar", objetivo: EspecialidadPartida | undefined = sel) {
    setAviso("");
    if (m === "nuevo") setForm({ codigo: "", nombre: "", descripcion: "" });
    else if (objetivo) setForm({ codigo: m === "copiar" ? "" : objetivo.codigo, nombre: m === "copiar" ? `${objetivo.nombre} (COPIA)` : objetivo.nombre, descripcion: objetivo.descripcion ?? "" });
    else return;
    setModo(m);
  }
  async function guardar() {
    if (guardando) return;
    const nombre = formatearTexto(form.nombre, "mayusculas");
    const codigo = form.codigo.trim();
    const error = validarEspecialidad(codigo, nombre, lista, modo === "editar" ? sel?.id : undefined);
    if (error) { setAviso(error); toast.error(error); return; }
    setGuardando(true);
    setAviso("");
    try {
      if (modo === "editar" && !sel) throw new Error("La especialidad ya no está disponible.");
      const { error: err } = modo === "editar" && sel
        ? await supabase.rpc("guardar_especialidad", { _id: sel.id, _codigo: codigo, _nombre: nombre, _descripcion: form.descripcion.trim() })
        : await supabase.from("especialidades_partida").insert({ codigo, codigo_modular: codigo, nombre, descripcion: form.descripcion.trim() || null, orden: Number(codigo), bloque: "construccion", activo: true });
      if (err) throw new Error(err.message.includes("duplicate") ? "El nombre o código ya existe." : err.message);
      refrescar(); setModo(null);
    } catch (e) { setAviso(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setGuardando(false); }
  }
  async function quitar() {
    if (!sel || !window.confirm(`¿Eliminar «${sel.nombre}»?`)) return;
    // Archive rather than cascade-delete subfamilies or detach resource history.
    const { error } = await supabase.from("especialidades_partida").update({ activo: false }).eq("id", sel.id);
    if (error) { toast.error(error.message); return; }
    toast.info("Se marcó como Inactivo en lugar de eliminarse para conservar sus partidas e insumos.");
    setSeleccionadaId(null); refrescar();
  }
  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1 rounded-md border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <span className="text-xs font-semibold">Especialidad de partidas</span>
          <Buscador valor={busqueda} onChange={setBusqueda} total={activas.length} />
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-line text-left label-mono"><th className="w-16 px-2 py-0.5">Código</th><th className="px-2 py-0.5">Especialidad</th></tr></thead>
          <tbody>{visibles.map((e) => (
            <tr key={e.id} tabIndex={0} aria-selected={sel?.id === e.id} onClick={() => setSeleccionadaId(e.id)} onDoubleClick={() => { setSeleccionadaId(e.id); abrir("editar", e); }}
              onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setSeleccionadaId(e.id); } }}
              className={`cursor-pointer border-b border-line/60 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${sel?.id === e.id ? "bg-primary/10" : ""}`}>
              <td className="whitespace-nowrap px-2 py-0.5 font-mono">{e.codigo}</td>
              <td className="w-full px-2 py-0.5 uppercase" title={e.descripcion ?? undefined}><Resaltar texto={e.nombre} termino={busqueda} /></td>
            </tr>
          ))}</tbody>
        </table>
        {visibles.length === 0 && <p className="px-3 py-1.5 text-xs text-muted-foreground">Sin especialidades</p>}
      </div>
      <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
        <BotonIcono etiqueta="Agregar nueva especialidad" tono="primario" onClick={() => abrir("nuevo")}><Plus size={15} /></BotonIcono>
        <BotonIcono etiqueta="Subir especialidad" disabled={!sel || idx <= 0 || moviendo} onClick={() => mover(-1)}><ArrowUp size={15} /></BotonIcono>
        <BotonIcono etiqueta="Bajar especialidad" disabled={!sel || idx < 0 || idx >= activas.length - 1 || moviendo} onClick={() => mover(1)}><ArrowDown size={15} /></BotonIcono>
        <BotonIcono etiqueta="Editar especialidad" disabled={!sel} onClick={() => abrir("editar")}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Copiar especialidad" disabled={!sel} onClick={() => abrir("copiar")}><Copy size={15} /></BotonIcono>
        <BotonIcono etiqueta="Eliminar especialidad" tono="peligro" disabled={!sel} onClick={() => void quitar()}><Trash2 size={15} /></BotonIcono>
      </div>
      <VentanaFlotante abierta={modo !== null} onCerrar={() => !guardando && setModo(null)} ancho="max-w-2xl" titulo={modo === "editar" ? "Editar especialidad" : modo === "copiar" ? "Copiar especialidad" : "Nueva especialidad"}>
        <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <Campo etiqueta="Código (2 dígitos)"><Input maxLength={2} inputMode="numeric" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/\D/g, "") })} /></Campo>
          <Campo etiqueta="Nombre"><Input autoFocus data-formato="mayusculas" value={form.nombre} onBlur={() => setForm((f) => ({ ...f, nombre: formatearTexto(f.nombre, "mayusculas") }))} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
          <div className="sm:col-span-2"><Campo etiqueta="Descripción"><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Campo></div>
          {aviso && <p role="alert" className="text-xs text-destructive sm:col-span-2">{aviso}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><Boton type="button" variante="linea" disabled={guardando} onClick={() => setModo(null)}>Cerrar</Boton><Boton type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton></div>
        </form>
      </VentanaFlotante>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/ui-kit";
import {
  previsualizarCodigoDocumento,
  useCodificacionDocumentos,
  type CodificacionDocumento,
} from "@/lib/codificacion-documentos";

type Fila = { codigo: string; digitos: number; correlativo_actual: number; nombre: string };
const vacia: Fila = { codigo: "", digitos: 3, correlativo_actual: 0, nombre: "" };

const celda = "w-full rounded border border-line bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary";
const tabla = supabase.from.bind(supabase) as unknown as (t: string) => ReturnType<typeof supabase.from>;

function normalizar(f: Fila) {
  return {
    codigo: f.codigo,
    digitos: Math.min(Math.max(Number(f.digitos) || 1, 1), 8),
    correlativo_actual: Math.max(Math.floor(Number(f.correlativo_actual) || 0), 0),
    nombre: f.nombre.trim().toUpperCase(),
  };
}

export function CodificacionDocumentos() {
  const qc = useQueryClient();
  const { data: filas = [] } = useCodificacionDocumentos();
  const [nueva, setNueva] = useState<Fila>(vacia);
  const [editando, setEditando] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Fila>(vacia);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const refrescar = () => qc.invalidateQueries({ queryKey: ["codificacion_documentos"] });
  const sel = filas.find((f) => f.id === seleccion) ?? null;
  const vistaSel = sel && editando === sel.id ? { ...sel, ...normalizar(edicion) } : sel;

  async function crear() {
    setError("");
    setAviso("");
    const c = normalizar(nueva);
    if (!c.nombre) return setError("Escribe el nombre del documento.");
    if (!c.codigo) return setError("Escribe el código.");
    const orden = filas.reduce((m, f) => Math.max(m, f.orden), 0) + 1;
    const { error: e } = await tabla("codificacion_documentos").insert({ ...c, orden } as never);
    if (e) return setError(e.message.includes("duplicate") ? "Ya existe un documento con ese nombre." : e.message);
    setNueva(vacia);
    setAviso("Codificación añadida.");
    refrescar();
  }

  async function guardar(f: CodificacionDocumento) {
    setError("");
    setAviso("");
    const c = normalizar(edicion);
    if (!c.codigo) return setError("Escribe el código.");
    const campos = f.es_sistema ? { codigo: c.codigo, digitos: c.digitos, correlativo_actual: c.correlativo_actual } : c;
    const { error: e } = await tabla("codificacion_documentos").update(campos as never).eq("id", f.id);
    if (e) return setError(e.message);
    setEditando(null);
    setAviso("Codificación guardada.");
    refrescar();
  }

  async function eliminar(f: CodificacionDocumento) {
    setError("");
    setAviso("");
    // Tablas de documentos asociadas a cada nombre de codificación
    const tablas: Record<string, string> = {
      PROYECTOS: "proyectos",
      COTIZACIONES: "cotizaciones",
      PRELIQUIDACIONES: "preliquidaciones",
    };
    const tablaDoc = tablas[f.nombre];
    if (tablaDoc) {
      const { count, error: eC } = await tabla(tablaDoc).select("id", { count: "exact", head: true });
      if (eC) return setError(eC.message);
      if ((count ?? 0) > 0) {
        return setError(`No se puede eliminar «${f.nombre}»: tiene ${count} documento(s) asociado(s).`);
      }
    } else if (f.correlativo_actual > 0) {
      return setError(`No se puede eliminar «${f.nombre}»: ya se generaron ${f.correlativo_actual} documento(s) con este código.`);
    }
    if (!confirm(`¿Eliminar la codificación «${f.nombre}»?`)) return;
    const { error: e } = await tabla("codificacion_documentos").delete().eq("id", f.id);
    if (e) return setError(e.message);
    if (seleccion === f.id) setSeleccion(null);
    setAviso("Codificación eliminada.");
    refrescar();
  }

  const teclas = (accion: () => void, cancelar?: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      accion();
    } else if (e.key === "Escape") cancelar?.();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel titulo="Codificación de documentos">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-16 px-2 py-2 text-left">Ítem</th>
                <th className="px-2 py-2 text-left">Código</th>
                <th className="w-28 px-2 py-2 text-right">Dígitos del correlativo</th>
                <th className="w-32 px-2 py-2 text-right">Último correlativo usado</th>
                <th className="px-2 py-2 text-left">Nombre</th>
                <th className="w-20 px-2 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-primary/5" onKeyDown={teclas(crear, () => setNueva(vacia))}>
                <td className="px-2 py-1.5 font-mono text-muted-foreground">{(filas.length + 1).toFixed(2)}</td>
                <td className="px-2 py-1.5">
                  <input className={celda} placeholder="Ej. TXN26-OC" value={nueva.codigo} onChange={(e) => setNueva({ ...nueva, codigo: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input className={`${celda} text-right`} type="number" min={1} max={8} value={nueva.digitos} onChange={(e) => setNueva({ ...nueva, digitos: Number(e.target.value) })} />
                </td>
                <td className="px-2 py-1.5">
                  <input className={`${celda} text-right`} type="number" min={0} value={nueva.correlativo_actual} onChange={(e) => setNueva({ ...nueva, correlativo_actual: Number(e.target.value) })} />
                </td>
                <td className="px-2 py-1.5">
                  <input className={`${celda} uppercase`} placeholder="Nombre del documento" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={crear} title="Añadir" className="rounded p-1 text-primary hover:bg-primary/10">
                    <Plus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              {filas.map((f, i) => {
                const ed = editando === f.id;
                return (
                  <tr
                    key={f.id}
                    onClick={() => setSeleccion(f.id)}
                    onKeyDown={ed ? teclas(() => guardar(f), () => setEditando(null)) : undefined}
                    className={`cursor-pointer border-b border-line ${seleccion === f.id ? "bg-primary/10" : "hover:bg-muted/40"}`}
                  >
                    <td className="px-2 py-1.5 font-mono">{(i + 1).toFixed(2)}</td>
                    <td className="px-2 py-1.5 font-mono">
                      {ed ? <input className={celda} value={edicion.codigo} onChange={(e) => setEdicion({ ...edicion, codigo: e.target.value })} autoFocus /> : f.codigo}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {ed ? <input className={`${celda} text-right`} type="number" min={1} max={8} value={edicion.digitos} onChange={(e) => setEdicion({ ...edicion, digitos: Number(e.target.value) })} /> : f.digitos}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {ed ? <input className={`${celda} text-right`} type="number" min={0} value={edicion.correlativo_actual} onChange={(e) => setEdicion({ ...edicion, correlativo_actual: Number(e.target.value) })} /> : f.correlativo_actual}
                    </td>
                    <td className="px-2 py-1.5 font-semibold">
                      {ed && !f.es_sistema ? (
                        <input className={`${celda} uppercase`} value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
                      ) : (
                        f.nombre
                      )}
                    </td>
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        {ed ? (
                          <>
                            <button type="button" title="Guardar" onClick={() => guardar(f)} className="rounded p-1 text-good hover:bg-muted"><Check className="h-4 w-4" /></button>
                            <button type="button" title="Cancelar" onClick={() => setEditando(null)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => {
                                setEditando(f.id);
                                setSeleccion(f.id);
                                setEdicion({ codigo: f.codigo, digitos: f.digitos, correlativo_actual: f.correlativo_actual, nombre: f.nombre });
                              }}
                              className="rounded p-1 text-primary hover:bg-muted"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!f.es_sistema && (
                              <button type="button" title="Eliminar" onClick={() => eliminar(f)} className="rounded p-1 text-bad hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(error || aviso) && (
          <div className="border-t border-line px-4 py-2 font-mono text-xs">
            {error && <span className="text-bad">{error}</span>}
            {aviso && <span className="text-good">{aviso}</span>}
          </div>
        )}
      </Panel>

      <Panel titulo="Vista previa">
        <div className="space-y-3 p-4">
          <div className="grid place-items-center rounded-md border border-dashed border-line bg-muted/40 p-5">
            {vistaSel ? (
              <>
                <p className="font-mono text-lg font-semibold text-primary">{previsualizarCodigoDocumento(vistaSel)}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">Próximo código de {vistaSel.nombre.toLowerCase()}</p>
              </>
            ) : (
              <p className="font-mono text-[11px] text-muted-foreground">Selecciona una fila</p>
            )}
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            El código de cada documento es el CÓDIGO más el correlativo. Cada documento nuevo recibe el siguiente
            código automáticamente y el correlativo avanza; los códigos no se repiten.
          </p>
        </div>
      </Panel>
    </div>
  );
}

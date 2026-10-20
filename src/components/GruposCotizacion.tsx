import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { useGruposCotizacion } from "@/lib/cotizaciones";
import { recodificarWbs } from "@/lib/wbs";
import { formatearTexto, claveNombre } from "@/lib/formato-texto";

/** Title Case Industrial: palabras clave con mayúscula inicial, conectores en minúscula. */
const titular = (s: string) => formatearTexto(s, "titulo");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

type Modo = "nuevo" | "editar" | "copiar";

/** Catálogo de títulos de partidas: hoja limpia + barra de iconos + ventana flotante. */
export function GruposCotizacion() {
  const qc = useQueryClient();
  const { data: grupos = [] } = useGruposCotizacion();
  const [sel, setSel] = useState("");
  const [modo, setModo] = useState<Modo | null>(null);
  const [nombre, setNombre] = useState("");
  const [activo, setActivo] = useState(true);
  const [aviso, setAviso] = useState("");
  const actual = grupos.find((g) => g.id === sel);

  const refrescar = async () => {
    await recodificarWbs().catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
    qc.invalidateQueries({ queryKey: ["grupos_cotizacion"] });
    qc.invalidateQueries({ queryKey: ["categorias_partida"] });
  };
  const existe = (n: string, exceptoId?: string) =>
    grupos.some((g) => g.id !== exceptoId && claveNombre(g.nombre) === claveNombre(n));

  function abrir(m: Modo, id = sel) {
    const actual = grupos.find((x) => x.id === id);
    setModo(m); setAviso("");
    setNombre(m === "nuevo" || !actual ? "" : m === "copiar" ? `${actual.nombre} (copia)` : actual.nombre);
    setActivo(m === "nuevo" || !actual ? true : actual.activo);
  }

  async function guardar() {
    const v = titular(nombre.trim());
    if (!v) return setAviso("Escribe el nombre del título.");
    const editId = modo === "editar" ? actual?.id : undefined;
    if (existe(v, editId)) { const t = `El título «${v.toUpperCase()}» ya existe`; toast.error(t); return setAviso(t); }
    const { error } = editId
      ? await sb.from("grupos_cotizacion").update({ nombre: v, activo }).eq("id", editId)
      : await sb.from("grupos_cotizacion").insert({ nombre: v, activo, orden: grupos.length + 1 });
    if (error) return setAviso(error.message);
    setModo(null);
    refrescar();
  }

  async function eliminar() {
    if (!actual || !window.confirm(`¿Eliminar el título «${actual.nombre.toUpperCase()}»?`)) return;
    const { error } = await sb.from("grupos_cotizacion").delete().eq("id", actual.id);
    if (error) return toast.error(error.message);
    setSel("");
    refrescar();
  }

  return (
    <div className="flex items-start gap-3">
      <Panel titulo="Títulos de partidas" className="min-w-0 flex-1">
        {grupos.length === 0 ? <Vacio texto="Sin títulos." /> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left label-mono">
                <th className="w-12 px-2 py-1">N°</th><th className="px-2 py-1">Título</th><th className="w-24 px-2 py-1">Estado</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => (
                <tr key={g.id} onClick={() => setSel(g.id)} onDoubleClick={() => { setSel(g.id); abrir("editar", g.id); }}
                  className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel === g.id ? "bg-primary/10" : ""}`}>
                  <td className="px-2 py-0.5 font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-2 py-0.5 uppercase">{g.nombre}</td>
                  <td className="px-2 py-0.5 text-muted-foreground">{g.activo ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto="título" haySeleccion={!!actual}
        onAgregar={() => abrir("nuevo")} onEditar={() => abrir("editar")} onCopiar={() => abrir("copiar")} onEliminar={() => void eliminar()} />

      <VentanaFlotante abierta={!!modo} onCerrar={() => setModo(null)} ancho="max-w-lg"
        titulo={modo === "editar" ? "Editar título" : modo === "copiar" ? "Copiar título" : "Nuevo título"}>
        <form className="grid gap-3 p-5" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <Campo etiqueta="Nombre del título">
            <Input autoFocus value={nombre} data-formato="titulo" placeholder="Centro de Control de Motores"
              onChange={(e) => setNombre(e.target.value)} onBlur={(e) => setNombre(titular(e.target.value))} />
          </Campo>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo</label>
          {aviso && <p className="text-xs text-bad">{aviso}</p>}
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="linea" onClick={() => setModo(null)}>Cerrar</Boton>
            <Boton type="submit">Guardar</Boton>
          </div>
        </form>
      </VentanaFlotante>
    </div>
  );
}

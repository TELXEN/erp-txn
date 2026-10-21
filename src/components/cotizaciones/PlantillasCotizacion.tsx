import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Input, Panel, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { claveNombre } from "@/lib/formato-texto";
import { usePlantillasCotizacion, type PlantillaCotizacion } from "@/lib/cotizaciones";

const sb = supabase as unknown as { from: (t: string) => any };

type Modo = "nueva" | "editar" | "copiar";
type Form = { nombre: string; descripcion: string };
const VACIO: Form = { nombre: "", descripcion: "" };

/**
 * Plantillas de cotización por tipo de obra: hoja limpia con selección de fila y
 * columna vertical de iconos a la derecha (Agregar, Editar, Copiar, Eliminar), igual que Insumos.
 */
export function PlantillasCotizacion() {
  const qc = useQueryClient();
  const { data: plantillas = [] } = usePlantillasCotizacion();
  const [sel, setSel] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo | null>(null);
  const [form, setForm] = useState<Form>(VACIO);
  const [error, setError] = useState("");

  const { data: conteo = {} } = useQuery({
    queryKey: ["plantillas_cotizacion", "conteo"],
    queryFn: async () => {
      const { data } = await sb.from("plantilla_cotizacion_items").select("plantilla_id, tipo");
      const r: Record<string, number> = {};
      for (const d of (data ?? []) as { plantilla_id: string; tipo: string }[])
        if (d.tipo !== "grupo") r[d.plantilla_id] = (r[d.plantilla_id] ?? 0) + 1;
      return r;
    },
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["plantillas_cotizacion"] });
  const seleccionada = plantillas.find((p) => p.id === sel) ?? null;

  function abrir(m: Modo, p: PlantillaCotizacion | null) {
    setError("");
    setModo(m);
    if (m === "nueva") setForm(VACIO);
    else if (p) setForm({ nombre: m === "copiar" ? `${p.nombre} (copia)` : p.nombre, descripcion: p.descripcion });
  }

  /** Copia los renglones de una plantilla (sin id ni fechas) a la plantilla destino. */
  async function copiarItems(desde: string, hacia: string) {
    const { data: items } = await sb.from("plantilla_cotizacion_items").select("*").eq("plantilla_id", desde).order("orden");
    if (!items?.length) return;
    const { error: e } = await sb
      .from("plantilla_cotizacion_items")
      .insert((items as Record<string, unknown>[]).map(({ id: _x, created_at: _c, ...r }) => ({ ...r, plantilla_id: hacia })));
    if (e) throw e;
  }

  async function guardar() {
    const nombre = form.nombre.trim();
    if (!nombre) return setError("Indica el tipo de obra.");
    if (plantillas.some((p) => claveNombre(p.nombre) === claveNombre(nombre) && p.id !== (modo === "editar" ? sel : null)))
      return setError(`El tipo de obra «${nombre}» ya existe.`);
    setError("");
    try {
      if (modo === "editar" && sel) {
        const { error: e } = await sb.from("plantillas_cotizacion").update({ nombre, descripcion: form.descripcion }).eq("id", sel);
        if (e) throw e;
      } else {
        const origen = modo === "copiar" ? seleccionada : null;
        const base = origen ? ({ ...(origen as Record<string, unknown>), id: undefined } as Record<string, unknown>) : {};
        delete base.id;
        delete base.created_at;
        delete base.updated_at;
        const { data, error: e } = await sb
          .from("plantillas_cotizacion")
          .insert({ ...base, nombre, descripcion: form.descripcion })
          .select("id")
          .single();
        if (e) throw e;
        if (data && origen) await copiarItems(origen.id, data.id);
      }
      refrescar();
      setModo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  async function borrar(p: PlantillaCotizacion) {
    if (!window.confirm(`¿Eliminar la plantilla «${p.nombre}»?`)) return;
    await sb.from("plantillas_cotizacion").delete().eq("id", p.id);
    if (sel === p.id) setSel(null);
    refrescar();
  }

  return (
    <div className="mb-4 flex items-start gap-3">
      <Panel titulo="Plantillas por tipo de obra" className="min-w-0 flex-1">
        <div className="p-3">
          <p className="mb-2 text-[11px] text-muted-foreground">
            Para llenar una plantilla: arma una cotización con sus especialidades, títulos, subtítulos y partidas y usa «Guardar como plantilla». Al crear una cotización elige la plantilla junto al botón «Nueva cotización».
          </p>
          {plantillas.length === 0 ? (
            <Vacio texto="Sin plantillas." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="px-2 py-1.5">Tipo de obra</th>
                  <th className="px-2 py-1.5">Descripción</th>
                  <th className="px-2 py-1.5 text-right">Partidas</th>
                </tr>
              </thead>
              <tbody>
                {plantillas.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSel(p.id)}
                    onDoubleClick={() => abrir("editar", p)}
                    className={`cursor-pointer border-b border-line/60 hover:bg-primary/5 ${sel === p.id ? "bg-primary/8" : ""}`}
                  >
                    <td className="px-2 py-1.5 font-semibold">{p.nombre}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{p.descripcion || "—"}</td>
                    <td className="px-2 py-1.5 text-right">{conteo[p.id] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border border-line bg-card p-1.5">
        <BotonIcono etiqueta="Agregar plantilla" title="Agregar plantilla" tono="primario" onClick={() => abrir("nueva", null)}><Plus size={15} /></BotonIcono>
        <BotonIcono etiqueta="Editar plantilla" title="Editar plantilla" disabled={!seleccionada} onClick={() => seleccionada && abrir("editar", seleccionada)}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Copiar plantilla" title="Copiar plantilla" disabled={!seleccionada} onClick={() => seleccionada && abrir("copiar", seleccionada)}><Copy size={15} /></BotonIcono>
        <BotonIcono etiqueta="Eliminar plantilla" title="Eliminar plantilla" tono="peligro" disabled={!seleccionada} onClick={() => seleccionada && void borrar(seleccionada)}><Trash2 size={15} /></BotonIcono>
      </div>

      <VentanaFlotante abierta={!!modo} onCerrar={() => setModo(null)} ancho="max-w-2xl"
        titulo={modo === "editar" ? "Editar plantilla" : modo === "copiar" ? "Copiar plantilla" : "Nueva plantilla"}>
        <form className="grid gap-3 p-5" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <Campo etiqueta="Tipo de obra">
            <Input value={form.nombre} autoFocus placeholder="Ej. Subestación eléctrica" onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Descripción">
            <Input value={form.descripcion} placeholder="Alcance de la plantilla" onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Campo>
          {error && <p className="font-mono text-xs text-bad">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Boton type="button" variante="linea" onClick={() => setModo(null)}>Cancelar</Boton>
            <Boton type="submit">Guardar</Boton>
          </div>
        </form>
      </VentanaFlotante>
    </div>
  );
}

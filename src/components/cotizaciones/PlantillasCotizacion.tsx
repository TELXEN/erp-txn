import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Vacio } from "@/components/ui-kit";
import { usePlantillasCotizacion, type PlantillaCotizacion } from "@/lib/cotizaciones";

const sb = supabase as unknown as { from: (t: string) => any };
const campo = "w-full rounded border border-line bg-card px-2 py-1 text-xs";

/** Plantillas de cotización por tipo de obra: datos generales editables en línea. */
export function PlantillasCotizacion() {
  const qc = useQueryClient();
  const { data: plantillas = [] } = usePlantillasCotizacion();
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

  async function guardar(p: PlantillaCotizacion, campos: Partial<PlantillaCotizacion>) {
    await sb.from("plantillas_cotizacion").update(campos).eq("id", p.id);
    refrescar();
  }
  async function nueva() {
    await sb.from("plantillas_cotizacion").insert({ nombre: "Nueva plantilla" });
    refrescar();
  }
  async function duplicar(p: PlantillaCotizacion) {
    const { id: _id, ...resto } = p as PlantillaCotizacion & { created_at?: string; updated_at?: string };
    delete (resto as Record<string, unknown>)["created_at"];
    delete (resto as Record<string, unknown>)["updated_at"];
    const { data } = await sb.from("plantillas_cotizacion").insert({ ...resto, nombre: `${p.nombre} (copia)` }).select("id").single();
    const { data: items } = await sb.from("plantilla_cotizacion_items").select("*").eq("plantilla_id", p.id).order("orden");
    if (items?.length && data) {
      const { error } = await sb
        .from("plantilla_cotizacion_items")
        .insert((items as Record<string, unknown>[]).map(({ id: _x, created_at: _c, ...r }) => ({ ...r, plantilla_id: data.id })));
      if (error) throw error;
    }
    refrescar();
  }
  async function borrar(p: PlantillaCotizacion) {
    if (!window.confirm(`¿Eliminar la plantilla «${p.nombre}»?`)) return;
    await sb.from("plantillas_cotizacion").delete().eq("id", p.id);
    refrescar();
  }

  return (
    <Panel titulo="Plantillas por tipo de obra" className="mb-4">
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
                  <th className="px-2 py-1.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plantillas.map((p) => (
                  <tr key={p.id} className="border-b border-line/60">
                    <td className="px-2 py-1"><input key={p.nombre} defaultValue={p.nombre} onBlur={(e) => e.target.value.trim() && e.target.value !== p.nombre && void guardar(p, { nombre: e.target.value.trim() })} className={`${campo} font-semibold`} /></td>
                    <td className="px-2 py-1"><input key={p.descripcion} defaultValue={p.descripcion} onBlur={(e) => e.target.value !== p.descripcion && void guardar(p, { descripcion: e.target.value })} className={campo} /></td>
                    <td className="px-2 py-1 text-right">{conteo[p.id] ?? 0}</td>
                    <td className="px-2 py-1">
                      <div className="flex justify-end gap-1">
                        <button type="button" title="Copiar" onClick={() => void duplicar(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:text-primary"><Copy size={13} /></button>
                        <button type="button" title="Eliminar" onClick={() => void borrar(p)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-bad"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button type="button" onClick={() => void nueva()} className="mt-2 text-xs text-primary underline">+ Nueva plantilla</button>
      </div>
    </Panel>
  );
}

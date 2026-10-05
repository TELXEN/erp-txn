import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/ui-kit";
import { useCategoriasPartida } from "@/lib/categorias";
import { useGruposCotizacion } from "@/lib/cotizaciones";

const sb = supabase as unknown as { from: (t: string) => any };
const campo = "w-full rounded border border-line bg-card px-2 py-1 text-xs";

/** Catálogo de grupos de cotización y asociación de cada categoría a su grupo. */
export function GruposCotizacion() {
  const qc = useQueryClient();
  const { data: grupos = [] } = useGruposCotizacion();
  const { data: categorias = [] } = useCategoriasPartida();
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["grupos_cotizacion"] });
    qc.invalidateQueries({ queryKey: ["categorias_partida"] });
  };

  async function nuevo() {
    const nombre = window.prompt("Nombre del grupo (ej. PRUEBAS Y PUESTA EN SERVICIO)")?.trim().toUpperCase();
    if (!nombre) return;
    await sb.from("grupos_cotizacion").insert({ nombre, orden: grupos.length + 1 });
    refrescar();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel titulo="Grupos de cotización">
        <div className="p-3">
          <p className="mb-2 text-[11px] text-muted-foreground">
            En cotizaciones de una sola disciplina el grupo es el capítulo; la especialidad solo se usa en cotizaciones multidisciplinarias.
          </p>
          <table className="w-full text-xs">
            <tbody>
              {grupos.map((g) => (
                <tr key={g.id} className="border-b border-line/60">
                  <td className="w-10 px-2 py-1 text-muted-foreground">{String(g.orden).padStart(2, "0")}</td>
                  <td className="px-2 py-1">
                    <input key={g.nombre} defaultValue={g.nombre} className={`${campo} font-semibold`}
                      onBlur={async (e) => {
                        const v = e.target.value.trim().toUpperCase();
                        if (v && v !== g.nombre) { await sb.from("grupos_cotizacion").update({ nombre: v }).eq("id", g.id); refrescar(); }
                      }} />
                  </td>
                  <td className="px-2 py-1">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={g.activo} onChange={async (e) => { await sb.from("grupos_cotizacion").update({ activo: e.target.checked }).eq("id", g.id); refrescar(); }} /> Activo</label>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button type="button" title="Eliminar" className="text-muted-foreground hover:text-destructive"
                      onClick={async () => { if (window.confirm(`¿Eliminar el grupo «${g.nombre}»?`)) { await sb.from("grupos_cotizacion").delete().eq("id", g.id); refrescar(); } }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => void nuevo()} className="mt-2 text-xs text-primary underline">+ Nuevo grupo</button>
        </div>
      </Panel>
      <Panel titulo="Categorías por grupo">
        <div className="max-h-[520px] overflow-auto p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                <th className="px-2 py-1.5">Categoría</th>
                <th className="px-2 py-1.5">Grupo</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id} className="border-b border-line/60">
                  <td className="px-2 py-1">{c.nombre} <span className="text-muted-foreground">· {c.especialidad}</span></td>
                  <td className="px-2 py-1">
                    <select value={(c as { grupo?: string }).grupo ?? ""} className={campo}
                      onChange={async (e) => { await sb.from("categorias_partida").update({ grupo: e.target.value }).eq("id", c.id); refrescar(); }}>
                      <option value="">Sin grupo</option>
                      {grupos.map((g) => <option key={g.id} value={g.nombre}>{g.nombre}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

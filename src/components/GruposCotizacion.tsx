import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/ui-kit";
import { useGruposCotizacion } from "@/lib/cotizaciones";
import { recodificarWbs } from "@/lib/wbs";

const sb = supabase as unknown as { from: (t: string) => any };
const campo = "w-full rounded border border-line bg-card px-2 py-1 text-xs";

/** Catálogo de grupos de partidas. El grupo de cada categoría se asigna en «Categorías de partidas». */
export function GruposCotizacion() {
  const qc = useQueryClient();
  const { data: grupos = [] } = useGruposCotizacion();
  const refrescar = async () => {
    await recodificarWbs().catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
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
    <Panel titulo="Grupos de partidas">
      <div className="p-3">
        <p className="mb-2 text-[11px] text-muted-foreground">
          En cotizaciones de una sola disciplina el grupo es el capítulo; la especialidad solo se usa en cotizaciones multidisciplinarias.
          Asigna el grupo de cada categoría en «Categorías de partidas».
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
        <button type="button" onClick={() => void nuevo()} className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">+ Agregar grupo</button>
      </div>
    </Panel>
  );
}

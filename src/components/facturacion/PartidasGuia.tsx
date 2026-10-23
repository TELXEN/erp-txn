import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, FilasCargando, Vacio, VentanaFlotante } from "@/components/ui-kit";

export type PartidaGuia = { id: string; codigo: string | null; nombre: string; unidad: string | null; metrado: number | null };

/** Unidad de la partida → código SUNAT de la guía. */
export function unidadSunat(u: string | null | undefined) {
  const k = (u ?? "").trim().toLowerCase().replace(/\./g, "");
  if (["m", "ml", "mt", "metro"].includes(k)) return "MTR";
  if (["m2", "m²"].includes(k)) return "MTK";
  if (["m3", "m³"].includes(k)) return "MTQ";
  if (["kg", "kgm"].includes(k)) return "KGM";
  if (["glb", "gl", "servicio", "%"].includes(k)) return "ZZ";
  return "NIU";
}

export function VentanaPartidasGuia({ proyectoId, onCerrar, onCargar }: { proyectoId: string; onCerrar: () => void; onCargar: (p: PartidaGuia[]) => void }) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const { data = [], isPending } = useQuery({
    queryKey: ["partidas", "guia", proyectoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("partidas").select("id,codigo,nombre,unidad,metrado").eq("proyecto_id", proyectoId).order("codigo");
      if (error) throw error;
      return (data ?? []) as PartidaGuia[];
    },
  });
  const todas = data.length > 0 && marcadas.size === data.length;
  const alternar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return <VentanaFlotante titulo="Partidas del proyecto" subtitulo="Marca las partidas a trasladar; se cargan con el metrado completo" abierta onCerrar={onCerrar} ancho="max-w-3xl">
    <div className="p-4">
      {isPending ? <table className="w-full"><tbody><FilasCargando columnas={4} /></tbody></table> : data.length === 0 ? <Vacio texto="Este proyecto no tiene partidas." /> :
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 bg-card"><tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
              <th className="w-8 px-2 py-1.5"><input type="checkbox" aria-label="Marcar todas" checked={todas} onChange={() => setMarcadas(todas ? new Set() : new Set(data.map((p) => p.id)))} /></th>
              <th className="px-2 py-1.5">Código</th><th className="px-2 py-1.5">Descripción</th><th className="px-2 py-1.5">Unidad</th><th className="px-2 py-1.5 text-right">Metrado</th>
            </tr></thead>
            <tbody>{data.map((p) => <tr key={p.id} onClick={() => alternar(p.id)} className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${marcadas.has(p.id) ? "bg-primary/10" : ""}`}>
              <td className="px-2 py-1"><input type="checkbox" aria-label={`Marcar ${p.nombre}`} checked={marcadas.has(p.id)} onChange={() => alternar(p.id)} onClick={(e) => e.stopPropagation()} /></td>
              <td className="px-2 py-1">{p.codigo ?? "—"}</td><td className="px-2 py-1 text-ink">{p.nombre}</td><td className="px-2 py-1">{p.unidad ?? "—"}</td><td className="px-2 py-1 text-right">{Number(p.metrado ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 4 })}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
        <Boton variante="linea" onClick={onCerrar}>Cancelar</Boton>
        <Boton disabled={!marcadas.size} onClick={() => onCargar(data.filter((p) => marcadas.has(p.id)))}>Cargar {marcadas.size || ""} partida{marcadas.size === 1 ? "" : "s"}</Boton>
      </div>
    </div>
  </VentanaFlotante>;
}

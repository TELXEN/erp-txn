import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SelectorBuscable } from "@/components/SelectorBuscable";
import { useSubfamilias } from "@/lib/codigo-insumo";
import type { Insumo } from "@/lib/apu";

const db = supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => any; from: (t: string) => any };

/** Celda de Subfamilia del Maestro de Insumos: filtra por la especialidad de la
 *  ficha y, al cambiarla, regenera el código T+EE+SS+NNN (sin subfamilia = 00). */
export function CeldaSubfamilia({ insumo, refrescar }: { insumo: Insumo; refrescar: () => void }) {
  const { data: subfamilias = [] } = useSubfamilias();
  const [guardando, setGuardando] = useState(false);
  const esp = insumo.especialidad_id ?? "";
  const esMat = insumo.tipo === "MAT";
  const opciones = [
    ...(esMat ? [] : [{ value: "", texto: "Sin subfamilia", detalle: "00" }]),
    ...subfamilias
      .filter((s) => s.especialidad_id === esp && (s.activo || s.id === insumo.subfamilia_id))
      .map((s) => ({ value: s.id, texto: s.nombre, detalle: s.codigo })),
  ];

  async function cambiar(v: string): Promise<void> {
    if (v === (insumo.subfamilia_id ?? "")) return;
    if (!esp) { toast.error("Primero asigna una especialidad a este insumo."); return; }
    if (esMat && !v) { toast.error("Los materiales requieren subfamilia."); return; }
    setGuardando(true);
    const { data: codigo, error } = await db.rpc("siguiente_codigo_insumo_modular", {
      _especialidad: esp, _tipo: insumo.tipo, _subfamilia: v || null, _categoria: insumo.categoria_inventario ?? null,
    });
    if (error) { setGuardando(false); toast.error(error.message); return; }
    const { error: e2 } = await db.from("insumos").update({ subfamilia_id: v || null, codigo }).eq("id", insumo.id);
    setGuardando(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success(`Código actualizado: ${codigo}`);
    refrescar();
  }

  return (
    <td className="px-2 py-2">
      {esp ? (
        <SelectorBuscable aria-label="Subfamilia" codigoIzquierda value={insumo.subfamilia_id ?? ""} onChange={(v) => void cambiar(v)} opciones={opciones} placeholder={guardando ? "Guardando…" : esMat ? "— Elegir —" : "Sin subfamilia"} />
      ) : (
        <span className="text-muted-foreground/60" title="Sin especialidad">—</span>
      )}
    </td>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SelectorBuscable } from "@/components/SelectorBuscable";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useSubfamilias, codigoInsumoModular } from "@/lib/codigo-insumo";
import { opcionesEspecialidad } from "@/lib/clasificacion-insumo";
import type { Insumo } from "@/lib/apu";

const db = supabase as unknown as { from: (t: string) => any };

/** Celda de Especialidad del Maestro de Insumos: al cambiarla, la subfamilia que no
 *  pertenezca a la nueva especialidad se libera y el código T+EE+SS+NNN se rehace. */
export function CeldaEspecialidad({ insumo, refrescar }: { insumo: Insumo; refrescar: () => void }) {
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: subfamilias = [] } = useSubfamilias();
  const [guardando, setGuardando] = useState(false);
  const esMat = insumo.tipo === "MAT";

  async function cambiar(v: string): Promise<void> {
    if (v === (insumo.especialidad_id ?? "")) return;
    if (!v) {
      toast.error("Elige la especialidad: con ella se genera el código.");
      return;
    }
    const subValida =
      insumo.subfamilia_id && subfamilias.some((s) => s.id === insumo.subfamilia_id && s.especialidad_id === v)
        ? insumo.subfamilia_id
        : null;
    setGuardando(true);
    try {
      // El material no puede rehacer su código sin subfamilia: se guarda la especialidad y se avisa.
      if (esMat && !subValida) {
        const { error } = await db.from("insumos").update({ especialidad_id: v, subfamilia_id: null }).eq("id", insumo.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.info("Especialidad guardada. Ahora elige la subfamilia: con ella se genera el código.");
        refrescar();
        return;
      }
      const codigo = await codigoInsumoModular({
        especialidad: v,
        tipo: insumo.tipo,
        subfamilia: subValida,
        categoria: insumo.categoria_inventario ?? null,
      });
      const { error } = await db
        .from("insumos")
        .update({ especialidad_id: v, subfamilia_id: subValida, codigo })
        .eq("id", insumo.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Código actualizado: ${codigo}`);
      refrescar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la especialidad.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <td className="px-3 py-2">
      <SelectorBuscable
        aria-label="Especialidad"
        value={insumo.especialidad_id ?? ""}
        onChange={(v) => void cambiar(v)}
        opciones={opcionesEspecialidad(especialidades, insumo.especialidad_id)}
        placeholder={guardando ? "Guardando…" : "— Elegir —"}
      />
    </td>
  );
}

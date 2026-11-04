import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
import { Eye, PencilRuler } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Herramientas de la cotización dentro de su ventana flotante (no en la cinta),
 * con el mismo conmutador «Edición | Vista previa» que Gastos Generales.
 */
type Base = { icono: ReactNode; texto: string; onClick?: () => void; disabled?: boolean; title?: string | undefined };

export function BotonBarra({ icono, texto, onClick, disabled, title }: Base) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs text-ink transition-colors hover:bg-cinta-seleccion/20 disabled:opacity-40 [&_svg]:size-4 [&_svg]:stroke-[1.5]">
      {icono}{texto}
    </button>
  );
}

export function SeparadorBarra() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;
}

export function BarraHerramientas({ children }: { children: ReactNode }) {
  return <div className="no-print flex shrink-0 flex-wrap items-center gap-0.5 border-b border-line bg-card px-3 py-1">{children}</div>;
}

export type ModoCotizacion = "edicion" | "vista";

/** IGV editable en la barra de título, compartido por ambos modos. */
export function IndicadoresCotizacion({ id, conIgv, disabled = false }: { id: string; conIgv: boolean; disabled?: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  async function cambiar(v: string) {
    const { error } = await supabase.from("cotizaciones").update({ aplica_igv: v === "si" }).eq("id", id);
    if (error) { setError("No se pudo guardar el IGV."); return; }
    setError("");
    await Promise.all([qc.invalidateQueries({ queryKey: ["cotizaciones"] }), qc.invalidateQueries({ queryKey: ["cotizacion"] })]);
  }
  return <div className="no-print flex items-center gap-1.5">
    <Select value={conIgv ? "si" : "no"} onValueChange={(v) => void cambiar(v)} disabled={disabled}>
      <SelectTrigger aria-label="IGV de la cotización" className="h-7 w-40 bg-card text-xs text-ink"><SelectValue /></SelectTrigger>
      <SelectContent className="z-[200]"><SelectItem value="si">Con IGV (18.00%)</SelectItem><SelectItem value="no">Sin IGV</SelectItem></SelectContent>
    </Select>
    {error && <span role="alert" className="text-xs text-bad">{error}</span>}
  </div>;
}

export function ConmutadorModo({ modo, onCambiar, sinEdicion }: { modo: ModoCotizacion; onCambiar: (m: ModoCotizacion) => void; sinEdicion?: boolean }) {
  const opciones = ([["edicion", "Edición", <PencilRuler key="e" size={14} />], ["vista", "Vista previa", <Eye key="v" size={14} />]] as const)
    .filter(([m]) => !(sinEdicion && m === "edicion"));
  return (
    <div className="no-print flex overflow-hidden rounded-md border border-line">
      {opciones.map(([m, t, ic]) => (
        <button key={m} type="button" onClick={() => onCambiar(m)} aria-pressed={modo === m}
          className={cn("flex h-8 items-center gap-1.5 px-3 text-xs transition-colors",
            modo === m ? "bg-cinta-seleccion font-semibold text-cinta-seleccion-foreground" : "bg-card text-ink hover:bg-cinta-seleccion/20")}>
          {ic}{t}
        </button>
      ))}
    </div>
  );
}

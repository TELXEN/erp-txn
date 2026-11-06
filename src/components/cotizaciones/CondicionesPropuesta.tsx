import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Clock, Wallet, FileText, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, VentanaFlotante } from "@/components/ui-kit";
import type { Cotizacion } from "@/lib/cotizaciones";

type Campo = "recursos_humanos" | "tiempo_ejecucion" | "condiciones_pago" | "condiciones";

/** Textos sugeridos de partida (editables por el usuario). */
const SUGERIDOS: Record<Campo, string> = {
  recursos_humanos: "Personal técnico calificado con SCTR vigente\nSupervisor residente durante la ejecución\nEPP completo para todo el personal",
  tiempo_ejecucion: "30 días calendario desde la entrega del área de trabajo\nEl plazo inicia con la orden de compra y el adelanto",
  condiciones_pago: "Adelanto 50 % a la orden de compra\nSaldo contra valorización",
  condiciones: "No incluye trabajos no especificados en la presente propuesta\nCualquier adicional será cotizado por separado",
};

const BLOQUES: { campo: Campo; titulo: string; icono: typeof Users }[] = [
  { campo: "recursos_humanos", titulo: "Recursos humanos", icono: Users },
  { campo: "tiempo_ejecucion", titulo: "Tiempo de ejecución", icono: Clock },
  { campo: "condiciones_pago", titulo: "Condiciones de pago", icono: Wallet },
  { campo: "condiciones", titulo: "Condiciones comerciales", icono: FileText },
];

/** Misma regla de viñetas que la hoja impresa: una línea no vacía = un punto. */
export const puntosCondicion = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

export function CondicionesPropuesta({ cot, abierta, onCerrar }: { cot: Cotizacion; abierta: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const leer = (c: Campo) => String((cot as unknown as Record<string, unknown>)[c] ?? "");
  const [textos, setTextos] = useState<Record<Campo, string>>(() => Object.fromEntries(BLOQUES.map((b) => [b.campo, leer(b.campo)])) as Record<Campo, string>);
  const [guardado, setGuardado] = useState(false);

  async function guardar(c: Campo, valor: string) {
    if (valor.trim() === leer(c).trim()) return;
    const { error } = await supabase.from("cotizaciones").update({ [c]: valor.trim() } as never).eq("id", cot.id);
    if (error) return;
    await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    await qc.invalidateQueries({ queryKey: ["cotizacion"] });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  }

  return (
    <VentanaFlotante titulo="Condiciones de la propuesta" subtitulo="Se guarda al salir de cada campo" abierta={abierta} onCerrar={onCerrar} ancho="max-w-6xl" superpuesta>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {BLOQUES.map(({ campo, titulo, icono: Icono }) => {
            const n = puntosCondicion(textos[campo]).length;
            return (
              <div key={campo} className="flex flex-col rounded-lg border border-line bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Icono size={16} className="text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink">{titulo}</span>
                  {!textos[campo].trim() && (
                    <button type="button" className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      onClick={() => { setTextos((t) => ({ ...t, [campo]: SUGERIDOS[campo] })); void guardar(campo, SUGERIDOS[campo]); }}>
                      <Sparkles size={12} /> Usar texto sugerido
                    </button>
                  )}
                </div>
                <textarea
                  value={textos[campo]}
                  rows={Math.max(4, textos[campo].split("\n").length + 1)}
                  placeholder="Escribe un punto por línea"
                  onChange={(e) => setTextos((t) => ({ ...t, [campo]: e.target.value }))}
                  onBlur={(e) => void guardar(campo, e.target.value)}
                  className="w-full resize-none overflow-hidden rounded-md border border-line bg-background px-2 py-1.5 text-[13px] leading-snug text-ink outline-none focus:border-primary"
                />
                <span className="mt-1 text-[11px] text-muted-foreground">Una línea = un punto · {n} {n === 1 ? "punto" : "puntos"}</span>
              </div>
            );
          })}
        </div>
        <aside className="rounded-lg border border-line bg-background p-3 text-[11px] leading-snug text-ink">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Así se imprimirá</div>
          <div className="font-bold uppercase">Términos y condiciones</div>
          {BLOQUES.filter((b) => textos[b.campo].trim()).map((b) => (
            <div key={b.campo} className="mt-1.5">
              <b>{b.titulo}:</b>
              <ul className="ml-4 list-disc">{puntosCondicion(textos[b.campo]).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          ))}
          {BLOQUES.every((b) => !textos[b.campo].trim()) && <p className="mt-2 text-muted-foreground">Sin condiciones registradas.</p>}
        </aside>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {guardado && <span className="inline-flex items-center gap-1 text-xs text-good"><Check size={14} /> Guardado</span>}
        <Boton type="button" onClick={onCerrar}>Cerrar</Boton>
      </div>
    </VentanaFlotante>
  );
}

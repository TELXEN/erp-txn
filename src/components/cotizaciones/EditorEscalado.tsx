import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useRecordado } from "@/lib/recordado";

/** Hoja A4 (794 px) ampliada al ancho disponible con zoom CSS: textos más grandes, misma maqueta que la impresión. */
export function LienzoEscalado({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setZoom(Math.min(2, Math.max(1, (e.contentRect.width - 24) / 794))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-auto py-3">
      <div style={{ width: 794, zoom, margin: "0 auto" }} className="shadow-lg">{children}</div>
    </div>
  );
}

/** Panel flotante acoplado a la derecha para el APU de la partida seleccionada; ancho arrastrable y recordado. */
export function PanelLateralApu({ children, onCerrar }: { children: ReactNode; onCerrar: () => void }) {
  const [ancho, setAncho] = useRecordado<number>("cotizacion-apu-ancho", 620);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCerrar]);
  const arrastrar = (e: React.PointerEvent) => {
    const x0 = e.clientX, a0 = ancho;
    const mover = (ev: PointerEvent) => setAncho(Math.min(window.innerWidth - 200, Math.max(380, a0 + x0 - ev.clientX)));
    const fin = () => { window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", fin); };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", fin);
  };
  return (
    <aside style={{ width: ancho }} className="absolute inset-y-0 right-0 z-30 flex flex-col overflow-hidden border-l border-line bg-card shadow-2xl animate-in slide-in-from-right">
      <div onPointerDown={arrastrar} className="absolute inset-y-0 left-0 w-1.5 cursor-col-resize hover:bg-primary/30" />
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="text-xs font-semibold text-ink">Análisis de precios unitarios</span>
        <button type="button" onClick={onCerrar} aria-label="Cerrar APU" className="grid h-6 w-6 place-items-center rounded border border-line hover:bg-muted"><X size={14} /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </aside>
  );
}

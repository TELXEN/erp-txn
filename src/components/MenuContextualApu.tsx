import { useEffect, useRef } from "react";
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, ListPlus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export type AccionApu = "encima" | "debajo" | "final" | "subir" | "bajar" | "eliminar";

export type EstadoMenuApu = { x: number; y: number; habilitadas: Partial<Record<AccionApu, boolean>> };

const OPCIONES: [AccionApu, string, ReactNode][] = [
  ["encima", "Agregar insumo encima", <ArrowUpToLine key="a" size={14} />],
  ["debajo", "Agregar insumo debajo", <ArrowDownToLine key="b" size={14} />],
  ["final", "Agregar insumo al final", <ListPlus key="c" size={14} />],
  ["subir", "Subir", <ArrowUp key="d" size={14} />],
  ["bajar", "Bajar", <ArrowDown key="e" size={14} />],
  ["eliminar", "Eliminar", <Trash2 key="f" size={14} />],
];

/** Menú de clic derecho de la grilla APU (Banco APU y cotizaciones). */
export function MenuContextualApu({ menu, onAccion, onCerrar }: { menu: EstadoMenuApu; onAccion: (a: AccionApu) => void; onCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cerrar = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("scroll", onCerrar, true);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", cerrar); document.removeEventListener("scroll", onCerrar, true); document.removeEventListener("keydown", tecla); };
  }, [onCerrar]);
  const x = Math.min(menu.x, window.innerWidth - 220);
  const y = Math.min(menu.y, window.innerHeight - 230);
  return (
    <div ref={ref} role="menu" style={{ left: x, top: y }} className="fixed z-50 w-52 rounded-md border border-line bg-popover py-1 text-[12px] text-popover-foreground shadow-lg">
      {OPCIONES.map(([a, texto, icono]) => {
        const ok = Boolean(menu.habilitadas[a]);
        return (
          <div key={a}>
            {a === "subir" || a === "eliminar" ? <div className="my-1 border-t border-line" /> : null}
            <button type="button" role="menuitem" disabled={!ok}
              onClick={() => { onCerrar(); onAccion(a); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${a === "eliminar" ? "text-bad hover:bg-bad/10" : "hover:bg-primary/10"}`}>
              <span className="shrink-0">{icono}</span>{texto}
            </button>
          </div>
        );
      })}
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { SITUACIONES, tonoSituacion } from "@/lib/configuracion";
import { nombresEstados, useEstadosProyecto } from "@/lib/datos";

export type TarjetaKanban = {
  id: string;
  situacion: string;
  contenido: ReactNode;
};

export function Kanban({
  tarjetas,
  onMover,
  editable = true,
}: {
  tarjetas: TarjetaKanban[];
  onMover: (id: string, situacion: string) => void;
  editable?: boolean;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const { data: estados } = useEstadosProyecto();
  const columnas = nombresEstados(estados).length ? nombresEstados(estados) : SITUACIONES;
  const visibles = estados?.length ? estados.filter((e) => e.activo).map((e) => e.nombre) : columnas;

  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
      {visibles.map((col) => {
        const tono = tonoSituacion(col);
        const items = tarjetas.filter((t) => (t.situacion || visibles[0]) === col);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              if (!editable) return;
              e.preventDefault();
              setSobre(col);
            }}
            onDragLeave={() => setSobre((s) => (s === col ? null : s))}
            onDrop={() => {
              setSobre(null);
              if (editable && arrastrando) onMover(arrastrando, col);
              setArrastrando(null);
            }}
            className={`rounded-md border transition-colors ${sobre === col ? "ring-2 ring-primary/40" : ""}`}
            style={{ borderColor: tono.borde, backgroundColor: `${tono.fondo}55` }}
          >
            <div
              className="flex items-center justify-between rounded-t-md border-b px-3 py-2"
              style={{ backgroundColor: tono.fondo, borderColor: tono.borde, color: "#16161a" }}
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">{col}</span>
              <span className="font-mono text-[10px]">{items.length}</span>
            </div>
            <div className="min-h-24 space-y-2 p-2">
              {items.length === 0 ? (
                <p className="px-1 py-4 text-center font-mono text-[10px] text-muted-foreground">Sin registros</p>
              ) : (
                items.map((t) => (
                  <article
                    key={t.id}
                    draggable={editable}
                    onDragStart={() => setArrastrando(t.id)}
                    onDragEnd={() => setArrastrando(null)}
                    className={`rounded-md border border-line bg-card p-2.5 shadow-sm ${
                      editable ? "cursor-grab active:cursor-grabbing" : ""
                    } ${arrastrando === t.id ? "opacity-50" : ""}`}
                  >
                    {t.contenido}
                    {editable && (
                      <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                        {visibles.filter((s) => s !== col).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onMover(t.id, s)}
                            className="rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase"
                            style={{
                              backgroundColor: tonoSituacion(s).fondo,
                              borderColor: tonoSituacion(s).borde,
                              color: "#16161a",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useMemo } from "react";
import { soles } from "@/lib/format";
import { useCostoObras } from "@/lib/costo-obra";
import { useCategoriasGastoGeneral, useGastosGenerales } from "@/lib/datos";
import { claveNombre } from "@/lib/formato-texto";

/** Gasto general real de la obra por categoría (staff de planilla + gastos registrados), en dos columnas compactas. */
export function DesgloseGg({ proyectoId, base }: { proyectoId?: string | null; base: number }) {
  const { costoDe } = useCostoObras();
  const { data: gastos = [] } = useGastosGenerales();
  const { data: categorias = [] } = useCategoriasGastoGeneral();

  const filas = useMemo(() => {
    if (!proyectoId) return [];
    const m = new Map<string, { nombre: string; real: number }>();
    categorias.forEach((c) => m.set(claveNombre(c.nombre), { nombre: c.nombre, real: 0 }));
    gastos.filter((g) => g.proyecto_id === proyectoId).forEach((g) => {
      const k = claveNombre(g.categoria || "Sin categoría");
      const f = m.get(k) ?? { nombre: g.categoria || "Sin categoría", real: 0 };
      f.real += Number(g.monto_soles);
      m.set(k, f);
    });
    return [{ nombre: "Personal staff (planilla)", real: costoDe(proyectoId).staff }, ...m.values()];
  }, [proyectoId, gastos, categorias, costoDe]);

  if (!proyectoId) return null;
  const real = filas.reduce((s, f) => s + f.real, 0);
  const saldo = base - real;
  const pctTotal = base > 0 ? (real / base) * 100 : real > 0 ? 100 : 0;
  const nivel = real > base + 0.005 ? "bad" : pctTotal >= 85 ? "warn" : "good";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-card">
      <div className="border-b border-line px-3 py-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink">Desglose de gastos generales</p>
        <p className="text-[10px] text-muted-foreground">Gasto real por categoría y su peso sobre el GG presupuestado de la obra</p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
        {[0, 1].map((col) => {
          const mitad = Math.ceil(filas.length / 2);
          return (
            <div key={col} className="min-h-0 overflow-y-auto divide-y divide-line">
              {filas.slice(col ? mitad : 0, col ? undefined : mitad).map((f) => {
                const pct = base > 0 ? (f.real / base) * 100 : 0;
                return (
                  <div key={f.nombre} className="grid grid-cols-12 items-center gap-2 px-3 py-1.5 text-xs">
                    <p className="col-span-7 flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${f.real > 0 ? "bg-primary" : "bg-muted"}`} />
                      <span className="truncate">{f.nombre}</span>
                    </p>
                    <p className="col-span-2 text-right tabular-nums text-muted-foreground">{soles(f.real)}</p>
                    <div className="col-span-3 flex items-center gap-1">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-12 items-center gap-2 border-t border-line bg-muted/40 px-3 py-1.5 text-xs font-semibold">
        <p className="col-span-12 flex items-center gap-1.5 text-ink sm:col-span-7"><span className={`h-2 w-2 rounded-full bg-${nivel}`} />Total gastos generales</p>
        <p className="col-span-4 text-right tabular-nums sm:col-span-2">Base {soles(base)}</p>
        <p className={`col-span-4 text-right tabular-nums sm:col-span-2 ${saldo < 0 ? "text-bad" : "text-ink"}`}>Real {soles(real)} · {saldo < 0 ? `excedes ${soles(Math.abs(saldo))}` : `te quedan ${soles(saldo)}`}</p>
        <div className="col-span-4 flex items-center justify-end gap-1 sm:col-span-3">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full bg-${nivel}`} style={{ width: `${Math.min(100, pctTotal)}%` }} /></div>
          <span className={`shrink-0 text-right text-[10px] tabular-nums text-${nivel}`}>{pctTotal.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

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
      <div className="border-b border-line px-3 py-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink">Desglose de gastos generales</p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
        {[0, 1].map((col) => {
          const mitad = Math.ceil(filas.length / 2);
          return (
            <div key={col} className="min-h-0 overflow-y-auto divide-y divide-line">
              {filas.slice(col ? mitad : 0, col ? undefined : mitad).map((f) => {
                const pct = base > 0 ? (f.real / base) * 100 : 0;
                return (
                  <div key={f.nombre} className="grid grid-cols-12 items-center gap-1.5 px-3 py-1.5 text-xs">
                    <p className="col-span-6 flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${f.real > 0 ? "bg-primary" : "bg-muted"}`} />
                      <span className="truncate">{f.nombre}</span>
                    </p>
                    <p className="col-span-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{soles(f.real)}</p>
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
      <div className="grid grid-cols-12 items-center gap-1.5 border-t border-line bg-muted/40 px-3 py-1.5 text-xs font-semibold">
        <p className="col-span-3 flex min-w-0 items-center gap-1.5 text-ink"><span className={`h-2 w-2 shrink-0 rounded-full bg-${nivel}`} /><span className="truncate">Total gastos generales</span></p>
        <div className="col-span-2 text-right"><p className="text-[9px] uppercase text-muted-foreground">Base</p><p className="whitespace-nowrap tabular-nums">{soles(base)}</p></div>
        <div className="col-span-2 text-right"><p className="text-[9px] uppercase text-muted-foreground">Real</p><p className="whitespace-nowrap tabular-nums">{soles(real)}</p></div>
        <div className="col-span-2 text-right"><p className="text-[9px] uppercase text-muted-foreground">Te quedan</p><p className={`whitespace-nowrap tabular-nums ${saldo < 0 ? "text-bad" : "text-ink"}`}>{soles(saldo)}</p></div>
        <div className="col-span-3 flex items-center gap-1">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full bg-${nivel}`} style={{ width: `${Math.min(100, pctTotal)}%` }} /></div>
          <span className={`shrink-0 text-right text-[10px] tabular-nums text-${nivel}`}>{pctTotal.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

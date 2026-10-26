import { useMemo } from "react";
import { soles } from "@/lib/format";
import { useCostoObras } from "@/lib/costo-obra";
import { useCategoriasGastoGeneral, useGastosGenerales } from "@/lib/datos";
import { claveNombre } from "@/lib/formato-texto";

/** Gasto general real de la obra por categoría (staff de planilla + gastos registrados), en dos columnas. */
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
    <div className="rounded-md border border-line bg-card">
      <div className="border-b border-line px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink">Desglose de gastos generales</p>
        <p className="text-[10px] text-muted-foreground">Gasto real por categoría y su peso sobre el GG presupuestado de la obra</p>
      </div>
      <div className="grid md:grid-cols-2 md:divide-x divide-line">
        {[0, 1].map((col) => {
          const mitad = Math.ceil(filas.length / 2);
          return (
            <div key={col} className="divide-y divide-line">
              {filas.slice(col ? mitad : 0, col ? undefined : mitad).map((f) => {
                const pct = base > 0 ? (f.real / base) * 100 : 0;
                return (
                  <div key={f.nombre} className="grid grid-cols-12 items-center gap-2 px-4 py-2 text-xs">
                    <p className="col-span-6 flex items-center gap-1.5 font-semibold text-ink">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${f.real > 0 ? "bg-primary" : "bg-muted"}`} />{f.nombre}
                    </p>
                    <div className="col-span-3 text-right tabular-nums"><p className="text-[9px] uppercase text-muted-foreground">Real</p>{soles(f.real)}</div>
                    <div className="col-span-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{pct.toFixed(1)}% del GG</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-12 items-center gap-2 border-t border-line bg-muted/40 px-4 py-2 text-xs font-semibold">
        <p className="col-span-12 sm:col-span-4 flex items-center gap-1.5 text-ink"><span className={`h-2 w-2 rounded-full bg-${nivel}`} />Total gastos generales</p>
        <div className="col-span-4 sm:col-span-2 text-right tabular-nums"><p className="text-[9px] uppercase text-muted-foreground">Base</p>{soles(base)}</div>
        <div className="col-span-4 sm:col-span-2 text-right tabular-nums"><p className="text-[9px] uppercase text-muted-foreground">Real</p>{soles(real)}</div>
        <div className={`col-span-4 sm:col-span-2 text-right tabular-nums ${saldo < 0 ? "text-bad" : "text-ink"}`}><p className="text-[9px] uppercase text-muted-foreground">Te quedan</p>{soles(saldo)}</div>
        <div className="col-span-12 sm:col-span-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full bg-${nivel}`} style={{ width: `${Math.min(100, pctTotal)}%` }} /></div>
          <p className={`mt-0.5 text-right text-[10px] text-${nivel}`}>{pctTotal.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

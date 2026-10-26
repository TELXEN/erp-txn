import { soles } from "@/lib/format";
import { useDesgloseCd } from "@/lib/sobrecosto";

const nivel = (real: number, base: number) =>
  real > base + 0.005 ? "bad" : (base > 0 ? real / base : real > 0 ? 1 : 0) >= 0.85 ? "warn" : "good";

const ORIGEN: Record<string, string> = {
  MAT: "compras de materiales",
  MO: "tareo de obreros (sin staff)",
  EQ: "compras de equipos y flota",
  HT: "% de la mano de obra presupuestada",
  SC: "compras de subcontratos",
};

/** Presupuesto vs real por rubro del costo directo, con semáforo. Filas compactas de una línea. */
export function DesgloseCd({ proyectoId }: { proyectoId?: string | null }) {
  const filas = useDesgloseCd(proyectoId);
  if (!proyectoId) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-card">
      <div className="border-b border-line px-3 py-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink">Desglose del costo directo</p>
        <p className="text-[10px] text-muted-foreground">Cada rubro se compara solo con su propio gasto real</p>
      </div>
      <div className="grid grid-cols-12 gap-2 border-b border-line bg-muted/40 px-3 py-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="col-span-4">Rubro</span>
        <span className="col-span-2 text-right">Base</span>
        <span className="col-span-2 text-right">Real</span>
        <span className="col-span-2 text-right">Te quedan</span>
        <span className="col-span-2 text-right">Consumo</span>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {filas.map((f) => {
          const n = nivel(f.real, f.base);
          const pct = f.base > 0 ? (f.real / f.base) * 100 : f.real > 0 ? 100 : 0;
          const saldo = f.base - f.real;
          return (
            <div key={f.clave} className="grid grid-cols-12 items-center gap-2 px-3 py-1.5 text-xs">
              <p className="col-span-4 flex min-w-0 items-center gap-1.5 font-semibold text-ink" title={`Real: ${ORIGEN[f.clave] ?? ""}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full bg-${n}`} />
                <span className="truncate">{f.nombre}</span>
              </p>
              <p className="col-span-2 text-right tabular-nums text-muted-foreground">{soles(f.base)}</p>
              <p className={`col-span-2 text-right tabular-nums ${saldo < 0 ? "font-semibold text-bad" : "text-ink"}`}>{soles(f.real)}</p>
              <p className={`col-span-2 text-right tabular-nums ${saldo < 0 ? "font-semibold text-bad" : "text-ink"}`}>{soles(saldo)}</p>
              <div className="col-span-2 flex items-center gap-1">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full bg-${n}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <span className={`shrink-0 text-right text-[10px] tabular-nums text-${n}`}>{pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

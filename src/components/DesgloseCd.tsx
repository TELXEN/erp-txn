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

/** Presupuesto vs real por rubro del costo directo, con semáforo. */
export function DesgloseCd({ proyectoId }: { proyectoId?: string | null }) {
  const filas = useDesgloseCd(proyectoId);
  if (!proyectoId) return null;
  return (
    <div className="rounded-md border border-line bg-card">
      <div className="border-b border-line px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink">Desglose del costo directo</p>
        <p className="text-[10px] text-muted-foreground">Cada rubro se compara solo con su propio gasto real</p>
      </div>
      <div className="divide-y divide-line">
        {filas.map((f) => {
          const n = nivel(f.real, f.base);
          const pct = f.base > 0 ? (f.real / f.base) * 100 : f.real > 0 ? 100 : 0;
          const saldo = f.base - f.real;
          return (
            <div key={f.clave} className="grid grid-cols-12 items-center gap-2 px-4 py-2 text-xs">
              <div className="col-span-12 sm:col-span-4">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  <span className={`h-2 w-2 rounded-full bg-${n}`} />{f.nombre}
                </p>
                <p className="text-[10px] text-muted-foreground">Real: {ORIGEN[f.clave]}</p>
              </div>
              <div className="col-span-4 sm:col-span-2 text-right tabular-nums"><p className="text-[9px] uppercase text-muted-foreground">Base</p>{soles(f.base)}</div>
              <div className="col-span-4 sm:col-span-2 text-right tabular-nums"><p className="text-[9px] uppercase text-muted-foreground">Real</p>{soles(f.real)}</div>
              <div className={`col-span-4 sm:col-span-2 text-right tabular-nums ${saldo < 0 ? "text-bad font-semibold" : "text-ink"}`}><p className="text-[9px] uppercase text-muted-foreground">Te quedan</p>{soles(saldo)}</div>
              <div className="col-span-12 sm:col-span-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full bg-${n}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className={`mt-0.5 text-right text-[10px] text-${n}`}>{pct.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

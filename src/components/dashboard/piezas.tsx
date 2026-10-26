import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { pct, soles, solesPunto } from "@/lib/format";

/** Piezas visuales compartidas por los dashboards (mismo lenguaje que el Dashboard de Proyectos). */

export function FajoBilletes({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3.5" width="16" height="9" rx="2" opacity=".4" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 8h16a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 21 18H5a2.5 2.5 0 0 1-2.5-2.5v-5A2.5 2.5 0 0 1 5 8Zm7 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-6.6.8h2.2v4.4H5.4v-4.4Zm11 0h2.2v4.4h-2.2v-4.4Z"
      />
    </svg>
  );
}

export function nivelConsumo(real: number, base: number): "ok" | "cerca" | "excedido" {
  if (real > base + 0.005) return "excedido";
  const p = base > 0 ? (real / base) * 100 : real > 0 ? 100 : 0;
  return p >= 85 ? "cerca" : "ok";
}

export function FilaSemaforo({ etiqueta, real, base }: { etiqueta: string; real: number; base: number }) {
  const nivel = nivelConsumo(real, base);
  const p = base > 0 ? (real / base) * 100 : real > 0 ? 100 : 0;
  const punto = nivel === "excedido" ? "bg-bad" : nivel === "cerca" ? "bg-warn" : "bg-good";
  const pildora = nivel === "excedido" ? "bg-bad/10 text-bad" : nivel === "cerca" ? "bg-warn/10 text-warn" : "bg-good/10 text-good";
  return (
    <>
      <span className="flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punto}`} />
        {etiqueta}
      </span>
      <span title={`Real: ${solesPunto(real)}`} className="border-l border-line pl-2 text-right font-mono text-xs tabular-nums text-ink">{solesPunto(real)}</span>
      <span title={`Presupuestado: ${solesPunto(base)}`} className="border-l border-line pl-2 text-right font-mono text-xs tabular-nums text-muted-foreground">{solesPunto(base)}</span>
      <span className="border-l border-line pl-2 text-right">
        <span title="% usado" className={`rounded-full px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums ${pildora}`}>{pct(p)}</span>
      </span>
    </>
  );
}

export function Anillo({ valor, alerta, rotulo = "gastado" }: { valor: number; alerta?: boolean; rotulo?: string }) {
  const v = Math.min(Math.max(valor, 0), 100);
  const r = 50;
  const c = 2 * Math.PI * r;
  const tono = alerta || valor > 100 ? "text-bad" : valor >= 85 ? "text-warn" : "text-good";
  return (
    <div className={`relative h-24 w-24 shrink-0 ${tono}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-semibold leading-none">{pct(valor)}</span>
        <span className="text-[8px] uppercase tracking-wide opacity-80">{rotulo}</span>
      </span>
      {alerta && <AlertTriangle size={14} className="absolute -right-1 -top-1 rounded-full bg-warn p-0.5 text-warn-foreground" />}
    </div>
  );
}

export function TarjetaKpi({
  icono,
  tono,
  etiqueta,
  valor,
  claseValor = "text-ink",
  lineas,
  insignia,
}: {
  icono: ReactNode;
  tono: "good" | "warn" | "bad" | "primary";
  etiqueta: string;
  valor: string;
  claseValor?: string;
  lineas: string[];
  insignia?: ReactNode;
}) {
  return (
    <div className="dash-tarjeta flex min-w-0 flex-col px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="dash-icono dash-icono-sm dash-icono-suave" data-tono={tono}>{icono}</span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        {insignia}
      </div>
      <p className={`mt-1.5 font-mono text-xl font-semibold leading-tight tabular-nums ${claseValor}`}>{valor}</p>
      <div className="mt-1.5 space-y-0.5 border-t border-line pt-1.5">
        {lineas.map((l) => (
          <p key={l} title={l} className="truncate text-[10.5px] leading-snug tabular-nums text-muted-foreground">{l}</p>
        ))}
      </div>
    </div>
  );
}

export function DonaLeyenda({
  datos,
  centro,
  vacio,
}: {
  datos: { nombre: string; valor: number; porcentaje: number; color: string }[];
  centro: string;
  vacio: string;
}) {
  if (datos.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">{vacio}</p>;
  const total = datos.reduce((s, c) => s + c.valor, 0);
  return (
    <div className="flex min-h-0 flex-1 items-center gap-3">
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
              {datos.map((c) => <Cell key={c.nombre} fill={c.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => soles(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[8px] uppercase tracking-wide text-muted-foreground">{centro}</span>
          <span className="font-mono text-[10px] font-semibold text-ink">{soles(total)}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: "7.5rem" }}>
        {datos.map((c) => (
          <li key={c.nombre} className="flex items-center gap-1.5 text-[11px] leading-tight">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c.color }} />
            <span className="min-w-0 flex-1 truncate" title={c.nombre}>{c.nombre}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{pct(c.porcentaje)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

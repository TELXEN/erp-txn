import { useMemo } from "react";
import { InfoTooltip } from "@/components/ui-kit";
import { soles } from "@/lib/format";


export type Movimiento = { fecha: string; monto: number };

function inicioMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function etiquetaMes(d: Date) {
  return d.toLocaleDateString("es-PE", { month: "short", year: "2-digit" }).replace(".", "");
}

/** Curva S programada: avance acumulado teórico (smoothstep) entre inicio y fin. */
function programado(t: number) {
  const x = Math.min(Math.max(t, 0), 1);
  return (3 * x * x - 2 * x * x * x) * 100;
}

export function CurvaS({
  fechaInicio,
  fechaFin,
  presupuesto,
  avanceFisico,
  movimientos,
}: {
  fechaInicio: string | null;
  fechaFin: string | null;
  presupuesto: number;
  avanceFisico: number;
  movimientos: Movimiento[];
}) {
  const datos = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    const ini = inicioMes(new Date(`${fechaInicio}T00:00:00`));
    const fin = inicioMes(new Date(`${fechaFin}T00:00:00`));
    if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime()) || fin < ini) return null;

    const meses: Date[] = [];
    const cursor = new Date(ini);
    while (cursor <= fin && meses.length < 120) {
      meses.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (meses.length < 2) meses.push(new Date(fin.getFullYear(), fin.getMonth() + 1, 1));

    const hoy = new Date();
    const total = meses.length - 1;

    const gastos = movimientos
      .map((m) => ({ fecha: new Date(`${m.fecha}T00:00:00`), monto: Number(m.monto) || 0 }))
      .filter((m) => !Number.isNaN(m.fecha.getTime()));

    let acumulado = 0;
    const puntos = meses.map((mes, i) => {
      const cierre = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59);
      acumulado = gastos.filter((g) => g.fecha <= cierre).reduce((s, g) => s + g.monto, 0);
      const vencido = cierre <= hoy;
      return {
        etiqueta: etiquetaMes(mes),
        prog: programado(total > 0 ? i / total : 1),
        real: vencido && presupuesto > 0 ? (acumulado / presupuesto) * 100 : null,
        soles: vencido ? acumulado : null,
      };
    });

    const ultimoReal = [...puntos].reverse().find((p) => p.real !== null);
    const idxHoy = puntos.reduce((acc, p, i) => (p.real !== null ? i : acc), 0);
    const progHoy = puntos[idxHoy]?.prog ?? 0;

    return {
      puntos,
      gastadoPct: ultimoReal?.real ?? 0,
      gastadoSoles: ultimoReal?.soles ?? 0,
      progHoy,
      spi: progHoy > 0 ? avanceFisico / progHoy : 0,
      cpi: (ultimoReal?.real ?? 0) > 0 ? avanceFisico / (ultimoReal?.real ?? 1) : 0,
    };
  }, [fechaInicio, fechaFin, presupuesto, avanceFisico, movimientos]);

  if (!datos) {
    return (
      <p className="px-5 py-8 text-center font-mono text-xs text-muted-foreground">
        Registra la fecha de inicio y la fecha de fin de la obra en Proyectos para generar la curva S.
      </p>
    );
  }

  const W = 720;
  const H = 260;
  const P = { t: 14, r: 16, b: 34, l: 40 };
  const n = datos.puntos.length - 1;
  const x = (i: number) => P.l + (n > 0 ? (i / n) * (W - P.l - P.r) : 0);
  const y = (v: number) => P.t + (1 - Math.min(v, 120) / 120) * (H - P.t - P.b);

  const lineaProg = datos.puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.prog)}`).join(" ");
  const realPts = datos.puntos.map((p, i) => ({ p, i })).filter((d) => d.p.real !== null);
  const lineaReal = realPts.map((d, k) => `${k === 0 ? "M" : "L"}${x(d.i)},${y(d.p.real as number)}`).join(" ");

  const atrasado = avanceFisico < datos.progHoy;

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Mini etiqueta="Avance programado a hoy" valor={`${datos.progHoy.toFixed(1)} %`} />
        <Mini etiqueta="Avance físico real" valor={`${avanceFisico.toFixed(1)} %`} tono={atrasado ? "bad" : "good"} />
        <Mini etiqueta="Costo acumulado" valor={soles(datos.gastadoSoles)} />
        <Mini
          etiqueta={
            <span className="inline-flex items-center">
              SPI / CPI
              <InfoTooltip
                content={
                  <span>
                    <strong>SPI</strong> = avance físico real ÷ avance programado a hoy. {" "}
                    <em>{"">1</em> = adelanto; <em>{"<"}1</em> = retraso.
                    <br />
                    <strong>CPI</strong> = avance físico real ÷ % de presupuesto gastado. {" "}
                    <em>{"">1</em> = ahorro; <em>{"<"}1</em> = sobrecosto.
                  </span>
                }
              />
            </span>
          }
          valor={`${datos.spi.toFixed(2)} / ${datos.cpi.toFixed(2)}`}
          tono={datos.spi < 1 || datos.cpi < 1 ? "bad" : "good"}
        />

      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full">
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} />
              <text x={P.l - 6} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {v}%
              </text>
            </g>
          ))}
          {datos.puntos.map((p, i) =>
            i % Math.ceil(datos.puntos.length / 12) === 0 ? (
              <text key={p.etiqueta + i} x={x(i)} y={H - 12} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {p.etiqueta}
              </text>
            ) : null,
          )}
          <path d={lineaProg} fill="none" className="stroke-primary" strokeWidth={2} strokeDasharray="5 4" />
          {realPts.length > 0 && (
            <path d={lineaReal} fill="none" className={atrasado ? "stroke-bad" : "stroke-good"} strokeWidth={2.5} />
          )}
          {realPts.map((d) => (
            <circle
              key={d.i}
              cx={x(d.i)}
              cy={y(d.p.real as number)}
              r={2.5}
              className={atrasado ? "fill-bad" : "fill-good"}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-6 bg-primary" /> Curva programada (plan)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-0.5 w-6 ${atrasado ? "bg-bad" : "bg-good"}`} /> Ejecución real (costo acumulado / presupuesto)
        </span>
      </div>
    </div>
  );
}

function Mini({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: "good" | "bad" }) {
  return (
    <div className="rounded-md border border-line bg-card px-3 py-2">
      <p className="label-mono">{etiqueta}</p>
      <p
        className={`mt-1 font-mono text-sm font-semibold ${
          tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-ink"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

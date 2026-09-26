import { useMemo, type ReactNode } from "react";
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
  presupuestoContractual,
  adicionales,
  avanceFisico,
  avanceProgramadoOficial,
  fechaCorteProgramado,
  movimientos,
}: {
  fechaInicio: string | null;
  fechaFin: string | null;
  presupuesto: number;
  presupuestoContractual: number;
  adicionales: number;
  avanceFisico: number;
  avanceProgramadoOficial: number | null;
  fechaCorteProgramado: string | null;
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

    const iniReal = new Date(`${fechaInicio}T00:00:00`);
    const finReal = new Date(`${fechaFin}T23:59:59`);
    const plazo = finReal.getTime() - iniReal.getTime();
    const transcurrido = hoy.getTime() - iniReal.getTime();
    const progHoy = plazo > 0 ? programado(transcurrido / plazo) : hoy >= finReal ? 100 : 0;

    const gastos = movimientos
      .map((m) => ({ fecha: new Date(`${m.fecha}T00:00:00`), monto: Number(m.monto) || 0 }))
      .filter((m) => !Number.isNaN(m.fecha.getTime()));

    let acumulado = 0;
    const puntos = meses.map((mes, i) => {
      const cierre = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59);
      acumulado = gastos.filter((g) => g.fecha <= cierre).reduce((s, g) => s + g.monto, 0);
      // El mes en curso también se dibuja, con lo acumulado hasta hoy.
      const iniciado = mes <= hoy;
      return {
        etiqueta: etiquetaMes(mes),
        prog: programado(total > 0 ? i / total : 1),
        real: iniciado && presupuesto > 0 ? (acumulado / presupuesto) * 100 : null,
        soles: iniciado ? acumulado : null,
      };
    });

    const ultimoReal = [...puntos].reverse().find((p) => p.real !== null);

    return {
      puntos,
      gastadoPct: ultimoReal?.real ?? 0,
      gastadoSoles: ultimoReal?.soles ?? 0,
      progHoy,
      spi: (avanceProgramadoOficial ?? 0) > 0 ? avanceFisico / Number(avanceProgramadoOficial) : 0,
      cpi: (ultimoReal?.real ?? 0) > 0 ? avanceFisico / (ultimoReal?.real ?? 1) : 0,
    };
  }, [fechaInicio, fechaFin, presupuesto, avanceFisico, avanceProgramadoOficial, movimientos]);


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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini
          etiqueta={fechaCorteProgramado ? `Avance programado oficial · ${fechaCorteProgramado}` : "Avance programado oficial"}
          valor={avanceProgramadoOficial === null ? "Sin registro" : `${avanceProgramadoOficial.toFixed(1)} %`}
        />
        <Mini etiqueta="Avance físico real" valor={`${avanceFisico.toFixed(1)} %`} tono={atrasado ? "bad" : "good"} />
        <Mini etiqueta="Costo acumulado" valor={soles(datos.gastadoSoles)} />
        <Mini
          etiqueta={
            <span className="inline-flex items-center">
              SPI / CPI
              <InfoTooltip
                content={
                  <span>
                    <strong>SPI</strong> = avance físico real ÷ avance programado oficial.{" "}
                    <em>{"\u003e 1"}</em> = adelanto; <em>{"< 1"}</em> = retraso.
                    <br />
                    <strong>CPI</strong> = avance físico real ÷ % de presupuesto gastado.{" "}
                    <em>{"\u003e 1"}</em> = ahorro; <em>{"< 1"}</em> = sobrecosto.
                  </span>
                }
              />
            </span>
          }
          valor={`${datos.spi.toFixed(2)} / ${datos.cpi.toFixed(2)}`}
          tono={datos.spi < 1 || datos.cpi < 1 ? "bad" : "good"}
        />
      </div>

      <div className="grid overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 sm:gap-px">
        <ReferenciaPresupuesto etiqueta="Presupuesto contractual" valor={presupuestoContractual} />
        <ReferenciaPresupuesto etiqueta="Adicionales de obra" valor={adicionales} destacado={adicionales > 0} />
        <ReferenciaPresupuesto etiqueta="Presupuesto vigente" valor={presupuesto} fuerte />
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
          <span className="h-0.5 w-6 bg-primary" /> Referencia teórica por fechas
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-0.5 w-6 ${atrasado ? "bg-bad" : "bg-good"}`} /> Ejecución real (costo acumulado / presupuesto vigente)
        </span>
      </div>
    </div>
  );
}

function ReferenciaPresupuesto({
  etiqueta,
  valor,
  destacado = false,
  fuerte = false,
}: {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
  fuerte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-card px-4 py-3 sm:block">
      <p className="label-mono">{etiqueta}</p>
      <p className={`font-mono text-sm ${fuerte ? "font-bold text-ink" : destacado ? "font-semibold text-primary" : "text-ink"}`}>
        {soles(valor)}
      </p>
    </div>
  );
}

function Mini({ etiqueta, valor, tono }: { etiqueta: ReactNode; valor: string; tono?: "good" | "bad" }) {
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

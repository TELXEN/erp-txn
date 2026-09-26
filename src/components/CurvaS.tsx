import { useMemo, type ReactNode } from "react";
import { InfoTooltip } from "@/components/ui-kit";
import { fecha, soles } from "@/lib/format";
import {
  generarPeriodos,
  programadoCronograma,
  type CronogramaPartida,
  type Partida,
  type Periodicidad,
} from "@/lib/datos";

export type Movimiento = { fecha: string; monto: number };

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
  partidas,
  cronograma,
  periodicidad,
  mostrarDinero,
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
  partidas: Partida[];
  cronograma: CronogramaPartida[];
  periodicidad: Periodicidad;
  mostrarDinero: boolean;
}) {
  const datos = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    const periodos = generarPeriodos(fechaInicio, fechaFin, periodicidad);
    if (periodos.length === 0) return null;
    const hoy = new Date();
    const hoyTexto = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    const tieneCronograma = cronograma.some(
      (c) => partidas.some((p) => p.id === c.partida_id) && (c.periodicidad ?? "mes") === periodicidad,
    );

    const gastos = movimientos
      .map((m) => ({ fecha: new Date(`${m.fecha}T00:00:00`), monto: Number(m.monto) || 0 }))
      .filter((m) => !Number.isNaN(m.fecha.getTime()));

    const puntos = periodos.map((periodo) => {
      const cierre = new Date(`${periodo.fin}T23:59:59`);
      const acumulado = gastos.filter((g) => g.fecha <= cierre).reduce((s, g) => s + g.monto, 0);
      const iniciado = periodo.inicio <= hoyTexto;
      return {
        etiqueta: periodo.etiqueta,
        fecha: periodo.fin,
        prog: programadoCronograma(partidas, cronograma, periodo.fin, periodicidad) ?? 0,
        costo: iniciado && presupuesto > 0 ? (acumulado / presupuesto) * 100 : null,
        soles: iniciado ? acumulado : null,
      };
    });
    const ultimoCosto = [...puntos].reverse().find((p) => p.costo !== null);
    const indiceHoy = periodos.findIndex((p) => p.inicio <= hoyTexto && hoyTexto <= p.fin);
    const ultimoPeriodo = periodos.at(-1);
    const indiceCorte = indiceHoy >= 0 ? indiceHoy : ultimoPeriodo && hoyTexto > ultimoPeriodo.fin ? periodos.length - 1 : 0;
    const programadoHoy = programadoCronograma(partidas, cronograma, hoyTexto, periodicidad) ?? avanceProgramadoOficial ?? 0;

    return {
      puntos,
      tieneCronograma,
      indiceCorte,
      gastadoPct: ultimoCosto?.costo ?? 0,
      gastadoSoles: ultimoCosto?.soles ?? 0,
      programadoHoy,
      spi: programadoHoy > 0 ? avanceFisico / programadoHoy : 0,
      cpi: (ultimoCosto?.costo ?? 0) > 0 ? avanceFisico / (ultimoCosto?.costo ?? 1) : 0,
    };
  }, [fechaInicio, fechaFin, periodicidad, cronograma, partidas, presupuesto, avanceFisico, avanceProgramadoOficial, movimientos]);


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
  const costoPts = datos.puntos.map((p, i) => ({ p, i })).filter((d) => d.p.costo !== null);
  const lineaCosto = costoPts.map((d, k) => `${k === 0 ? "M" : "L"}${x(d.i)},${y(d.p.costo as number)}`).join(" ");

  const atrasado = avanceFisico + 0.05 < datos.programadoHoy;

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini
          etiqueta={datos.tieneCronograma ? `Programado a hoy · ${fecha(new Date().toISOString().slice(0, 10))}` : fechaCorteProgramado ? `Programado oficial · ${fecha(fechaCorteProgramado)}` : "Avance programado"}
          valor={datos.tieneCronograma || avanceProgramadoOficial != null ? `${Number(datos.programadoHoy).toFixed(1)} %` : "Sin registro"}
        />
        <Mini etiqueta="Avance físico real" valor={`${Number(avanceFisico ?? 0).toFixed(1)} %`} tono={atrasado ? "bad" : "good"} />
        <Mini etiqueta="Desviación física" valor={datos.tieneCronograma || avanceProgramadoOficial != null ? `${avanceFisico - datos.programadoHoy >= 0 ? "+" : ""}${(avanceFisico - datos.programadoHoy).toFixed(1)} pp` : "Sin registro"} tono={atrasado ? "bad" : "good"} />
        {mostrarDinero && <Mini etiqueta="Costo acumulado" valor={soles(datos.gastadoSoles)} />}
        <Mini
          etiqueta={
            <span className="inline-flex items-center">
              {mostrarDinero ? "SPI / CPI" : "SPI"}
              <InfoTooltip
                content={
                  <span>
                    <strong>SPI</strong> = avance físico real ÷ avance programado oficial.{" "}
                    <em>{"\u003e 1"}</em> = adelanto; <em>{"< 1"}</em> = retraso.
                    {mostrarDinero && <><br /><strong>CPI</strong> = avance físico real ÷ % de presupuesto gastado. <em>{"\u003e 1"}</em> = ahorro; <em>{"< 1"}</em> = sobrecosto.</>}
                  </span>
                }
              />
            </span>
          }
          valor={mostrarDinero ? `${Number(datos.spi).toFixed(2)} / ${Number(datos.cpi).toFixed(2)}` : Number(datos.spi).toFixed(2)}
          tono={datos.spi < 1 || (mostrarDinero && datos.cpi < 1) ? "bad" : "good"}
        />
      </div>

      {mostrarDinero && <div className="grid overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 sm:gap-px">
        <ReferenciaPresupuesto etiqueta="Presupuesto contractual" valor={presupuestoContractual} />
        <ReferenciaPresupuesto etiqueta="Adicionales de obra" valor={adicionales} destacado={adicionales > 0} />
        <ReferenciaPresupuesto etiqueta="Presupuesto vigente" valor={presupuesto} fuerte />
      </div>}

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
          {datos.tieneCronograma && <path d={lineaProg} fill="none" className="stroke-primary" strokeWidth={2.5} />}
          {mostrarDinero && costoPts.length > 0 && <path d={lineaCosto} fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeDasharray="5 4" />}
          {mostrarDinero && costoPts.map((d) => (
            <circle
              key={d.i}
              cx={x(d.i)}
              cy={y(d.p.costo as number)}
              r={2}
              className="fill-muted-foreground"
            />
          ))}
          <line x1={x(datos.indiceCorte)} x2={x(datos.indiceCorte)} y1={P.t} y2={H - P.b} className="stroke-line" strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={x(datos.indiceCorte)} cy={y(avanceFisico)} r={5} className={atrasado ? "fill-bad" : "fill-good"} />
          <text x={x(datos.indiceCorte)} y={Math.max(P.t + 10, y(avanceFisico) - 9)} textAnchor="middle" className={atrasado ? "fill-bad" : "fill-good"} fontSize={10} fontWeight={700}>{Number(avanceFisico).toFixed(1)}%</text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-6 bg-primary" /> Avance programado acumulado por partidas
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${atrasado ? "bg-bad" : "bg-good"}`} /> Avance físico real al corte
        </span>
        {mostrarDinero && <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dashed border-muted-foreground" /> Costo acumulado / presupuesto vigente</span>}
      </div>
      {!datos.tieneCronograma && <p className="font-mono text-xs text-muted-foreground">Completa el Avance programado de la obra para trazar la línea contractual.</p>}
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

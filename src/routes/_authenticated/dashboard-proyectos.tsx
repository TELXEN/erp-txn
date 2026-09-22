import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarDays, Clock3, Flag, Layers3, ListTodo, MapPin, WalletCards } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { CurvaS } from "@/components/CurvaS";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { SITUACIONES, tonoSituacion } from "@/lib/configuracion";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, pct, soles } from "@/lib/format";
import {
  costoRealProyecto,
  presupuestoProyecto,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
} from "@/lib/datos";
import { exportarExcel, exportarPdf } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/dashboard-proyectos")({
  head: () => ({
    meta: [
      { title: "Dashboard de Proyectos — ERP TELXEN" },
      {
        name: "description",
        content: "Estado, avance físico y desviación de costos de todas las obras en ejecución.",
      },
      { property: "og:title", content: "Dashboard de Proyectos — ERP TELXEN" },
      { property: "og:description", content: "Avance físico y control de costos por obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardProyectos,
});

function DashboardProyectos() {
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const [obraId, setObraId] = useState("");


  const filas = useMemo(
    () =>
      proyectos.map((p) => {
        const propias = partidas.filter((x) => x.proyecto_id === p.id);
        const presupuesto = presupuestoProyecto(p.id, partidas);
        const costoReal = costoRealProyecto(p.id, gastosD, tareos, gastosG);
        const baseAvance = propias.reduce((s, x) => s + Number(x.presupuesto_inicial), 0);
        const avance =
          baseAvance > 0
            ? propias.reduce((s, x) => s + Number(x.avance_pct) * Number(x.presupuesto_inicial), 0) / baseAvance
            : propias.length > 0
              ? propias.reduce((s, x) => s + Number(x.avance_pct), 0) / propias.length
              : 0;
        const gastado = presupuesto > 0 ? (costoReal / presupuesto) * 100 : 0;
        return {
          proyecto: p,
          partidas: propias.length,
          partidasPendientes: propias.filter((x) => x.situacion !== "Completado" && Number(x.avance_pct) < 100).length,
          presupuesto,
          costoReal,
          avance,
          gastado,
          diferencia: presupuesto - costoReal,
          desviado: gastado > avance,
        };
      }),
    [proyectos, partidas, gastosD, gastosG, tareos],
  );

  const resumen = useMemo(() => {
    const presupuesto = filas.reduce((s, f) => s + f.presupuesto, 0);
    const costoReal = filas.reduce((s, f) => s + f.costoReal, 0);
    return {
      total: proyectos.length,
      noIniciados: proyectos.filter((p) => p.situacion === "No iniciado").length,
      enProceso: proyectos.filter((p) => p.situacion === "En proceso").length,
      retrasados: proyectos.filter((p) => p.situacion === "Retrasado").length,
      completados: proyectos.filter((p) => p.situacion === "Completado").length,
      cancelados: proyectos.filter((p) => p.situacion === "Cancelado").length,
      presupuesto,
      costoReal,
      diferencia: presupuesto - costoReal,
      desviadas: filas.filter((f) => f.desviado).length,
    };
  }, [filas, proyectos]);

  const obraSel = filas.find((f) => f.proyecto.id === obraId) ?? filas[0];

  const plazo = useMemo(() => {
    if (!obraSel?.proyecto.fecha_fin) return null;
    const fin = new Date(`${obraSel.proyecto.fecha_fin}T23:59:59`);
    const hoy = new Date();
    const dias = Math.ceil((fin.getTime() - hoy.getTime()) / 86_400_000);
    return { dias, vencido: dias < 0 };
  }, [obraSel]);

  const movimientos = useMemo(() => {
    const id = obraSel?.proyecto.id;
    if (!id) return [];
    return [
      ...gastosD.filter((g) => g.proyecto_id === id).map((g) => ({ fecha: g.fecha, monto: Number(g.monto_soles) })),
      ...gastosG.filter((g) => g.proyecto_id === id).map((g) => ({ fecha: g.fecha, monto: Number(g.monto_soles) })),
      ...tareos.filter((t) => t.proyecto_id === id).map((t) => ({ fecha: t.fecha, monto: Number(t.costo_soles) })),
    ];
  }, [obraSel, gastosD, gastosG, tareos]);


  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function excel() {
    exportarExcel("dashboard-proyectos", [
      {
        nombre: "Resumen",
        filas: [
          { Indicador: "Obras registradas", Valor: resumen.total },
          { Indicador: "No iniciadas", Valor: resumen.noIniciados },
          { Indicador: "En proceso", Valor: resumen.enProceso },
          { Indicador: "Retrasadas", Valor: resumen.retrasados },
          { Indicador: "Completadas", Valor: resumen.completados },
          { Indicador: "Canceladas", Valor: resumen.cancelados },
          { Indicador: "Presupuesto total (S/)", Valor: resumen.presupuesto },
          { Indicador: "Costo real total (S/)", Valor: resumen.costoReal },
          { Indicador: "Diferencia (S/)", Valor: resumen.diferencia },
        ],
      },
      {
        nombre: "Obras",
        filas: filas.map((f) => ({
          Obra: f.proyecto.nombre,
          Cliente: f.proyecto.cliente,
          Status: f.proyecto.situacion,
          Prioridad: f.proyecto.prioridad,
          Partidas: f.partidas,
          "Presupuesto (S/)": f.presupuesto,
          "Costo Real (S/)": f.costoReal,
          "Avance Fisico %": Number(f.avance.toFixed(1)),
          "Presupuesto Gastado %": Number(f.gastado.toFixed(1)),
          "Diferencia (S/)": f.diferencia,
        })),
      },
    ]);
  }

  function pdf() {
    exportarPdf({
      titulo: "Dashboard de Proyectos",
      subtitulo: "Avance físico y control de costos por obra — Moneda base: Soles (PEN)",
      kpis: [
        { etiqueta: "Presupuesto Total", valor: resumen.presupuesto },
        { etiqueta: "Costo Real Total", valor: resumen.costoReal },
        { etiqueta: "Diferencia", valor: resumen.diferencia },
      ],
      barras: filas.map((f) => ({
        partida: f.proyecto.nombre,
        avance: f.avance,
        gastado: f.gastado,
        diferencia: f.diferencia,
      })),
      archivo: "dashboard-proyectos",
    });
  }

  return (
    <>
      <Encabezado
        titulo="Dashboard de Proyectos"
        subtitulo="Centro de control operativo"
        acciones={
          <>
            <Boton variante="linea" onClick={excel}>
              Exportar a Excel
            </Boton>
            <Boton onClick={pdf}>Exportar a PDF</Boton>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 border-y border-line bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-mono">Obra analizada</p>
          <p className="mt-1 text-sm font-semibold">{obraSel?.proyecto.nombre ?? "Sin obras registradas"}</p>
        </div>
        <div className="w-full sm:w-80">
          <Select value={obraSel?.proyecto.id ?? ""} onChange={(e) => setObraId(e.target.value)}>
            {filas.length === 0 && <option value="">Sin obras registradas</option>}
            {filas.map((f) => (
              <option key={f.proyecto.id} value={f.proyecto.id}>{f.proyecto.nombre}</option>
            ))}
          </Select>
        </div>
      </div>

      <section className="panel rise mb-4 overflow-hidden" aria-label="Resumen de estados y operación">
        <div className="grid grid-cols-5 gap-px bg-line lg:w-1/3">
          {SITUACIONES.map((situacion) => {
            const cantidad = proyectos.filter((proyecto) => proyecto.situacion === situacion).length;
            return <EstadoProyecto key={situacion} situacion={situacion} cantidad={cantidad} />;
          })}
        </div>
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <IndicadorOperacion
            icono={<Layers3 />}
            etiqueta="Total de partidas"
            valor={String(obraSel?.partidas ?? 0)}
            detalle={obraSel?.proyecto.nombre ?? "Sin obra seleccionada"}
          />
          <IndicadorOperacion
            icono={<ListTodo />}
            etiqueta="Partidas pendientes"
            valor={String(obraSel?.partidasPendientes ?? 0)}
            detalle={`${Math.max((obraSel?.partidas ?? 0) - (obraSel?.partidasPendientes ?? 0), 0)} completadas`}
            tono={(obraSel?.partidasPendientes ?? 0) > 0 ? "bad" : "good"}
          />
          <IndicadorOperacion
            icono={<AlertTriangle />}
            etiqueta="Prioridad"
            valor={(obraSel?.proyecto.prioridad ?? "Sin definir").toUpperCase()}
            detalle="Nivel de atención de la obra"
            {...(obraSel?.proyecto.prioridad === "Alta" ? { tono: "bad" as const } : {})}
          />
          <IndicadorOperacion
            icono={<Clock3 />}
            etiqueta={plazo?.vencido ? "Plazo vencido" : "Días restantes"}
            valor={plazo ? String(Math.abs(plazo.dias)) : "—"}
            detalle={plazo ? (plazo.vencido ? "días fuera de plazo" : `hasta el ${fecha(obraSel?.proyecto.fecha_fin ?? null)}`) : "Sin fecha de fin"}
            {...(plazo?.vencido ? { tono: "bad" as const } : {})}
          />
        </div>
      </section>

      {!obraSel ? (
        <Panel><Vacio texto="Registra una obra para visualizar el tablero." /></Panel>
      ) : (
        <>
          <div className="mb-4 grid gap-3 lg:grid-cols-12">
            <section className="panel rise flex min-h-64 flex-col justify-between p-5 lg:col-span-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-mono">Avance general</p>
                  <h2 className="mt-2 line-clamp-3 text-xl font-bold leading-tight">{obraSel.proyecto.nombre}</h2>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {obraSel.proyecto.ubicacion || "Ubicación no registrada"}
                  </p>
                </div>
                <InsigniaPrioridad valor={obraSel.proyecto.prioridad} />
              </div>
              <Medidor valor={obraSel.avance} />
              <div className="flex items-center justify-between border-t border-line pt-3">
                <InsigniaSituacion valor={obraSel.proyecto.situacion} />
                <span className="font-mono text-[11px] text-muted-foreground">{obraSel.partidas} partidas</span>
              </div>
            </section>

            <section className="panel rise grid sm:grid-cols-2 lg:col-span-5">
              <DatoIcono icono={<CalendarDays />} etiqueta="Inicio" valor={fecha(obraSel.proyecto.fecha_inicio)} />
              <DatoIcono icono={<Flag />} etiqueta="Fin previsto" valor={fecha(obraSel.proyecto.fecha_fin)} />
              <DatoIcono
                icono={<Clock3 />}
                etiqueta={plazo?.vencido ? "Plazo vencido" : "Días restantes"}
                valor={plazo ? `${Math.abs(plazo.dias)} días` : "Sin fecha"}
                {...(plazo?.vencido ? { tono: "bad" as const } : {})}
              />
              <DatoIcono icono={<WalletCards />} etiqueta="Saldo disponible" valor={soles(obraSel.diferencia)} tono={obraSel.diferencia < 0 ? "bad" : "good"} />
            </section>

            <section className="panel rise flex flex-col justify-between p-5 lg:col-span-3">
              <div>
                <p className="label-mono">Control de presupuesto</p>
                <p className="mt-3 font-mono text-2xl font-bold">{soles(obraSel.presupuesto)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Presupuesto aprobado</p>
              </div>
              <div className="my-5">
                <div className="mb-2 flex justify-between font-mono text-[11px]">
                  <span>Costo real</span><strong>{pct(obraSel.gastado)}</strong>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className={`growx h-full rounded-full ${obraSel.desviado ? "bg-bad" : "bg-primary"}`} style={{ width: `${Math.min(obraSel.gastado, 100)}%` }} />
                </div>
              </div>
              <p className={`font-mono text-lg font-semibold ${obraSel.desviado ? "text-bad" : "text-good"}`}>{soles(obraSel.costoReal)}</p>
            </section>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Tarjeta etiqueta="Presupuesto cartera" valor={soles(resumen.presupuesto)} detalle="Total de todas las obras" />
            <Tarjeta etiqueta="Costo real cartera" valor={soles(resumen.costoReal)} detalle={`Saldo ${soles(resumen.diferencia)}`} tono={resumen.diferencia < 0 ? "bad" : "good"} />
          </div>
        </>
      )}

      <Panel
        titulo="Curva S — Plan contra ejecución"
        className="mb-4"
      >
        {!obraSel ? (
          <Vacio texto="Registra una obra para visualizar su curva S." />
        ) : (
          <CurvaS
            fechaInicio={obraSel.proyecto.fecha_inicio}
            fechaFin={obraSel.proyecto.fecha_fin}
            presupuesto={obraSel.presupuesto}
            avanceFisico={obraSel.avance}
            movimientos={movimientos}
          />
        )}
      </Panel>

      <Panel titulo="Cartera de proyectos">
        {filas.length === 0 ? (
          <Vacio texto="Aún no hay proyectos registrados." />
        ) : (
          <ul className="grid gap-px bg-line sm:grid-cols-2">
            {filas.map((f) => (
              <li key={f.proyecto.id} className={`bg-card px-5 py-4 transition-colors ${f.proyecto.id === obraSel?.proyecto.id ? "ring-2 ring-inset ring-primary" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-64 flex-1">
                    <button type="button" onClick={() => setObraId(f.proyecto.id)} className="text-left text-sm font-semibold hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">{f.proyecto.nombre}</button>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {f.proyecto.cliente} · {f.partidas} partidas
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <InsigniaSituacion valor={f.proyecto.situacion} />
                      <InsigniaPrioridad valor={f.proyecto.prioridad} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="label-mono">Presupuesto / Costo real</p>
                    <p className="font-mono text-sm font-semibold">
                      {soles(f.presupuesto)}{" "}
                      <span className={f.desviado ? "text-bad" : "text-good"}>/ {soles(f.costoReal)}</span>
                    </p>
                    <p className={`font-mono text-[11px] ${f.diferencia < 0 ? "text-bad" : "text-muted-foreground"}`}>
                      Diferencia {soles(f.diferencia)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Barra etiqueta="Avance Físico" valor={f.avance} clase="bg-primary" />
                  <Barra
                    etiqueta="Presupuesto Gastado"
                    valor={f.gastado}
                    clase={f.desviado ? "bg-bad" : "bg-good"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: "good" | "bad";
}) {
  return (
    <div className="panel rise p-5">
      <p className="label-mono">{etiqueta}</p>
      <p
        className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
          tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-ink"
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{detalle}</p>
    </div>
  );
}

function EstadoProyecto({ situacion, cantidad }: { situacion: string; cantidad: number }) {
  const tono = tonoSituacion(situacion);
  return (
    <div className="flex min-h-20 flex-col justify-between p-2" style={{ backgroundColor: tono.fondo }}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] font-semibold uppercase leading-tight text-ink">{situacion}</span>
        <span className="h-2 w-2 shrink-0 rounded-full border" style={{ backgroundColor: tono.borde, borderColor: tono.borde }} />
      </div>
      <strong className="font-mono text-2xl font-bold text-ink">{cantidad}</strong>
    </div>
  );
}

function IndicadorOperacion({
  icono,
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  icono: ReactNode;
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: "good" | "bad";
}) {
  return (
    <div className="flex min-h-32 items-center gap-4 bg-card p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted [&>svg]:h-5 [&>svg]:w-5 ${tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-primary"}`}>
        {icono}
      </span>
      <div className="min-w-0">
        <p className="label-mono">{etiqueta}</p>
        <p className={`mt-1 break-words font-mono text-2xl font-bold ${tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-ink"}`}>{valor}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detalle}</p>
      </div>
    </div>
  );
}

function Barra({ etiqueta, valor, clase }: { etiqueta: string; valor: number; clase: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full growx rounded-full ${clase}`} style={{ width: `${Math.min(valor, 100)}%` }} />
      </div>
      <span className="w-14 text-right font-mono text-[11px]">{pct(valor)}</span>
    </div>
  );
}

function Medidor({ valor }: { valor: number }) {
  const limitado = Math.min(Math.max(valor, 0), 100);
  const radio = 72;
  const largo = Math.PI * radio;
  return (
    <div className="relative mx-auto h-32 w-44 overflow-hidden" aria-label={`Avance físico ${pct(valor)}`}>
      <svg viewBox="0 0 180 100" className="h-full w-full" aria-hidden="true">
        <path d="M 18 88 A 72 72 0 0 1 162 88" fill="none" className="stroke-muted" strokeWidth="15" strokeLinecap="round" />
        <path d="M 18 88 A 72 72 0 0 1 162 88" fill="none" className={valor < 50 ? "stroke-bad" : "stroke-primary"} strokeWidth="15" strokeLinecap="round" strokeDasharray={`${(limitado / 100) * largo} ${largo}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="font-mono text-3xl font-bold">{pct(valor)}</p>
        <p className="label-mono">Ejecutado</p>
      </div>
    </div>
  );
}

function DatoIcono({ icono, etiqueta, valor, tono }: { icono: ReactNode; etiqueta: string; valor: string; tono?: "good" | "bad" }) {
  return (
    <div className="flex min-h-32 items-center gap-4 border-b border-line p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-child(n+3)]:border-b-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary [&>svg]:h-5 [&>svg]:w-5">{icono}</span>
      <div className="min-w-0">
        <p className="label-mono">{etiqueta}</p>
        <p className={`mt-1 font-mono text-sm font-semibold ${tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-ink"}`}>{valor}</p>
      </div>
    </div>
  );
}

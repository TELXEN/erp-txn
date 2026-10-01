import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarDays, Clock3, Flag, Layers3, ListTodo, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, Vacio } from "@/components/ui-kit";
import { CurvaS } from "@/components/CurvaS";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { tonoSituacion } from "@/lib/configuracion";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { nombresEstados, useEstadosProyecto } from "@/lib/datos";

import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, pct, soles } from "@/lib/format";
import {
  costoRealProyecto,
  esContractual,
  resumenPresupuesto,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
  useCronograma,
  programadoCronograma,
  hoyISO,
  useTiposPresupuesto,
} from "@/lib/datos";
import { useTareoVehiculos } from "@/lib/vehiculos";
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
  const { fuente } = useFuenteDocumento();
  const { data: proyectos = [] } = useProyectos();
  const estadosQ = useEstadosProyecto();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { data: tareoVeh = [] } = useTareoVehiculos();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: cronograma = [] } = useCronograma();
  const [obraId, setObraId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");


  const filas = useMemo(
    () =>
      proyectos.map((p) => {
        const propias = partidas.filter((x) => x.proyecto_id === p.id);
        const idsPadre = new Set(propias.map((x) => x.padre_id).filter(Boolean));
        const partidasAvance = propias.filter((x) => !idsPadre.has(x.id));
        const presupuestoDesglosado = resumenPresupuesto(propias, tiposPresupuesto);
        const presupuesto = presupuestoDesglosado.vigente;
        const costoReal = costoRealProyecto(p.id, gastosD, tareos, gastosG, tareoVeh);
        const partidasContractuales = propias.filter((x) => esContractual(x.tipo_presupuesto ?? "Contractual", tiposPresupuesto)).length;
        const partidasAdicionales = propias.length - partidasContractuales;
        const baseAvance = partidasAvance.reduce((s, x) => s + Number(x.presupuesto_inicial), 0);
        const avance =
          baseAvance > 0
            ? partidasAvance.reduce((s, x) => s + Number(x.avance_pct) * Number(x.presupuesto_inicial), 0) / baseAvance
            : partidasAvance.length > 0
              ? partidasAvance.reduce((s, x) => s + Number(x.avance_pct), 0) / partidasAvance.length
              : 0;
        const gastado = presupuesto > 0 ? (costoReal / presupuesto) * 100 : 0;
        const porCronograma = programadoCronograma(partidasAvance, cronograma, hoyISO(), p.periodicidad_cronograma ?? "mes");
        const programado = porCronograma ?? (p.avance_programado_pct == null ? null : Number(p.avance_programado_pct));
        const desviacion = programado === null ? null : avance - programado;
        return {
          proyecto: p,
          partidas: propias.length,
          partidasContractuales,
          partidasAdicionales,
          partidasPendientes: propias.filter((x) => x.situacion !== "Completado" && Number(x.avance_pct) < 100).length,
          presupuestoContractual: presupuestoDesglosado.contractual,
          adicionales: presupuestoDesglosado.adicionales,
          presupuesto,
          costoReal,
          avance,
          gastado,
          programado,
          usaCalendario: porCronograma !== null,
          desviacion,
          diferencia: presupuesto - costoReal,
          desviado: gastado > avance,
        };
      }),
    [proyectos, partidas, gastosD, gastosG, tareos, tiposPresupuesto, cronograma],
  );

  const resumen = useMemo(() => {
    const presupuesto = filas.reduce((s, f) => s + f.presupuesto, 0);
    const presupuestoContractual = filas.reduce((s, f) => s + f.presupuestoContractual, 0);
    const adicionales = filas.reduce((s, f) => s + f.adicionales, 0);
    const costoReal = filas.reduce((s, f) => s + f.costoReal, 0);
    return {
      total: proyectos.length,
      noIniciados: proyectos.filter((p) => p.situacion === "No iniciado").length,
      enProceso: proyectos.filter((p) => p.situacion === "En proceso").length,
      retrasados: proyectos.filter((p) => p.situacion === "Retrasado").length,
      completados: proyectos.filter((p) => p.situacion === "Completado").length,
      cancelados: proyectos.filter((p) => p.situacion === "Cancelado").length,
      presupuesto,
      presupuestoContractual,
      adicionales,
      costoReal,
      diferencia: presupuesto - costoReal,
      desviadas: filas.filter((f) => f.desviado).length,
    };
  }, [filas, proyectos]);

  const obraSel = filas.find((f) => f.proyecto.id === obraId) ?? filas[0];

  const cartera = useMemo(
    () => (filtroEstado === "Todos" ? filas : filas.filter((f) => f.proyecto.situacion === filtroEstado)),
    [filas, filtroEstado],
  );

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


  const verDinero = puedeVerDinero(rol);
  const programadoSel = obraSel?.programado ?? null;

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
          { Indicador: "Avance programado obra seleccionada (%)", Valor: Number((programadoSel ?? 0).toFixed(2)) },
          { Indicador: "Desviación obra seleccionada (%)", Valor: Number((obraSel?.desviacion ?? 0).toFixed(2)) },
          { Indicador: "Presupuesto contractual (S/)", Valor: resumen.presupuestoContractual },
          { Indicador: "Adicionales de obra (S/)", Valor: resumen.adicionales },
          { Indicador: "Presupuesto vigente (S/)", Valor: resumen.presupuesto },
          { Indicador: "Costo ejecutado total (S/)", Valor: resumen.costoReal },
          { Indicador: "Diferencia (S/)", Valor: resumen.diferencia },
        ],
      },
      {
        nombre: "Obras",
        filas: filas.map((f) => ({
          Obra: f.proyecto.nombre,
          Cliente: f.proyecto.cliente,
          Status: f.proyecto.situacion,
          Partidas: f.partidas,
          "Presupuesto Contractual (S/)": f.presupuestoContractual,
          "Adicionales de Obra (S/)": f.adicionales,
          "Presupuesto Vigente (S/)": f.presupuesto,
          "Costo Real (S/)": f.costoReal,
          "Avance Fisico %": Number(f.avance.toFixed(1)),
          "Avance Programado %": f.programado === null ? "Sin registro" : Number(f.programado.toFixed(2)),
          "Fecha de Corte": f.usaCalendario ? hoyISO() : (f.proyecto.fecha_corte_programado ?? "Sin registro"),
          "Desviación %": f.desviacion === null ? "Sin registro" : Number(f.desviacion.toFixed(2)),
          "Estado Cronograma": f.desviacion === null ? "Sin registro" : f.desviacion < -0.05 ? "Retrasada" : f.desviacion > 0.05 ? "Adelantada" : "En plazo",
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
        { etiqueta: "Presupuesto Contractual", valor: resumen.presupuestoContractual },
        { etiqueta: "Adicionales de Obra", valor: resumen.adicionales },
        { etiqueta: "Presupuesto Vigente", valor: resumen.presupuesto },
        { etiqueta: "Costo Real Total", valor: resumen.costoReal },
        { etiqueta: "Diferencia", valor: resumen.diferencia },
      ],
      barras: filas.map((f) => ({
        partida: f.proyecto.nombre,
        avance: f.avance,
        gastado: f.gastado,
        diferencia: f.diferencia,
      })),
      tabla: {
        columnas: ["Obra", "Avance físico", "Avance programado", "Desviación", "Fecha de corte"],
        filas: filas.map((f) => [
          f.proyecto.nombre,
          `${f.avance.toFixed(1)}%`,
          f.programado === null ? "Sin registro" : `${f.programado.toFixed(2)}%`,
          f.desviacion === null ? "—" : `${f.desviacion >= 0 ? "+" : ""}${f.desviacion.toFixed(2)}%`,
           f.usaCalendario ? fecha(hoyISO()) : f.proyecto.fecha_corte_programado ? fecha(f.proyecto.fecha_corte_programado) : "Sin registro",
        ]),
      },
      archivo: "dashboard-proyectos",
      fuentePdf: fuente.id,
    });
  }

  return (
    <>
      <Encabezado
        titulo="Dashboard de Proyectos"
        subtitulo="Centro de control operativo"
        acciones={
          verDinero && <>
            <Boton variante="linea" onClick={excel}>
              <Upload size={13} /> Exportar a Excel
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

      <section className={`mb-4 grid gap-3 ${verDinero ? "lg:grid-cols-3" : "lg:grid-cols-2"}`} aria-label="Resumen del proyecto seleccionado">
        <div className="panel rise flex flex-col justify-between p-4">
          {!obraSel ? (
            <Vacio texto="Registra una obra para visualizar el avance." />
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="label-mono">Avance general</p>
                <InsigniaSituacion valor={obraSel.proyecto.situacion} />
              </div>

              <div className="my-2 grid grid-cols-3 gap-1 rounded-lg border border-line bg-muted/30 p-2 text-center">
                <div>
                  <p className="label-mono text-[9px]">Inicio</p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold">{fecha(obraSel.proyecto.fecha_inicio)}</p>
                </div>
                <div className="border-x border-line px-1">
                  <p className="label-mono text-[9px]">Fin previsto</p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold">{fecha(obraSel.proyecto.fecha_fin)}</p>
                </div>
                <div>
                  <p className="label-mono text-[9px]">{plazo?.vencido ? "Plazo vencido" : "Días restantes"}</p>
                  <p className={`mt-0.5 font-mono text-[11px] font-semibold ${plazo?.vencido ? "text-bad" : ""}`}>
                    {plazo ? `${Math.abs(plazo.dias)} días` : "Sin fecha"}
                  </p>
                </div>
              </div>

              <MedidorCompacto valor={obraSel.avance} />

              <div className="flex items-center justify-between border-t border-line pt-2">
                <InsigniaSituacion valor={obraSel.proyecto.situacion} />
                <span className="font-mono text-[10px] text-muted-foreground">{obraSel.partidas} partidas</span>
              </div>
            </>
          )}
        </div>

        <div className="panel rise overflow-hidden">

          <div className="border-b border-line px-4 py-3"><p className="label-mono">Partidas y prioridad</p></div>
          <div className="divide-y divide-line">
            <IndicadorCompacto
              icono={<Layers3 />}
              etiqueta="Total partidas"
              valor={String(obraSel?.partidas ?? 0)}
              detalle={`${obraSel?.partidasContractuales ?? 0} contractual · ${obraSel?.partidasAdicionales ?? 0} adicionales`}
            />
            <IndicadorCompacto
              icono={<ListTodo />}
              etiqueta="Partidas pendientes"
              valor={String(obraSel?.partidasPendientes ?? 0)}
              tono={(obraSel?.partidasPendientes ?? 0) > 0 ? "bad" : "good"}
            />
            <IndicadorCompacto
              icono={<AlertTriangle />}
              etiqueta="Partidas de prioridad alta"
              valor={String(obraSel?.proyecto ? partidas.filter((p) => p.proyecto_id === obraSel.proyecto.id && p.prioridad === "Alta").length : 0)}
              {...((obraSel?.proyecto ? partidas.filter((p) => p.proyecto_id === obraSel.proyecto.id && p.prioridad === "Alta").length : 0) > 0 ? { tono: "bad" as const } : {})}
            />
          </div>
        </div>

        {verDinero && (
        <div className="panel rise overflow-hidden">
          <div className="border-b border-line px-4 py-3"><p className="label-mono">Resumen financiero del proyecto</p></div>
          <div className="divide-y divide-line">
            <DatoFinanciero etiqueta="Presupuesto contractual" valor={soles(obraSel?.presupuestoContractual ?? 0)} />
            <DatoFinanciero etiqueta="Adicionales de obra" valor={soles(obraSel?.adicionales ?? 0)} {...((obraSel?.adicionales ?? 0) > 0 ? { tono: "primary" as const } : {})} />
            <DatoFinanciero etiqueta="Presupuesto vigente" valor={soles(obraSel?.presupuesto ?? 0)} tono="good" />
          </div>
        </div>
        )}
      </section>

      <Panel titulo="Control de cronograma oficial" className="mb-4">
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_220px] lg:items-center">
          <div className="space-y-3">
            <Barra etiqueta="Avance físico real" valor={obraSel?.avance ?? null} clase="bg-primary" />
            <Barra etiqueta="Avance programado" valor={programadoSel} clase="bg-muted-foreground" />
          </div>
          <div className="border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p className="label-mono">Desviación a la fecha de corte</p>
            {programadoSel === null ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">Sin avance programado oficial registrado.</p>
            ) : (obraSel?.avance ?? 0) + 0.05 < programadoSel ? (
              <p className="mt-2 font-mono text-sm font-semibold text-bad">-{pct(programadoSel - (obraSel?.avance ?? 0))} · Retraso</p>
            ) : (
              <p className="mt-2 font-mono text-sm font-semibold text-good">+{pct((obraSel?.avance ?? 0) - programadoSel)} · En plazo o adelantada</p>
            )}
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Corte: {obraSel?.usaCalendario ? fecha(hoyISO()) : obraSel?.proyecto.fecha_corte_programado ? fecha(obraSel.proyecto.fecha_corte_programado) : "Sin registrar"}
            </p>
          </div>
        </div>
      </Panel>


      <Panel
        titulo={verDinero ? "Curva S — Avance programado, real y costo" : "Curva S — Avance programado versus real"}
        className="mb-4"
      >
        {!obraSel ? (
          <Vacio texto="Registra una obra para visualizar su curva S." />
        ) : (
          <CurvaS
            fechaInicio={obraSel.proyecto.fecha_inicio}
            fechaFin={obraSel.proyecto.fecha_fin}
            presupuesto={obraSel.presupuesto}
            presupuestoContractual={obraSel.presupuestoContractual}
            adicionales={obraSel.adicionales}
            avanceFisico={obraSel.avance}
            avanceProgramadoOficial={obraSel.programado}
            fechaCorteProgramado={obraSel.proyecto.fecha_corte_programado}
            movimientos={movimientos}
            partidas={partidas.filter((p) => p.proyecto_id === obraSel.proyecto.id && !new Set(partidas.filter((x) => x.proyecto_id === obraSel.proyecto.id).map((x) => x.padre_id).filter(Boolean)).has(p.id))}
            cronograma={cronograma}
            periodicidad={obraSel.proyecto.periodicidad_cronograma ?? "mes"}
            mostrarDinero={verDinero}
          />
        )}
      </Panel>

      <Panel
        titulo="Cartera de proyectos"
        extra={
          <div className="flex flex-wrap items-center gap-1.5">
            <PildoraEstado
              etiqueta="Todos"
              cantidad={proyectos.length}
              activa={filtroEstado === "Todos"}
              onClick={() => setFiltroEstado("Todos")}
            />
            {nombresEstados(estadosQ.data).map((situacion) => (
              <PildoraEstado
                key={situacion}
                etiqueta={situacion}
                cantidad={proyectos.filter((p) => p.situacion === situacion).length}
                color={tonoSituacion(situacion).borde}
                activa={filtroEstado === situacion}
                onClick={() => setFiltroEstado(situacion)}
              />
            ))}
          </div>
        }
      >
        {cartera.length === 0 ? (
          <Vacio texto={filtroEstado === "Todos" ? "Aún no hay proyectos registrados." : `No hay obras con status "${filtroEstado}".`} />
        ) : (
          <ul className="grid gap-px bg-line sm:grid-cols-2">
            {cartera.map((f) => (
              <li key={f.proyecto.id} className={`bg-card px-5 py-4 transition-colors ${f.proyecto.id === obraSel?.proyecto.id ? "ring-2 ring-inset ring-primary" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-64 flex-1">
                    <button type="button" onClick={() => setObraId(f.proyecto.id)} className="text-left text-sm font-semibold hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">{f.proyecto.nombre}</button>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {f.proyecto.cliente} · {f.partidas} partidas
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <InsigniaSituacion valor={f.proyecto.situacion} />
                    </div>
                  </div>
                  {verDinero && <div className="text-right">
                    <p className="label-mono">Contractual + adicionales</p>
                    <p className="font-mono text-xs text-muted-foreground">{soles(f.presupuestoContractual)} + <span className="text-primary">{soles(f.adicionales)}</span></p>
                    <p className="font-mono text-sm font-semibold">Vigente {soles(f.presupuesto)}</p>
                    <p className={`font-mono text-[11px] ${f.desviado ? "text-bad" : "text-good"}`}>Costo ejecutado {soles(f.costoReal)}</p>
                    <p className={`font-mono text-[11px] ${f.diferencia < 0 ? "text-bad" : "text-muted-foreground"}`}>
                      Diferencia {soles(f.diferencia)}
                    </p>
                  </div>}
                </div>
                <div className="mt-3 space-y-1.5">
                  <Barra etiqueta="Avance Físico" valor={f.avance} clase="bg-primary" />
                  <Barra
                    etiqueta="Avance Programado"
                    valor={f.programado}
                    clase="bg-muted-foreground"
                  />
                  {verDinero && (
                    <Barra
                      etiqueta="Presupuesto Gastado"
                      valor={f.gastado}
                      clase={f.desviado ? "bg-bad" : "bg-good"}
                    />
                  )}
                  {f.desviacion !== null && (
                    <p className={`text-right font-mono text-[10px] font-semibold ${f.desviacion < -0.05 ? "text-bad" : "text-good"}`}>
                      {f.desviacion < -0.05 ? `${pct(Math.abs(f.desviacion))} de retraso` : `${pct(f.desviacion)} en plazo o adelantada`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function DatoFinanciero({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: "good" | "bad" | "primary" }) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-3">
      <p className="label-mono">{etiqueta}</p>
      <p
        className={`text-right font-mono text-lg font-bold ${
          tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : tono === "primary" ? "text-primary" : "text-ink"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}


function PildoraEstado({
  etiqueta,
  cantidad,
  color,
  activa,
  onClick,
}: {
  etiqueta: string;
  cantidad: number;
  color?: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        activa ? "border-primary bg-primary/10 text-primary" : "border-line bg-card text-muted-foreground hover:text-ink"
      }`}
    >
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span>{etiqueta}</span>
      <span className={`rounded-full px-1.5 ${activa ? "bg-primary/15 text-primary" : "bg-muted text-ink"}`}>{cantidad}</span>
    </button>
  );
}

function IndicadorCompacto({ icono, etiqueta, valor, detalle, tono }: { icono: ReactNode; etiqueta: string; valor: string; detalle?: string; tono?: "good" | "bad" }) {

  return (
    <div className="flex min-h-20 items-center gap-3 px-4 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted [&>svg]:h-4 [&>svg]:w-4 ${tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-primary"}`}>
        {icono}
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-mono">{etiqueta}</p>
        {detalle && <p className="mt-1 font-mono text-[10px] text-muted-foreground">{detalle}</p>}
      </div>
      <strong className={`font-mono text-xl ${tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-ink"}`}>{valor}</strong>
    </div>
  );
}

function Barra({ etiqueta, valor, clase }: { etiqueta: string; valor: number | null; clase: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full growx rounded-full ${clase}`} style={{ width: `${Math.min(valor ?? 0, 100)}%` }} />
      </div>
      <span className="w-14 text-right font-mono text-[11px]">{valor === null ? "Sin dato" : pct(valor)}</span>
    </div>
  );
}

function MedidorCompacto({ valor }: { valor: number }) {
  const limitado = Math.min(Math.max(valor, 0), 100);
  const radio = 72;
  const largo = Math.PI * radio;
  const color = limitado < 50 ? "#4F46E5" : limitado < 75 ? "#F59E0B" : "#10B981";
  const tramo = (desde: number, hasta: number) =>
    Math.max(0, Math.min(limitado, hasta) - desde) / 100 * largo;
  return (
    <div className="relative mx-auto h-36 w-full max-w-60 overflow-hidden" aria-label={`Avance físico ${pct(valor)}`}>
      <svg viewBox="0 0 180 110" className="h-full w-full" aria-hidden="true">
        <path d="M 18 92 A 72 72 0 0 1 162 92" fill="none" className="stroke-muted" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 18 92 A 72 72 0 0 1 162 92"
          fill="none"
          stroke="#4F46E5"
          strokeWidth="14"
          strokeLinecap="butt"
          strokeDasharray={`${tramo(0, 50)} ${largo}`}
        />
        <path
          d="M 18 92 A 72 72 0 0 1 162 92"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="14"
          strokeLinecap="butt"
          strokeDasharray={`0 ${(50 / 100) * largo} ${tramo(50, 75)} ${largo}`}
        />
        <path
          d="M 18 92 A 72 72 0 0 1 162 92"
          fill="none"
          stroke="#10B981"
          strokeWidth="14"
          strokeLinecap="butt"
          strokeDasharray={`0 ${(75 / 100) * largo} ${tramo(75, 100)} ${largo}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-mono text-3xl font-bold" style={{ color }}>{pct(valor)}</p>
        <p className="label-mono text-[10px]">Ejecutado</p>
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


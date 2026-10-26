import { DesgloseCd } from "@/components/DesgloseCd";
import { DesgloseGg } from "@/components/DesgloseGg";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, CircleDollarSign, ClipboardList, Gauge, Hourglass, Layers3, ListTodo, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Pestanas, Select, Vacio } from "@/components/ui-kit";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { tonoSituacion } from "@/lib/configuracion";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { type Proyecto } from "@/lib/datos";

import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, pct, soles } from "@/lib/format";
import {
  esContractual,
  ofertaProyecto,
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
import { useCostoObras } from "@/lib/costo-obra";
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

const TARJETAS_ESTADO = [
  { etiqueta: "Activos", situacion: "En proceso" },
  { etiqueta: "En espera", situacion: "No iniciado" },
  { etiqueta: "Finalizados", situacion: "Completado" },
  { etiqueta: "Retrasados", situacion: "Retrasado" },
] as const;

function DashboardProyectos() {
  const { rol } = useAuth();
  const { fuente } = useFuenteDocumento();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { costoDe } = useCostoObras();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: cronograma = [] } = useCronograma();
  const [obraId, setObraId] = useState("todos");
  const [desglose, setDesglose] = useState<"cd" | "gg">("cd");

  // Recupera la última obra seleccionada: persiste al cerrar la pestaña o cambiar de ventana.
  useEffect(() => {
    const guardada = (() => {
      try {
        return localStorage.getItem("dashboard-proyectos:obra");
      } catch {
        return null;
      }
    })();
    if (guardada) setObraId(guardada);
  }, []);

  // Guarda cada cambio de obra (no al montar, para no pisar el valor restaurado).
  const primerCambio = useRef(true);
  useEffect(() => {
    if (primerCambio.current) {
      primerCambio.current = false;
      return;
    }
    try {
      localStorage.setItem("dashboard-proyectos:obra", obraId);
    } catch {}
  }, [obraId]);
  // Vuelve a "todos" si la obra guardada ya no existe.
  useEffect(() => {
    if (obraId !== "todos" && proyectos.length > 0 && !proyectos.some((p) => p.id === obraId)) setObraId("todos");
  }, [proyectos, obraId]);

  const filas = useMemo(
    () =>
      proyectos.map((p) => {
        const propias = partidas.filter((x) => x.proyecto_id === p.id);
        const idsPadre = new Set(propias.map((x) => x.padre_id).filter(Boolean));
        const partidasAvance = propias.filter((x) => !idsPadre.has(x.id));
        // Presupuesto vigente = oferta (costo directo + GG + utilidad), igual que Proyectos y Dashboard financiero.
        const oferta = (lista: typeof propias) =>
          ofertaProyecto(lista, tiposPresupuesto, Number(p.pct_gastos_generales), Number(p.pct_utilidad)).ofertado;
        const contractualOf = oferta(propias.filter((x) => esContractual(x.tipo_presupuesto ?? "Contractual", tiposPresupuesto)));
        const adicionalesOf = oferta(propias.filter((x) => !esContractual(x.tipo_presupuesto ?? "Contractual", tiposPresupuesto)));
        const presupuestoDesglosado = { contractual: contractualOf, adicionales: adicionalesOf, vigente: contractualOf + adicionalesOf };
        const presupuesto = presupuestoDesglosado.vigente;
        const co = costoDe(p.id);
        const costoReal = co.costoReal;
        const ofTotal = ofertaProyecto(propias, tiposPresupuesto, Number(p.pct_gastos_generales), Number(p.pct_utilidad));
        const cdPres = ofTotal.costoDirecto, ggPres = ofTotal.gastosGenerales, utPres = ofTotal.utilidad;
        const cdReal = co.costoDirectoReal, ggReal = co.ggReal;
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
          cdPres, ggPres, utPres, cdReal, ggReal,
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
      gastadoPct: presupuesto > 0 ? (costoReal / presupuesto) * 100 : 0,
      cdPres: filas.reduce((s, f) => s + f.cdPres, 0),
      ggPres: filas.reduce((s, f) => s + f.ggPres, 0),
      utPres: filas.reduce((s, f) => s + f.utPres, 0),
      cdReal: filas.reduce((s, f) => s + f.cdReal, 0),
      ggReal: filas.reduce((s, f) => s + f.ggReal, 0),
      desviadas: filas.filter((f) => f.desviado).length,
    };
  }, [filas, proyectos]);

  const esTodos = obraId === "todos" || obraId === "";
  const obraIndividual = filas.find((f) => f.proyecto.id === obraId) ?? filas[0];

  /** Vista agregada de toda la cartera para la opción «Todos los proyectos». */
  const vistaTodos = useMemo(() => {
    if (filas.length === 0) return null;
    const presupuesto = filas.reduce((s, f) => s + f.presupuesto, 0);
    const costoReal = filas.reduce((s, f) => s + f.costoReal, 0);
    const avance =
      presupuesto > 0
        ? filas.reduce((s, f) => s + f.avance * f.presupuesto, 0) / presupuesto
        : filas.reduce((s, f) => s + f.avance, 0) / filas.length;
    const conProgramado = filas.filter((f) => f.programado !== null);
    const baseProg = conProgramado.reduce((s, f) => s + f.presupuesto, 0);
    const programado =
      conProgramado.length === 0
        ? null
        : baseProg > 0
          ? conProgramado.reduce((s, f) => s + (f.programado ?? 0) * f.presupuesto, 0) / baseProg
          : conProgramado.reduce((s, f) => s + (f.programado ?? 0), 0) / conProgramado.length;
    const inicios = filas.map((f) => f.proyecto.fecha_inicio).filter((x): x is string => !!x).sort();
    const fines = filas.map((f) => f.proyecto.fecha_fin).filter((x): x is string => !!x).sort();
    const gastado = presupuesto > 0 ? (costoReal / presupuesto) * 100 : 0;
    // La desviación compara avance y programado sobre la MISMA base (solo obras con cronograma),
    // para no mezclar el avance ponderado de toda la cartera con el programado de un subconjunto.
    const avanceComparable =
      baseProg > 0
        ? conProgramado.reduce((s, f) => s + f.avance * f.presupuesto, 0) / baseProg
        : conProgramado.length > 0
          ? conProgramado.reduce((s, f) => s + f.avance, 0) / conProgramado.length
          : 0;
    const desviacion = programado === null ? null : avanceComparable - programado;
    const proyectoCartera: Proyecto = {
      id: "todos",
      codigo: null,
      responsable_id: null,
      nombre: "Todos los proyectos",
      cliente: `${filas.length} ${filas.length === 1 ? "obra" : "obras"}`,
      ubicacion: "",
      estado: "En Ejecucion",
      situacion: "",
      fecha_inicio: inicios[0] ?? null,
      fecha_fin: fines[fines.length - 1] ?? null,
      avance_programado_pct: null,
      fecha_corte_programado: null,
      pct_gastos_generales: 0,
      pct_utilidad: 0,
    };
    return {
      proyecto: proyectoCartera,
      partidas: filas.reduce((s, f) => s + f.partidas, 0),
      partidasContractuales: filas.reduce((s, f) => s + f.partidasContractuales, 0),
      partidasAdicionales: filas.reduce((s, f) => s + f.partidasAdicionales, 0),
      partidasPendientes: filas.reduce((s, f) => s + f.partidasPendientes, 0),
      presupuestoContractual: filas.reduce((s, f) => s + f.presupuestoContractual, 0),
      adicionales: filas.reduce((s, f) => s + f.adicionales, 0),
      presupuesto,
      costoReal,
      avance,
      gastado,
      programado,
      usaCalendario: filas.some((f) => f.usaCalendario),
      desviacion,
      diferencia: presupuesto - costoReal,
      desviado: gastado > avance,
      cdPres: filas.reduce((s, f) => s + f.cdPres, 0),
      ggPres: filas.reduce((s, f) => s + f.ggPres, 0),
      utPres: filas.reduce((s, f) => s + f.utPres, 0),
      cdReal: filas.reduce((s, f) => s + f.cdReal, 0),
      ggReal: filas.reduce((s, f) => s + f.ggReal, 0),
    };
  }, [filas]);

  const obraSel = esTodos ? vistaTodos : obraIndividual;

  const plazo = useMemo(() => {
    if (!obraSel?.proyecto.fecha_fin) return null;
    const fin = new Date(`${obraSel.proyecto.fecha_fin}T23:59:59`);
    const hoy = new Date();
    const dias = Math.ceil((fin.getTime() - hoy.getTime()) / 86_400_000);
    return { dias, vencido: dias < 0 };
  }, [obraSel]);

  const prioridadAlta = useMemo(() => {
    if (!obraSel) return 0;
    if (esTodos) return partidas.filter((p) => p.prioridad === "Alta").length;
    return partidas.filter((p) => p.proyecto_id === obraSel.proyecto.id && p.prioridad === "Alta").length;
  }, [esTodos, obraSel, partidas]);

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
        { etiqueta: "% Presupuesto Gastado", valor: Number(resumen.gastadoPct.toFixed(1)) },
        { etiqueta: "Obras Activas", valor: resumen.enProceso },
        { etiqueta: "Obras en Espera", valor: resumen.noIniciados },
        { etiqueta: "Obras Finalizadas", valor: resumen.completados },
        { etiqueta: "Obras Retrasadas", valor: resumen.retrasados },
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
    <div className="tablero-proyectos">
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

      <div className="mb-3 flex justify-end">
        <div className="w-full sm:w-80">
          <p className="label-mono mb-1">Seleccione proyecto</p>
          <Select value={esTodos ? "todos" : (obraSel?.proyecto.id ?? "")} onChange={(e) => setObraId(e.target.value)}>
            {filas.length === 0 ? (
              <option value="todos">Sin obras registradas</option>
            ) : (
              <>
                <option value="todos">Todos los proyectos</option>
                {filas.map((f) => (
                  <option key={f.proyecto.id} value={f.proyecto.id}>{f.proyecto.nombre}</option>
                ))}
              </>
            )}
          </Select>
        </div>
      </div>

      <div className="dash-lienzo mb-4 space-y-4 p-4">
        {/* Fila superior: proyecto elegido con estados de cartera y datos clave */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="dash-tarjeta flex flex-col p-4">
            <div className="flex items-start gap-3">
              <span className="dash-icono" data-tono="warn"><ClipboardList size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg text-ink">{esTodos ? "Cartera completa" : (obraSel?.proyecto.nombre ?? "Sin obras registradas")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {esTodos ? `${filas.length} obras en cartera` : [obraSel?.proyecto.codigo, obraSel?.proyecto.cliente].filter(Boolean).join(" | ")}
                </p>
              </div>
              {!esTodos && obraSel && <InsigniaSituacion valor={obraSel.proyecto.situacion} />}
            </div>
            <div className="mt-4 grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
              {TARJETAS_ESTADO.map(({ etiqueta, situacion }) => {
                // «Retrasados» refleja la desviación real frente al cronograma, no solo el estado manual de la obra.
                const cantidad = situacion === "Retrasado"
                  ? filas.filter((f) => f.proyecto.situacion === "Retrasado" || (f.desviacion !== null && f.desviacion < -0.05)).length
                  : proyectos.filter((p) => p.situacion === situacion).length;
                return (
                  <div key={situacion} className="flex flex-col justify-center rounded-lg px-2 py-2 text-center text-primary-foreground shadow-sm" style={{ backgroundColor: tonoSituacion(situacion).borde }}>
                    <p className="text-[10px] opacity-90">{etiqueta}</p>
                    <p className="font-mono text-2xl font-semibold leading-tight">{cantidad}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniDato icono={<Layers3 size={16} />} tono="good" etiqueta="Total partidas" valor={String(obraSel?.partidas ?? 0)}
              detalle={`${obraSel?.partidasContractuales ?? 0} contr. · ${obraSel?.partidasAdicionales ?? 0} adic.`} />
            <MiniDato icono={<ListTodo size={16} />} tono="warn" etiqueta="Partidas pendientes" valor={String(obraSel?.partidasPendientes ?? 0)} />
            <MiniDato icono={<AlertTriangle size={16} />} tono="bad" etiqueta="Prioridad alta" valor={String(prioridadAlta)} />
            <MiniDato icono={<Hourglass size={16} />} tono="primary" etiqueta={plazo?.vencido ? "Plazo vencido" : "Días restantes"}
              valor={plazo ? String(Math.abs(plazo.dias)) : "—"} />
          </div>
        </section>

        {/* Fila inferior: progreso, línea de tiempo y presupuesto */}
        <section className={`grid gap-4 ${verDinero ? "lg:grid-cols-[1fr_1.3fr_1.2fr]" : "lg:grid-cols-[1fr_1.6fr]"}`}>
          <div className="dash-tarjeta p-4">
            <div className="flex items-center gap-3">
              <span className="dash-icono" data-tono="muted"><Gauge size={18} /></span>
              <p className="text-lg text-ink">Progreso</p>
            </div>
            {!obraSel ? <Vacio texto="Registra una obra para visualizar el avance." /> : (
              <>
                <div className="mt-1"><MedidorCompacto valor={obraSel.avance} /></div>
                <p className="text-center text-xs text-muted-foreground">
                  {programadoSel === null || obraSel.desviacion === null ? "Sin avance programado oficial"
                    : obraSel.desviacion < -0.05 ? <span className="font-semibold text-warn">-{pct(-obraSel.desviacion)} · Retraso</span>
                    : <span className="font-semibold text-good">+{pct(obraSel.desviacion)} · En plazo o adelantada</span>}
                </p>
              </>
            )}
          </div>

          <div className="dash-tarjeta dash-degradado p-4" data-tono="violeta">
            <div className="flex items-center gap-3">
              <span className="dash-icono dash-icono-claro"><CalendarClock size={18} /></span>
              <p className="text-lg">Línea de tiempo</p>
            </div>
            <div className="mt-3 flex justify-between font-mono text-xs opacity-90">
              <span>{fecha(obraSel?.proyecto.fecha_inicio ?? null)}</span>
              <span>{fecha(obraSel?.proyecto.fecha_fin ?? null)}</span>
            </div>
            <div className="mt-2 space-y-2">
              <BarraTiempo etiqueta="Real" valor={obraSel?.avance ?? 0} />
              <BarraTiempo etiqueta="Programado" valor={programadoSel ?? 0} tenue />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] opacity-80">
              {[0, 20, 40, 60, 80, 100].map((n) => <span key={n}>{n}%</span>)}
            </div>
            <p className="mt-2 font-mono text-[11px] opacity-90">
              {obraSel?.usaCalendario
                ? `Corte al: ${fecha(hoyISO())}`
                : obraSel?.proyecto.fecha_corte_programado
                  ? `Corte: ${fecha(obraSel.proyecto.fecha_corte_programado)}`
                  : `Última actualización: ${fecha(hoyISO())}`}
            </p>
          </div>

          {verDinero && (
            <div className="dash-tarjeta dash-degradado p-4" data-tono="good">
              <div className="flex items-center gap-3">
                <span className="dash-icono dash-icono-claro"><CircleDollarSign size={18} /></span>
                <p className="text-lg">Presupuesto</p>
                {obraSel && (obraSel.cdReal > obraSel.cdPres + 0.005 || obraSel.ggReal > obraSel.ggPres + 0.005) && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-warn px-2 py-0.5 text-[10px] font-semibold text-warn-foreground">
                    <AlertTriangle size={11} /> Sobrecosto
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4">
                <Anillo valor={(obraSel?.gastado ?? 0)} alerta={!!obraSel && (obraSel.cdReal > obraSel.cdPres + 0.005 || obraSel.ggReal > obraSel.ggPres + 0.005)} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2"><p className="text-xs opacity-90">Presupuesto</p><p className="font-mono text-base font-semibold">{soles(obraSel?.presupuesto ?? 0)}</p></div>
                  <div className="flex items-baseline justify-between gap-2"><p className="text-xs opacity-90">Gastado</p><p className="font-mono text-base font-semibold">{soles(obraSel?.costoReal ?? 0)}</p></div>
                  <div className="flex items-baseline justify-between gap-2 border-t border-card/30 pt-1.5"><p className="text-xs opacity-90">Disponible</p><p className="font-mono text-base font-semibold">{soles((obraSel?.presupuesto ?? 0) - (obraSel?.costoReal ?? 0))}</p></div>
                </div>
              </div>
              <div className="mt-2 space-y-1.5 rounded-lg bg-card p-2.5 text-ink">
                <FilaSemaforo etiqueta="Costo directo" real={obraSel?.cdReal ?? 0} base={obraSel?.cdPres ?? 0} />
                <FilaSemaforo etiqueta="Gastos generales" real={obraSel?.ggReal ?? 0} base={obraSel?.ggPres ?? 0} />
              </div>
            </div>
          )}
        </section>
      </div>

      {verDinero && (() => {
        const f = esTodos ? null : obraSel;
        const pres = f ? f.presupuesto : resumen.presupuesto;
        const cdP = f ? f.cdPres : resumen.cdPres;
        const ggP = f ? f.ggPres : resumen.ggPres;
        const utP = f ? f.utPres : resumen.utPres;
        const cdR = f ? f.cdReal : resumen.cdReal;
        const ggR = f ? f.ggReal : resumen.ggReal;
        return (
        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Control presupuestal">
          <div className="kpi-tarjeta">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Presupuesto vigente</p>
            <p className="mt-1.5 text-xl font-bold tabular-nums text-ink">{soles(pres)}</p>
            <div className="mt-1.5 space-y-0.5 pr-2 text-[11px] tabular-nums text-muted-foreground">
              <p className="flex justify-between"><span>Costo directo</span><span>{soles(cdP)}</span></p>
              <p className="flex justify-between"><span>Gastos generales</span><span>{soles(ggP)}</span></p>
              <p className="flex justify-between"><span>Utilidad proyectada 🔒</span><span>{soles(utP)}</span></p>
            </div>
          </div>
          <BolsaEjecutada etiqueta="Costo directo ejecutado" real={cdR} base={cdP} />
          <BolsaEjecutada etiqueta="Gastos generales ejecutados" real={ggR} base={ggP} />
          <UtilidadReal proyectada={utP} real={utP + (cdP - cdR) + (ggP - ggR)} />
        </section>
        );
      })()}

      {verDinero && !esTodos && (
        <div className="mb-4 space-y-2">
          <Pestanas
            etiqueta="Desglose del presupuesto"
            valor={desglose}
            onCambiar={setDesglose}
            opciones={[{ id: "cd", texto: "Desglose de costo directo" }, { id: "gg", texto: "Desglose de gastos generales" }]}
          />
          {desglose === "cd" ? <DesgloseCd proyectoId={obraId} /> : <DesgloseGg proyectoId={obraId} base={obraSel?.ggPres ?? 0} />}
        </div>
      )}

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
    <div className="relative mx-auto h-28 w-full max-w-52 overflow-hidden" aria-label={`Avance físico ${pct(valor)}`}>
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
        <p className="font-mono text-2xl font-bold" style={{ color }}>{pct(valor)}</p>
        <p className="label-mono text-[10px]">Ejecutado</p>
      </div>
    </div>
  );
}

/** Semáforo suave de consumo contra la base: verde normal, ámbar al acercarse (≥85%), rojo al superar. */
function nivelConsumo(real: number, base: number): "ok" | "cerca" | "excedido" {
  if (real > base + 0.005) return "excedido";
  const p = base > 0 ? (real / base) * 100 : real > 0 ? 100 : 0;
  return p >= 85 ? "cerca" : "ok";
}

function FilaSemaforo({ etiqueta, real, base }: { etiqueta: string; real: number; base: number }) {
  const nivel = nivelConsumo(real, base);
  const p = base > 0 ? (real / base) * 100 : real > 0 ? 100 : 0;
  const punto = nivel === "excedido" ? "bg-bad" : nivel === "cerca" ? "bg-warn" : "bg-good";
  const pildora = nivel === "excedido" ? "bg-bad/10 text-bad" : nivel === "cerca" ? "bg-warn/10 text-warn" : "bg-good/10 text-good";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punto}`} />
        {etiqueta}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-ink">
          {soles(real)} <span className="text-muted-foreground">/ {soles(base)}</span>
        </span>
        <span className={`rounded-full px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums ${pildora}`}>{pct(p)}</span>
      </span>
    </div>
  );
}

function BolsaEjecutada({ etiqueta, real, base }: { etiqueta: string; real: number; base: number }) {
  const nivel = nivelConsumo(real, base);
  const p = base > 0 ? (real / base) * 100 : real > 0 ? 100 : 0;
  const excedido = nivel === "excedido";
  const cerca = nivel === "cerca";
  const saldo = base - real;
  return (
    <div data-distintivo={excedido ? "bad" : cerca ? "warn" : "monto"} className={`kpi-tarjeta ${excedido ? "ring-1 ring-bad/40" : cerca ? "ring-1 ring-warn/30" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${excedido ? "bg-bad/10 text-bad" : cerca ? "bg-warn/10 text-warn" : "bg-good/10 text-good"}`}>{pct(p)}</span>
      </div>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${excedido ? "text-bad" : "text-ink"}`}>{soles(real)}</p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${excedido ? "bg-bad" : cerca ? "bg-warn" : "bg-good"}`} style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <p className={`mt-1 text-[11px] tabular-nums ${excedido ? "font-semibold text-bad" : "text-muted-foreground"}`}>
        Base {soles(base)} · {saldo < -0.005 ? `excedes ${soles(Math.abs(saldo))}` : `te quedan ${soles(saldo)}`}
      </p>
    </div>
  );
}

function UtilidadReal({ proyectada, real }: { proyectada: number; real: number }) {
  const critico = proyectada > 0 && real <= 0;
  const p = proyectada > 0 ? (real / proyectada) * 100 : 0;
  return (
    <div data-distintivo={critico ? "bad" : real < proyectada ? "warn" : "monto"} className={`kpi-tarjeta ${critico ? "ring-1 ring-bad/40" : real < proyectada ? "ring-1 ring-warn/40" : "ring-1 ring-good/30"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Utilidad real</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${critico ? "bg-bad/10 text-bad" : real < proyectada ? "bg-warn/10 text-warn" : "bg-good/10 text-good"}`}>{pct(p)} de la proyectada</span>
      </div>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${critico ? "text-bad" : real < proyectada ? "text-warn" : "text-good"}`}>{soles(real)}</p>
      <p className={`mt-1 text-[11px] ${critico ? "font-semibold text-bad" : "text-muted-foreground"}`}>
        {critico ? "⚠ Alerta crítica: la obra ya no deja utilidad" : real < proyectada ? `Excesos de costo restan ${soles(proyectada - real)}` : real > proyectada ? `Ahorros en costos suman ${soles(real - proyectada)}` : `Utilidad proyectada intacta (${soles(proyectada)})`}
      </p>
    </div>
  );
}

function MiniDato({ icono, etiqueta, valor, detalle, tono }: { icono: ReactNode; etiqueta: string; valor: string; detalle?: string; tono: "good" | "warn" | "bad" | "primary" }) {
  return (
    <div className="dash-tarjeta dash-pastilla flex items-center gap-3 px-3 py-2.5">
      <span className="dash-icono dash-icono-sm" data-tono={tono}>{icono}</span>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-xs text-muted-foreground">{etiqueta}</p>
        <p className="font-mono text-lg font-semibold leading-tight text-ink">{valor}</p>
        {detalle && <p className="truncate text-[10px] text-muted-foreground">{detalle}</p>}
      </div>
    </div>
  );
}

function BarraTiempo({ etiqueta, valor, tenue }: { etiqueta: string; valor: number; tenue?: boolean }) {
  const v = Math.min(Math.max(valor, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] opacity-90">{etiqueta}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-sm bg-card/25">
        <div className={`h-full rounded-sm ${tenue ? "bg-card/60" : "bg-card"}`} style={{ width: `${v}%` }} />
      </div>
      <span className="w-12 text-right font-mono text-[11px]">{pct(valor)}</span>
    </div>
  );
}

function Anillo({ valor, alerta }: { valor: number; alerta?: boolean }) {
  const v = Math.min(Math.max(valor, 0), 100);
  const r = 46;
  const c = 2 * Math.PI * r;
  const tono = alerta ? "text-warn" : valor >= 85 ? "text-warn" : "";
  return (
    <div className={`relative h-24 w-24 shrink-0 ${tono}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="14" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-semibold leading-none">{pct(valor)}</span>
        <span className="text-[8px] uppercase tracking-wide opacity-80">gastado</span>
      </span>
      {alerta && <AlertTriangle size={14} className="absolute -right-1 -top-1 rounded-full bg-warn p-0.5 text-warn-foreground" />}
    </div>
  );
}

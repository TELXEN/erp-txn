import { DesgloseCd } from "@/components/DesgloseCd";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Briefcase, CalendarClock, CalendarDays, CircleDollarSign, ClipboardList, Clock3, Flag, Gauge, Hourglass, Layers3, ListTodo, Lock, Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, Vacio } from "@/components/ui-kit";
import { CurvaS } from "@/components/CurvaS";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { tonoSituacion } from "@/lib/configuracion";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { nombresEstados, useEstadosProyecto, type Proyecto } from "@/lib/datos";

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
import { useTareoVehiculos } from "@/lib/vehiculos";
import { useCostoObras } from "@/lib/costo-obra";
import { limiteCompra, useSolicitudesDesbloqueo, useToleranciaAvance } from "@/lib/sobrecosto";
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
  const estadosQ = useEstadosProyecto();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { costoDe } = useCostoObras();
  const { data: tareoVeh = [] } = useTareoVehiculos();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: cronograma = [] } = useCronograma();
  const { data: solicitudes = [] } = useSolicitudesDesbloqueo();
  const { data: tolerancia = 15 } = useToleranciaAvance();
  const [obraId, setObraId] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");

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
    const desviacion = programado === null ? null : avance - programado;
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

  // Movimientos fechados de la Curva S: el total acumulado coincide con costoDe() (fuente única).
  const movimientos = useMemo(() => {
    const id = obraSel?.proyecto.id;
    if (!esTodos && (!id || id === "todos")) return [];
    const ids = esTodos ? Array.from(new Set(proyectos.map((p) => p.id))) : [id as string];
    const out: { fecha: string; monto: number }[] = [];
    ids.forEach((pid) => {
      const c = costoDe(pid);
      gastosD.filter((g) => g.proyecto_id === pid).forEach((g) => out.push({ fecha: g.fecha, monto: Number(g.monto_soles) }));
      gastosG.filter((g) => g.proyecto_id === pid).forEach((g) => out.push({ fecha: g.fecha, monto: Number(g.monto_soles) }));
      tareoVeh.filter((t: { proyecto_id: string }) => t.proyecto_id === pid).forEach((t: { fecha: string; costo_soles: number }) => out.push({ fecha: t.fecha, monto: Number(t.costo_soles) }));
      // Personal (boletas/recibos repartidos por tareo): se distribuye en las fechas del tareo.
      const personal = c.mod + c.honorarios + c.staff;
      const tar = tareos.filter((t) => t.proyecto_id === pid);
      const base = tar.reduce((s, t) => s + Number(t.costo_soles || 0), 0);
      if (personal > 0 && tar.length > 0) {
        tar.forEach((t) => out.push({ fecha: t.fecha, monto: base > 0 ? (personal * Number(t.costo_soles || 0)) / base : personal / tar.length }));
      }
    });
    return out;
  }, [esTodos, obraSel, proyectos, costoDe, gastosD, gastosG, tareos, tareoVeh]);

  const partidasHoja = useMemo(() => {
    if (!obraSel) return [];
    if (esTodos) {
      const padres = new Set(partidas.map((x) => x.padre_id).filter(Boolean));
      return partidas.filter((p) => !padres.has(p.id));
    }
    const propias = partidas.filter((p) => p.proyecto_id === obraSel.proyecto.id);
    const padres = new Set(propias.map((x) => x.padre_id).filter(Boolean));
    return propias.filter((p) => !padres.has(p.id));
  }, [esTodos, obraSel, partidas]);

  const prioridadAlta = useMemo(() => {
    if (!obraSel) return 0;
    if (esTodos) return partidas.filter((p) => p.prioridad === "Alta").length;
    return partidas.filter((p) => p.proyecto_id === obraSel.proyecto.id && p.prioridad === "Alta").length;
  }, [esTodos, obraSel, partidas]);

  /** Estado del candado por partida: real acumulado frente a presupuesto × (1 + tolerancia). */
  const filasPartidas = useMemo(() => {
    const hoy = new Date().toISOString();
    const autorizadas = new Set(
      solicitudes
        .filter((s) => s.estado === "Aprobada" && !s.usada_en && s.vence_en && s.vence_en > hoy && s.partida_id)
        .map((s) => s.partida_id as string),
    );
    const gastoPorPartida = new Map<string, number>();
    for (const g of gastosD) {
      if (!g.partida_id) continue;
      gastoPorPartida.set(g.partida_id, (gastoPorPartida.get(g.partida_id) ?? 0) + Number(g.monto_soles));
    }
    return partidasHoja
      .filter((p) => Number(p.presupuesto_inicial) > 0)
      .map((p) => {
        const presupuesto = Number(p.presupuesto_inicial);
        const avance = Number(p.avance_pct);
        const limite = limiteCompra(presupuesto, avance, Number(tolerancia));
        const real = gastoPorPartida.get(p.id) ?? 0;
        return {
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          obra: proyectos.find((x) => x.id === p.proyecto_id)?.nombre ?? "—",
          avance,
          presupuesto,
          real,
          limite,
          consumo: limite > 0 ? (real / limite) * 100 : 0,
          bloqueada: !autorizadas.has(p.id) && real >= limite - 0.005,
        };
      })
      .sort((a, b) => Number(b.bloqueada) - Number(a.bloqueada) || b.consumo - a.consumo);
  }, [gastosD, partidasHoja, proyectos, solicitudes, tolerancia]);

  const bloqueadas = filasPartidas.filter((r) => r.bloqueada).length;
  const solicitudesPendientes = solicitudes.filter((s) => s.estado === "Pendiente").length;

  const verDinero = puedeVerDinero(rol);
  const programadoSel = obraSel?.programado ?? null;
  const hoyTexto = useMemo(() => {
    const d = new Date();
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", ...o }).format(d);
    return { dia: f({ weekday: "long" }), numero: f({ day: "numeric" }), mes: f({ month: "long" }) };
  }, []);

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
        {/* Fila superior: fecha, total de proyectos y proyecto elegido */}
        <section className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="dash-tarjeta flex flex-col justify-center p-5">
            <span className="dash-icono" data-tono="accent"><CalendarDays size={20} /></span>
            <p className="mt-3 text-xl capitalize text-primary">{hoyTexto.dia}</p>
            <p className="font-mono text-5xl font-light leading-none text-ink">{hoyTexto.numero}</p>
            <p className="mt-1 text-lg uppercase tracking-wide text-muted-foreground">{hoyTexto.mes}</p>
          </div>

          <div className="dash-tarjeta dash-degradado p-5" data-tono="primary">
            <div className="flex items-center gap-3">
              <span className="dash-icono dash-icono-claro"><Briefcase size={18} /></span>
              <p className="text-lg">Total proyectos · {proyectos.length}</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TARJETAS_ESTADO.map(({ etiqueta, situacion }) => {
                const cantidad = proyectos.filter((p) => p.situacion === situacion).length;
                const activa = filtroEstado === situacion;
                return (
                  <button
                    key={situacion}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setFiltroEstado(activa ? "Todos" : situacion)}
                    className="flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <span className="font-mono text-4xl font-light tabular-nums">{cantidad}</span>
                    <span className={`dash-chip w-full ${activa ? "dash-chip-activo" : ""}`}>{etiqueta}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="dash-tarjeta p-4">
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
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TARJETAS_ESTADO.map(({ etiqueta, situacion }) => {
                  const cantidad = proyectos.filter((p) => p.situacion === situacion).length;
                  return (
                    <div key={situacion} className="rounded-lg px-2 py-1.5 text-center text-primary-foreground shadow-sm" style={{ backgroundColor: tonoSituacion(situacion).borde }}>
                      <p className="text-[10px] opacity-90">{etiqueta}</p>
                      <p className="font-mono text-2xl font-semibold leading-tight">{cantidad}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
              <MiniDato icono={<Layers3 size={16} />} tono="good" etiqueta="Total partidas" valor={String(obraSel?.partidas ?? 0)}
                detalle={`${obraSel?.partidasContractuales ?? 0} contr. · ${obraSel?.partidasAdicionales ?? 0} adic.`} />
              <MiniDato icono={<ListTodo size={16} />} tono="warn" etiqueta="Partidas pendientes" valor={String(obraSel?.partidasPendientes ?? 0)} />
              <MiniDato icono={<AlertTriangle size={16} />} tono="bad" etiqueta="Prioridad alta" valor={String(prioridadAlta)} />
              <MiniDato icono={<Hourglass size={16} />} tono="primary" etiqueta={plazo?.vencido ? "Plazo vencido" : "Días restantes"}
                valor={plazo ? String(Math.abs(plazo.dias)) : "—"} />
            </div>
          </div>
        </section>

        {/* Fila inferior: progreso, línea de tiempo y presupuesto */}
        <section className={`grid gap-4 ${verDinero ? "lg:grid-cols-[1fr_1.3fr_1.2fr]" : "lg:grid-cols-[1fr_1.6fr]"}`}>
          <div className="dash-tarjeta p-5">
            <div className="flex items-center gap-3">
              <span className="dash-icono" data-tono="muted"><Gauge size={18} /></span>
              <p className="text-lg text-ink">Progreso</p>
            </div>
            {!obraSel ? <Vacio texto="Registra una obra para visualizar el avance." /> : (
              <>
                <div className="mt-3"><MedidorCompacto valor={obraSel.avance} /></div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {programadoSel === null ? "Sin avance programado oficial"
                    : obraSel.avance + 0.05 < programadoSel ? <span className="font-semibold text-bad">-{pct(programadoSel - obraSel.avance)} · Retraso</span>
                    : <span className="font-semibold text-good">+{pct(obraSel.avance - programadoSel)} · En plazo o adelantada</span>}
                </p>
              </>
            )}
          </div>

          <div className="dash-tarjeta dash-degradado p-5" data-tono="violeta">
            <div className="flex items-center gap-3">
              <span className="dash-icono dash-icono-claro"><CalendarClock size={18} /></span>
              <p className="text-lg">Línea de tiempo</p>
            </div>
            <div className="mt-6 flex justify-between font-mono text-xs opacity-90">
              <span>{fecha(obraSel?.proyecto.fecha_inicio ?? null)}</span>
              <span>{fecha(obraSel?.proyecto.fecha_fin ?? null)}</span>
            </div>
            <div className="mt-2 space-y-2">
              <BarraTiempo etiqueta="Real" valor={obraSel?.avance ?? 0} />
              <BarraTiempo etiqueta="Programado" valor={programadoSel ?? 0} tenue />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] opacity-80">
              {[0, 20, 40, 60, 80, 100].map((n) => <span key={n}>{n}%</span>)}
            </div>
            <p className="mt-3 font-mono text-[11px] opacity-90">
              Corte: {obraSel?.usaCalendario ? fecha(hoyISO()) : obraSel?.proyecto.fecha_corte_programado ? fecha(obraSel.proyecto.fecha_corte_programado) : "Sin registrar"}
            </p>
          </div>

          {verDinero && (
            <div className="dash-tarjeta dash-degradado p-5" data-tono="good">
              <div className="flex items-center gap-3">
                <span className="dash-icono dash-icono-claro"><CircleDollarSign size={18} /></span>
                <p className="text-lg">Presupuesto</p>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <Anillo valor={(obraSel?.gastado ?? 0)} />
                <div className="min-w-0 space-y-2">
                  <div><p className="font-mono text-lg font-semibold">{soles(obraSel?.presupuesto ?? 0)}</p><p className="text-xs opacity-90">Total presupuesto</p></div>
                  <div><p className="font-mono text-lg font-semibold">{soles(obraSel?.costoReal ?? 0)}</p><p className="text-xs opacity-90">Total gastado</p></div>
                </div>
              </div>
              <div className="mt-3 space-y-1 rounded-lg bg-card p-2 text-ink">
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
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{soles(pres)}</p>
            <div className="mt-2 space-y-0.5 text-[11px] tabular-nums text-muted-foreground">
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

      {verDinero && !esTodos && <div className="mb-4"><DesgloseCd proyectoId={obraId} /></div>}

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
            presupuestoCosto={obraSel.cdPres + obraSel.ggPres}
            presupuestoContractual={obraSel.presupuestoContractual}
            adicionales={obraSel.adicionales}
            avanceFisico={obraSel.avance}
            avanceProgramadoOficial={obraSel.programado}
            fechaCorteProgramado={obraSel.proyecto.fecha_corte_programado}
            movimientos={movimientos}
            partidas={partidasHoja}
            cronograma={cronograma}
            periodicidad={esTodos ? "mes" : (obraSel.proyecto.periodicidad_cronograma ?? "mes")}
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
          <ul className="grid gap-3 p-4 lg:grid-cols-2">
            {cartera.map((f) => (
              <li
                key={f.proyecto.id}
                className={`proyecto-tarjeta ${f.proyecto.id === obraSel?.proyecto.id ? "ring-2 ring-primary" : ""}`}
                style={{ borderLeftColor: tonoSituacion(f.proyecto.situacion).borde, backgroundImage: `linear-gradient(90deg, ${tonoSituacion(f.proyecto.situacion).fondo}55, transparent 40%)` }}
              >
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
                    <p className={`font-mono ${f.diferencia < 0 ? "mt-1 text-[12px] font-semibold text-bad" : "text-[11px] text-muted-foreground"}`}>
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
                    <p className={`text-right font-mono font-semibold ${f.desviacion < -0.05 ? "ml-auto w-fit rounded-md bg-bad/10 px-2 py-0.5 text-[13px] text-bad" : "text-[10px] text-good"}`}>
                      {f.desviacion < -0.05 ? `${pct(Math.abs(f.desviacion))} de retraso` : `${pct(f.desviacion)} en plazo o adelantada`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
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
      } ${cantidad === 0 && !activa ? "opacity-50" : ""}`}
    >
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span>{etiqueta}</span>
      <span className={`rounded-full px-1.5 ${activa ? "bg-primary/15 text-primary" : cantidad === 0 ? "bg-muted text-muted-foreground" : "bg-muted text-ink"}`}>{cantidad}</span>
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
      {valor === null ? (
        <div
          className="h-2.5 flex-1 rounded-full opacity-60"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--muted-foreground) 35%, transparent) 0 4px, transparent 4px 8px)" }}
          title="Sin dato"
        />
      ) : (
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={`h-full growx rounded-full ${clase}`} style={{ width: `${Math.min(valor, 100)}%` }} />
        </div>
      )}
      <span className={`w-14 text-right font-mono text-[11px] ${valor === null ? "text-muted-foreground/70" : ""}`}>{valor === null ? "Sin dato" : pct(valor)}</span>
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
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punto}`} />
        {etiqueta}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-ink">
          {soles(real)} <span className="text-muted-foreground">/ {soles(base)}</span>
        </span>
        <span className={`rounded-full px-1.5 py-px font-mono text-[9px] font-semibold tabular-nums ${pildora}`}>{pct(p)}</span>
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
      <p className={`mt-2 text-2xl font-bold tabular-nums ${excedido ? "text-bad" : "text-ink"}`}>{soles(real)}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
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
      <p className={`mt-2 text-2xl font-bold tabular-nums ${critico ? "text-bad" : real < proyectada ? "text-warn" : "text-good"}`}>{soles(real)}</p>
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

function Anillo({ valor }: { valor: number }) {
  const v = Math.min(Math.max(valor, 0), 100);
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-light">{pct(valor)}</span>
    </div>
  );
}

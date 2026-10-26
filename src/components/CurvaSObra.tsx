import { CurvaS, type Movimiento } from "@/components/CurvaS";
import { Panel, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { useCostoObras } from "@/lib/costo-obra";
import { esContractual, hoyISO, ofertaProyecto, programadoCronograma, useCronograma, useGastosDirectos, useGastosGenerales, usePartidas, useProyectos, useTareos, useTiposPresupuesto } from "@/lib/datos";
import { useTareoVehiculos } from "@/lib/vehiculos";

/** La misma Curva S para una obra o la cartera, sin alterar los datos del cronograma. */
export function CurvaSObra({ proyectoId }: { proyectoId: string }) {
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: cronograma = [] } = useCronograma();
  const { data: tipos = [] } = useTiposPresupuesto();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { data: tareoVeh = [] } = useTareoVehiculos();
  const { costoDe } = useCostoObras();
  const mostrarDinero = puedeVerDinero(rol);
  const obras = proyectos.filter((p) => !p.archivado_en && (!proyectoId || p.id === proyectoId));
  const ids = new Set(obras.map((p) => p.id));
  const propias = partidas.filter((p) => ids.has(p.proyecto_id));
  const padres = new Set(propias.map((p) => p.padre_id).filter(Boolean));
  const hojas = propias.filter((p) => !padres.has(p.id));
  const filas = obras.map((p) => {
    const lista = propias.filter((x) => x.proyecto_id === p.id);
    const hoja = hojas.filter((x) => x.proyecto_id === p.id);
    const oferta = (items: typeof lista) => ofertaProyecto(items, tipos, Number(p.pct_gastos_generales), Number(p.pct_utilidad));
    const total = oferta(lista);
    const contractual = oferta(lista.filter((x) => esContractual(x.tipo_presupuesto ?? "Contractual", tipos))).ofertado;
    const adicionales = oferta(lista.filter((x) => !esContractual(x.tipo_presupuesto ?? "Contractual", tipos))).ofertado;
    const base = hoja.reduce((s, x) => s + Number(x.presupuesto_inicial), 0);
    const avance = base > 0 ? hoja.reduce((s, x) => s + Number(x.avance_pct) * Number(x.presupuesto_inicial), 0) / base : hoja.reduce((s, x) => s + Number(x.avance_pct), 0) / (hoja.length || 1);
    const programado = programadoCronograma(hoja, cronograma, hoyISO(), p.periodicidad_cronograma ?? "mes") ?? (p.avance_programado_pct == null ? null : Number(p.avance_programado_pct));
    return { p, contractual, adicionales, presupuesto: contractual + adicionales, costo: total.costoDirecto + total.gastosGenerales, avance, programado };
  });
  const presupuesto = filas.reduce((s, f) => s + f.presupuesto, 0);
  const avance = presupuesto > 0 ? filas.reduce((s, f) => s + f.avance * f.presupuesto, 0) / presupuesto : filas.reduce((s, f) => s + f.avance, 0) / (filas.length || 1);
  const conProgramado = filas.filter((f) => f.programado !== null);
  const baseProg = conProgramado.reduce((s, f) => s + f.presupuesto, 0);
  const programado = !conProgramado.length ? null : baseProg > 0 ? conProgramado.reduce((s, f) => s + (f.programado ?? 0) * f.presupuesto, 0) / baseProg : conProgramado.reduce((s, f) => s + (f.programado ?? 0), 0) / conProgramado.length;
  const movimientos: Movimiento[] = [];
  if (mostrarDinero) obras.forEach((p) => {
    const c = costoDe(p.id);
    gastosD.filter((g) => g.proyecto_id === p.id).forEach((g) => movimientos.push({ fecha: g.fecha, monto: Number(g.monto_soles) }));
    gastosG.filter((g) => g.proyecto_id === p.id).forEach((g) => movimientos.push({ fecha: g.fecha, monto: Number(g.monto_soles) }));
    tareoVeh.filter((t) => t.proyecto_id === p.id).forEach((t) => movimientos.push({ fecha: t.fecha, monto: Number(t.costo_soles) }));
    const personal = c.mod + c.honorarios + c.staff;
    const tar = tareos.filter((t) => t.proyecto_id === p.id);
    const base = tar.reduce((s, t) => s + Number(t.costo_soles || 0), 0);
    if (personal > 0 && tar.length > 0) tar.forEach((t) => movimientos.push({ fecha: t.fecha, monto: base > 0 ? personal * Number(t.costo_soles || 0) / base : personal / tar.length }));
  });
  const inicios = obras.map((p) => p.fecha_inicio).filter((f): f is string => Boolean(f)).sort();
  const fines = obras.map((p) => p.fecha_fin).filter((f): f is string => Boolean(f)).sort();
  const individual = proyectoId ? obras[0] : undefined;
  return (
    <Panel titulo={mostrarDinero ? "Curva S — Avance programado, real y costo" : "Curva S — Avance programado versus real"}>
      {!obras.length ? <Vacio texto="Registra una obra para visualizar su curva S." /> : <CurvaS
        fechaInicio={individual ? individual.fecha_inicio : inicios[0] ?? null}
        fechaFin={individual ? individual.fecha_fin : fines.at(-1) ?? null}
        presupuesto={presupuesto}
        presupuestoCosto={filas.reduce((s, f) => s + f.costo, 0)}
        presupuestoContractual={filas.reduce((s, f) => s + f.contractual, 0)}
        adicionales={filas.reduce((s, f) => s + f.adicionales, 0)}
        avanceFisico={avance}
        avanceProgramadoOficial={programado}
        fechaCorteProgramado={individual?.fecha_corte_programado ?? null}
        movimientos={movimientos}
        partidas={hojas}
        cronograma={cronograma}
        periodicidad={individual?.periodicidad_cronograma ?? "mes"}
        mostrarDinero={mostrarDinero}
      />}
    </Panel>
  );
}
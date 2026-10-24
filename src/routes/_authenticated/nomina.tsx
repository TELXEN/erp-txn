import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { BotonIcono } from "@/components/ui-kit";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Database, Lock, FileText, RefreshCw, Trash2, Unlock, Upload, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Pestanas, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, hoy, MESES, soles } from "@/lib/format";
import { type Trabajador, useTareos, useTrabajadores } from "@/lib/datos";
import { resumenTareoHonorario } from "@/components/personal/DetallePagoHonorario";
import { useEmpresa } from "@/lib/empresa";
import { DetallePagoNomina, type BoletaNomina, type ValoresNomina } from "@/components/personal/DetallePagoNomina";
import { exportarExcel } from "@/lib/exportar";
import { aporteAfp, useComisionesAfp } from "@/lib/afp";
import type { ComisionAfp } from "@/lib/decolecta.functions";
import { calcularRentaQuinta, uitDe, type DetalleQuinta } from "@/lib/renta-quinta";

export const Route = createFileRoute("/_authenticated/nomina")({
  head: () => ({
    meta: [
      { title: "Nómina y Boletas — ERP TELXEN" },
      { name: "description", content: "Planilla mensual, boletas de pago, aportes ONP/AFP y EsSalud." },
      { property: "og:title", content: "Nómina y Boletas — ERP TELXEN" },
      { property: "og:description", content: "Cálculo de planilla mensual y emisión de boletas de pago." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Nomina,
});

// Parámetros legales vigentes (Perú). Las tasas AFP vienen de Decolecta (useComisionesAfp).
/** RMV vigente por período (S/ 1,230 desde octubre 2026). */
const rmvDe = (periodo: string) => (periodo >= "2026-10" ? 1230 : 1130);
const TASA_ONP = 0.13;
const SIS_MICRO = 15;

type Planilla = { id: string; anio: number; mes: number; estado: string };
type Boleta = BoletaNomina;

const r2 = (n: number) => Math.round(n * 100) / 100;

function calcularBoleta(
  t: Pick<Trabajador, "sueldo_mensual" | "regimen_laboral" | "sistema_pensiones" | "asignacion_familiar">,
  v: { dias_laborados: number; horas_extra: number; otros_ingresos: number; renta_quinta: number; otros_descuentos: number },
  comisiones: ComisionAfp[],
  RMV: number,
) {
  const sueldo_basico = r2((Number(t.sueldo_mensual) * v.dias_laborados) / 30);
  const aplicaAsig = t.asignacion_familiar && !t.regimen_laboral.startsWith("MYPE");
  const asignacion_familiar = aplicaAsig ? r2(RMV * 0.1) : 0;
  const total_ingresos = r2(sueldo_basico + asignacion_familiar + v.horas_extra + v.otros_ingresos);
  let aporte = 0;
  if (t.sistema_pensiones === "ONP") aporte = total_ingresos * TASA_ONP;
  else if (t.sistema_pensiones.startsWith("AFP")) aporte = aporteAfp(comisiones.find((c) => c.afp === t.sistema_pensiones), total_ingresos);
  const aporte_pension = r2(aporte);
  const total_descuentos = r2(aporte_pension + v.renta_quinta + v.otros_descuentos);
  const base = Math.max(total_ingresos, total_ingresos > 0 ? RMV : 0);
  const essalud =
    t.regimen_laboral === "MYPE Micro" ? SIS_MICRO : r2(base * (t.regimen_laboral === "Agrario" ? 0.06 : 0.09));
  return {
    ...v,
    sueldo_basico,
    asignacion_familiar,
    total_ingresos,
    aporte_pension,
    total_descuentos,
    neto_pagar: r2(total_ingresos - total_descuentos),
    essalud,
    regimen_laboral: t.regimen_laboral,
    sistema_pensiones: t.sistema_pensiones,
  };
}

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

/** "2026-10-07T17:33:00.000Z" → "07/10/2026 12:33" en hora local. */
const fechaHora = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function Nomina() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [], isFetched: personalListo } = useTrabajadores();
  const { data: tareos = [], isFetched: tareoListo } = useTareos();
  const { data: empresa } = useEmpresa();
  const ahora = new Date();
  const [sel, setSel] = useState("");
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [detalle, setDetalle] = useState<Boleta | null>(null);
  const [pestana, setPestana] = useState<"planilla" | "datos">("planilla");
  const [pago, setPago] = useState<{ boleta_id?: string; banco_id: string; fecha_pago: string; numero_operacion: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!pago?.boleta_id) return;
    const contenedor = document.getElementById("nomina-pago-individual")?.closest("table")?.parentElement;
    if (contenedor) contenedor.scrollLeft = contenedor.scrollWidth;
  }, [pago?.boleta_id]);
  const periodoAfp = `${anio}-${String(mes).padStart(2, "0")}`;
  const { comisiones, origen: origenAfp, data: afpData, actualizar: actualizarAfp, isFetching: cargandoAfp } = useComisionesAfp(periodoAfp);
  const [msgAfp, setMsgAfp] = useState("");
  const esGestor = rol === "gerente" || rol === "administrador";

  const { data: planilla = null } = useQuery({
    queryKey: ["planilla", anio, mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("planillas").select("*").eq("anio", anio).eq("mes", mes).maybeSingle();
      if (error) throw error;
      return data as Planilla | null;
    },
  });
  const { data: boletas = [] } = useQuery({
    queryKey: ["boletas", planilla?.id],
    enabled: !!planilla,
    queryFn: async () => {
      if (!planilla) return [];
      const { data, error } = await supabase.from("boletas").select("*").eq("planilla_id", planilla.id);
      if (error) throw error;
      return data as Boleta[];
    },
  });
  const { data: previasAnio = [] } = useQuery({
    queryKey: ["boletas-anio", anio, mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("boletas").select("trabajador_id,total_ingresos,renta_quinta,planillas!inner(anio,mes)").eq("planillas.anio", anio).lt("planillas.mes", mes);
      if (error) throw error;
      return data as { trabajador_id: string; total_ingresos: number; renta_quinta: number }[];
    },
  });
  /** Detalle de renta de 5ta del trabajador para el mes, con la remuneración del mes indicada. */
  const quinta = (t: Trabajador, sueldoMes: number): DetalleQuinta => {
    const prev = previasAnio.filter((b) => b.trabajador_id === t.id);
    return calcularRentaQuinta({
      mes, sueldoMes, uit: uitDe(anio), eps: (t as Trabajador & { seguro_salud?: string }).seguro_salud === "EPS",
      pagadoAnterior: prev.reduce((s, b) => s + Number(b.total_ingresos), 0),
      retenidoAnterior: prev.reduce((s, b) => s + Number(b.renta_quinta), 0),
    });
  };
  /** Calcula la boleta poniendo la renta de 5ta automática salvo que sea manual. */
  const calcConQuinta = (t: Trabajador, v: Parameters<typeof calcularBoleta>[1], manual: boolean) => {
    if (manual) return calcularBoleta(t, v, comisiones, rmvDe(periodoAfp));
    const base = calcularBoleta(t, { ...v, renta_quinta: 0 }, comisiones, rmvDe(periodoAfp));
    return calcularBoleta(t, { ...v, renta_quinta: quinta(t, base.total_ingresos).retencion }, comisiones, rmvDe(periodoAfp));
  };
  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const enPlanilla = trabajadores.filter((t) => t.tipo_contratacion !== "Honorarios" && t.activo);
  const tDe = (id: string) => trabajadores.find((t) => t.id === id);
  const cerrada = planilla?.estado === "Cerrada";
  const periodo = `${MESES[mes - 1]} ${anio}`;
  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["planilla", anio, mes] });
    await qc.invalidateQueries({ queryKey: ["boletas"] });
  };

  /** Días y horas extra del trabajador según el tareo del período (todas las obras). */
  const datosTareo = (t: Trabajador) => {
    const r = resumenTareoHonorario(tareos, t.id, "", mes, anio, 0);
    if (!r.filas) return { dias_laborados: 30, horas_extra: 0, conTareo: false };
    const dias = Math.min(30, r.dias + r.viaje + r.feriados + r.induccion);
    // Horas extra valorizadas: hora = sueldo/240, recargo legal 25%.
    const horas_extra = r2(r.extras * (Number(t.sueldo_mensual) / 240) * 1.25);
    return { dias_laborados: dias, horas_extra, conTareo: true };
  };

  async function generar() {
    setError("");
    const sinSueldo = enPlanilla.filter((t) => !(Number(t.sueldo_mensual) > 0));
    if (enPlanilla.length === 0) return setError("No hay personal activo en Planilla.");
    let p = planilla;
    if (!p) {
      const { data, error: err } = await supabase.from("planillas").insert({ anio, mes }).select().single();
      if (err) return setError(err.message);
      p = data as Planilla;
    }
    if (!p || p.estado === "Cerrada") return;
    const planillaId = p.id;
    const existentes = new Set(boletas.map((b) => b.trabajador_id));
    const nuevas = enPlanilla
      .filter((t) => !existentes.has(t.id) && Number(t.sueldo_mensual) > 0)
      .map((t) => {
        const dt = datosTareo(t);
        return {
          planilla_id: planillaId,
          trabajador_id: t.id,
          ...calcConQuinta(t, { dias_laborados: dt.dias_laborados, horas_extra: dt.horas_extra, otros_ingresos: 0, renta_quinta: 0, otros_descuentos: 0 }, false),
        };
      });
    if (nuevas.length) {
      const { error: err } = await supabase.from("boletas").insert(nuevas);
      if (err) return setError(err.message);
    }
    // Actualiza las boletas pendientes con el tareo más reciente (las pagadas no se tocan).
    for (const b of boletas) {
      if (b.estado_pago === "Pagado") continue;
      const t = tDe(b.trabajador_id);
      if (!t) continue;
      const dt = datosTareo(t);
      if (!dt.conTareo) continue;
      if (dt.dias_laborados === Number(b.dias_laborados) && dt.horas_extra === Number(b.horas_extra)) continue;
      const calc = calcularBoleta(t, {
        dias_laborados: dt.dias_laborados,
        horas_extra: dt.horas_extra,
        otros_ingresos: Number(b.otros_ingresos),
        renta_quinta: Number(b.renta_quinta),
        otros_descuentos: Number(b.otros_descuentos),
      }, !!b.renta_quinta_manual);
      const { error: err } = await supabase.from("boletas").update(calc).eq("id", b.id);
      if (err) return setError(err.message);
    }
    if (sinSueldo.length)
      setError(`Sin sueldo mensual (no incluidos): ${sinSueldo.map((t) => t.nombre).join(", ")}. Complétalo en Personal.`);
    await refrescar();
  }

  // Recalcula únicamente boletas pendientes; no crea filas ni modifica las validadas.
  useEffect(() => {
    if (!puedeVerDinero(rol) || !planilla || cerrada || !personalListo || !tareoListo) return;
    let cancelado = false;
    const sincronizar = async () => {
      let cambios = false;
      for (const b of boletas) {
        if (cancelado) return;
        if (b.estado_pago === "Pagado") continue;
        const t = tDe(b.trabajador_id);
        if (!t) continue;
        const dt = datosTareo(t);
        const calc = calcConQuinta(t, { dias_laborados: dt.dias_laborados, horas_extra: dt.horas_extra, otros_ingresos: Number(b.otros_ingresos), renta_quinta: Number(b.renta_quinta), otros_descuentos: Number(b.otros_descuentos) }, !!b.renta_quinta_manual);
        const difiere = Object.entries(calc).some(([campo, valor]) => String(b[campo as keyof Boleta]) !== String(valor));
        if (!difiere) continue;
        const { error: err } = await supabase.from("boletas").update(calc).eq("id", b.id).eq("estado_pago", "Pendiente");
        if (err) { if (!cancelado) setError(err.message); return; }
        cambios = true;
      }
      if (cambios && !cancelado) await qc.invalidateQueries({ queryKey: ["boletas"] });
    };
    void sincronizar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareos, trabajadores, comisiones, planilla, boletas, previasAnio, cerrada, personalListo, tareoListo, periodoAfp, rol]);

  async function eliminar(b: Boleta) {
    if (cerrada) return setError("Reabre la planilla antes de eliminar una boleta.");
    if (b.estado_pago === "Pagado") return setError("No se puede eliminar una boleta pagada.");
    if (!window.confirm(`¿Eliminar la boleta de ${tDe(b.trabajador_id)?.nombre ?? "este trabajador"}?`)) return;
    const { error: err } = await supabase.from("boletas").delete().eq("id", b.id);
    if (err) return setError(err.message);
    await refrescar();
  }

  async function guardarDetalle(b: Boleta, valores: ValoresNomina): Promise<boolean> {
    const t = tDe(b.trabajador_id);
    if (!t || cerrada || b.estado_pago === "Pagado") return false;
    if (Object.values(valores).some((v) => !Number.isFinite(v) || v < 0) || valores.dias_laborados > 30) return false;
    const manual = !!b.renta_quinta_manual || Number(valores.renta_quinta) !== Number(b.renta_quinta);
    const calc = calcConQuinta(t, valores, manual);
    if (calc.neto_pagar < 0) return false;
    const { error: err } = await supabase.from("boletas").update({ ...calc, renta_quinta_manual: manual }).eq("id", b.id).eq("estado_pago", "Pendiente");
    if (err) { setError(err.message); return false; }
    await refrescar();
    return true;
  }

  async function cambiarEstado() {
    if (!planilla) return;
    if (detalle) return setError("Guarda y cierra el detalle antes de validar.");
    if (!cerrada && (boletas.length === 0 || boletas.some((b) => !Number.isFinite(Number(b.neto_pagar)) || Number(b.neto_pagar) < 0 || Number(b.total_ingresos) <= 0))) return setError("Revisa las boletas antes de validar: deben tener ingresos y un neto válido.");
    const nuevo = cerrada ? "Borrador" : "Cerrada";
    if (cerrada && boletas.some((b) => b.estado_pago === "Pagado")) return setError("No se puede reabrir: hay boletas pagadas.");
    const { error: err } = await supabase.from("planillas").update({ estado: nuevo }).eq("id", planilla.id);
    if (err) return setError(err.message);
    await refrescar();
  }

  async function pagarTodo() {
    if (!pago || !planilla) return;
    if (!cerrada) return setError("Valida las boletas antes de registrar el pago.");
    if (!pago.banco_id || !pago.fecha_pago || !pago.numero_operacion.trim())
      return setError("Para pagar indica banco, fecha y número de operación.");
    const { boleta_id, ...datosPago } = pago;
    let q = supabase
      .from("boletas")
      .update({ estado_pago: "Pagado", ...datosPago, numero_operacion: pago.numero_operacion.trim() })
      .eq("planilla_id", planilla.id)
      .eq("estado_pago", "Pendiente");
    if (boleta_id) q = q.eq("id", boleta_id);
    const { error: err } = await q;
    if (err) return setError(err.message);
    setPago(null);
    await refrescar();
  }

  const suma = (c: keyof Boleta) => boletas.reduce((s, b) => s + Number(b[c] ?? 0), 0);
  const ordenadas = [...boletas].sort((a, b) => (tDe(a.trabajador_id)?.nombre ?? "").localeCompare(tDe(b.trabajador_id)?.nombre ?? ""));
  const pendientes = boletas.filter((b) => b.estado_pago === "Pendiente").length;
  const celda = (b: Boleta, campo: keyof Boleta) => soles(Number(b[campo]));
  if (!puedeVerDinero(rol)) return <SinAcceso />;

  return (
    <>
      <Encabezado
        titulo="Nómina y Boletas"
        subtitulo="Planilla mensual del personal en 5ta categoría"
        acciones={
          pestana === "planilla" && (
            <div className="flex gap-2">
              {!cerrada && (
                <Boton variante="linea" onClick={generar}><Wand2 size={13} /> Generar boletas de pago</Boton>
              )}
              {boletas.length > 0 && (
              <Boton
                variante="linea"
                onClick={() =>
                  exportarExcel(`planilla-${anio}-${String(mes).padStart(2, "0")}`, [
                    {
                      nombre: "Planilla",
                      filas: ordenadas.map((b) => {
                        const t = tDe(b.trabajador_id);
                        return {
                          DNI: t?.dni ?? "", Trabajador: t?.nombre ?? "", Cargo: t?.cargo ?? "", Régimen: b.regimen_laboral,
                          CUSPP: t?.cuspp ?? "", Días: b.dias_laborados, "Básico (S/)": Number(b.sueldo_basico),
                          "Asig. familiar (S/)": Number(b.asignacion_familiar), "Horas extra (S/)": Number(b.horas_extra),
                          "Otros ingresos (S/)": Number(b.otros_ingresos), "Total ingresos (S/)": Number(b.total_ingresos),
                          "ONP/AFP (S/)": Number(b.aporte_pension), "Renta 5ta (S/)": Number(b.renta_quinta),
                          "Otros desc. (S/)": Number(b.otros_descuentos), "Total desc. (S/)": Number(b.total_descuentos),
                          "Neto (S/)": Number(b.neto_pagar), "EsSalud/SIS (S/)": Number(b.essalud), Estado: b.estado_pago,
                        };
                      }),
                    },
                  ])
                }
              >
                <Upload size={13} /> Exportar a Excel
              </Boton>
              )}
            </div>
          )
        }
      />

      <div className="mb-4">
        <Pestanas
          etiqueta="Nómina"
          valor={pestana}
          onCambiar={setPestana}
          opciones={[
            { id: "planilla", texto: "Planilla", icono: <ClipboardList size={13} /> },
            { id: "datos", texto: "Datos de AFP", icono: <Database size={13} /> },
          ]}
        />
      </div>

      {pestana === "datos" ? (
        <>
          <Panel className="mb-4" titulo="Comisiones AFP del mes" extra={
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {cargandoAfp ? "Consultando…" : origenAfp === "decolecta" ? `Decolecta · ${afpData?.periodoDatos}` : origenAfp === "guardado" ? `Último registro guardado · ${afpData?.periodoDatos}` : "Tasas de respaldo"}
          </span>
          {esGestor && (
            <Boton variante="linea" onClick={async () => { setMsgAfp(""); const r = await actualizarAfp(); setMsgAfp(r.mensaje); }}>
              <RefreshCw size={13} /> Actualizar desde Decolecta
            </Boton>
          )}
        </div>
      }>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">AFP</th><th className="px-3 py-2 text-right">Aporte al fondo</th><th className="px-3 py-2 text-right">Prima de seguro</th><th className="px-3 py-2 text-right">Comisión sobre flujo</th><th className="px-3 py-2 text-right">Total descuento</th><th className="px-3 py-2 text-right">Tope asegurable</th></tr>
          </thead>
          <tbody>
            {comisiones.map((c) => (
              <tr key={c.afp} className="border-t border-line">
                <td className="px-3 py-1.5">{c.afp}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{pct(c.aporte_fondo)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{pct(c.prima_seguro)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{pct(c.comision_flujo)}</td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{pct(c.aporte_fondo + c.prima_seguro + c.comision_flujo)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{c.tope_remuneracion > 0 ? soles(c.tope_remuneracion) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-1.5 text-[10px] text-muted-foreground">
          {afpData?.actualizadoEn
            ? `Última actualización desde Decolecta: ${fechaHora(afpData.actualizadoEn)}`
            : "Aún no hay una fecha de actualización de Decolecta para este período."}
        </p>
        {(msgAfp || afpData?.mensaje) && <p className="border-t border-line px-3 py-2 text-xs text-muted-foreground">{msgAfp || afpData?.mensaje}</p>}
      </Panel>

      <Panel titulo="Parámetros legales de referencia">
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Remuneración Mínima Vital (RMV)", `S/ ${rmvDe(periodoAfp).toLocaleString("es-PE", { minimumFractionDigits: 2 })} · vigente desde ${rmvDe(periodoAfp) === 1230 ? "01/10/2026" : "01/05/2022"}`],
              ["ONP", "13% de la remuneración"],
              ["EsSalud", "9% de la remuneración · Agrario 6%"],
              ["SIS Microempresa", "S/ 15.00 mensual"],
              ["Asignación familiar", "10% de la RMV"],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-line first:border-0">
                <td className="px-3 py-2">{k}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
        </>
      ) : (
        <>
          <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-3 p-3">
          <Campo etiqueta="Mes">
            <Select value={mes} onChange={(e) => { setMes(Number(e.target.value)); setDetalle(null); setPago(null); }} className="py-1.5">
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Año">
            <Input type="number" value={anio} onChange={(e) => { setAnio(Number(e.target.value)); setDetalle(null); setPago(null); }} className="w-24 py-1.5" />
          </Campo>
          {planilla && (
            <>
              <Etiqueta tono={cerrada ? "good" : "neutro"}>{cerrada ? "Validada" : "Borrador"}</Etiqueta>
              <Boton variante="linea" onClick={cambiarEstado}>
                {cerrada ? <><Unlock size={13} /> Reabrir</> : <><Lock size={13} /> Validar boletas</>}
              </Boton>
              {cerrada && pendientes > 0 && !pago && (
                <Boton variante="accion" onClick={() => setPago({ banco_id: "", fecha_pago: hoy(), numero_operacion: "" })}>
                  <Check size={13} /> Pagar todas las pendientes ({pendientes})
                </Boton>
              )}
            </>
          )}
        </div>
        {pago && !pago.boleta_id && (
          <div className="flex flex-wrap items-end gap-2 border-t border-line p-3">
            <Campo etiqueta="Banco">
              <Select value={pago.banco_id} onChange={(e) => setPago({ ...pago, banco_id: e.target.value })} className="py-1.5">
                <option value="">Selecciona…</option>
                {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.numero_cuenta}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Fecha de pago"><Input type="date" value={pago.fecha_pago} onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })} className="py-1.5" /></Campo>
            <Campo etiqueta="N° operación"><Input value={pago.numero_operacion} onChange={(e) => setPago({ ...pago, numero_operacion: e.target.value })} className="py-1.5" /></Campo>
            <Boton onClick={pagarTodo}>Confirmar pago</Boton>
            <Boton variante="linea" onClick={() => setPago(null)}>Cancelar</Boton>
          </div>
        )}
        {error && <p className="px-3 pb-3 font-mono text-xs text-bad">{error}</p>}
          </Panel>

          {planilla && (
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              {[
                { t: "Total ingresos", v: suma("total_ingresos"), barra: "border-l-chip-1", fondo: "bg-chip-1/5", acento: "text-chip-1" },
                { t: "Descuentos al trabajador", v: suma("total_descuentos"), barra: "border-l-chip-margenes", fondo: "bg-chip-margenes/5", acento: "text-chip-margenes" },
                { t: "Neto a pagar", v: suma("neto_pagar"), barra: "border-l-chip-mat", fondo: "bg-chip-mat/5", acento: "text-chip-mat" },
                { t: "EsSalud / SIS (empleador)", v: suma("essalud"), barra: "border-l-chip-codificacion", fondo: "bg-chip-codificacion/5", acento: "text-chip-codificacion" },
              ].map((c) => (
                <div key={c.t} className={`panel border-l-[3px] p-4 ${c.barra} ${c.fondo}`}>
                  <p className="label-mono">{c.t}</p>
                  <p className={`mt-1 text-right text-lg font-semibold ${c.acento}`}>{soles(c.v)}</p>
                </div>
              ))}
            </div>
          )}

      <div className="flex items-start gap-3"><Panel className="min-w-0 flex-1" titulo={`Planilla ${periodo}`} extra={<span className="font-mono text-[11px] text-muted-foreground">{boletas.length} boletas</span>}>
        {!planilla || boletas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Vacio texto="Aún no se ha generado la planilla de este mes." />
            {!cerrada && (
              <Boton variante="linea" onClick={generar}><Wand2 size={13} /> Generar boletas de pago</Boton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="px-4 py-2">Trabajador</th><th className="w-16 px-2 py-2">Días</th>
                  <th className="px-2 py-2 text-right">Básico</th><th className="px-2 py-2 text-right">Asig. fam.</th>
                  <th className="w-24 px-2 py-2 text-right">H. extra</th><th className="w-24 px-2 py-2 text-right">Otros ing.</th>
                  <th className="px-2 py-2 text-right">Ingresos</th><th className="px-2 py-2 text-right">ONP/AFP</th>
                  <th className="w-24 px-2 py-2 text-right">Renta 5ta</th><th className="w-24 px-2 py-2 text-right">Otros desc.</th>
                  <th className="px-2 py-2 text-right">Neto</th><th className="px-2 py-2 text-right">EsSalud</th>
                  <th className="px-2 py-2">Estado / Pago</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((b) => {
                  const t = tDe(b.trabajador_id);
                  return (
                    <tr key={b.id} onClick={() => setSel(b.id)} onDoubleClick={() => { setError(""); setDetalle(b); }} className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-muted/40 ${sel === b.id ? "bg-primary/10" : ""}`}>
                      <td className="px-4 py-2 font-semibold text-ink">{t?.nombre}<span className="block text-[10px] font-normal text-muted-foreground">{b.regimen_laboral}{t?.cuspp ? ` · ${t.cuspp}` : ""}</span></td>
                      <td className="px-2 py-2">{b.dias_laborados}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.sueldo_basico))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.asignacion_familiar))}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "horas_extra")}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "otros_ingresos")}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.total_ingresos))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.aporte_pension))}</td>
                      <td className="px-2 py-2 text-right" title={(() => { const t = tDe(b.trabajador_id); if (!t) return ""; const d = quinta(t, Number(b.total_ingresos)); return `Proyectada ${soles(d.proyectada)} − 7 UIT ${soles(d.deduccion)} = ${soles(d.rentaNeta)}\nImpuesto anual ${soles(d.impuesto)} − retenido ${soles(d.retenidoAnterior)} ÷ ${d.divisor}${b.renta_quinta_manual ? "\nMonto manual" : ""}`; })()}>{celda(b, "renta_quinta")}{b.renta_quinta_manual && <span className="ml-1 text-[9px] text-warn">manual</span>}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "otros_descuentos")}</td>
                      <td className="px-2 py-2 text-right font-semibold text-ink">{soles(Number(b.neto_pagar))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.essalud))}</td>
                      <td className="px-2 py-2">
                        {pago?.boleta_id === b.id ? (
                          <div id="nomina-pago-individual" className="grid min-w-48 gap-1">
                            <Select aria-label="Banco de pago" value={pago.banco_id} onChange={(e) => { const v = e.target.value; setPago((p) => p ? { ...p, banco_id: v } : p); }} className="py-1 text-xs">
                              <option value="">Banco…</option>
                              {bancos.map((banco) => <option key={banco.id} value={banco.id}>{banco.nombre} · {banco.numero_cuenta}</option>)}
                            </Select>
                            <Input aria-label="Fecha de pago" type="date" value={pago.fecha_pago} onChange={(e) => { const v = e.target.value; setPago((p) => p ? { ...p, fecha_pago: v } : p); }} className="py-1 text-xs" />
                            <Input aria-label="N° operación" placeholder="N° operación" value={pago.numero_operacion} onChange={(e) => { const v = e.target.value; setPago((p) => p ? { ...p, numero_operacion: v } : p); }} className="py-1 text-xs" />
                          </div>
                        ) : (
                          <>
                            <Etiqueta tono={b.estado_pago === "Pagado" ? "good" : "bad"}>{b.estado_pago}</Etiqueta>
                            {b.estado_pago === "Pagado" && <span className="mt-0.5 block text-[10px] text-muted-foreground">{fecha(b.fecha_pago)} · Op. {b.numero_operacion}</span>}
                          </>
                        )}
                      </td>
                      
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel><BarraIconosHoja objeto="registro" haySeleccion={!!boletas.find((x) => x.id === sel)} extras={boletas.filter((x) => x.id === sel).map((b) => <div key={b.id}><div>
                          {pago?.boleta_id === b.id ? (
                            <>
                              <BotonIcono etiqueta="Confirmar" onClick={pagarTodo}><Check size={15} /></BotonIcono>
                              <BotonIcono etiqueta="Cancelar" onClick={() => { setPago(null); setError(""); }}><span className="text-base">×</span></BotonIcono>
                            </>
                          ) : (
                            <>
                          <BotonIcono etiqueta="Editar o imprimir detalle" onClick={() => { setError(""); setDetalle(b); }}><FileText size={15} /></BotonIcono>
                          <BotonIcono etiqueta={cerrada ? "Registrar pago" : "Valida las boletas para registrar pago"} disabled={!cerrada || b.estado_pago === "Pagado"} onClick={() => { if (cerrada) { setError(""); setPago({ boleta_id: b.id, banco_id: "", fecha_pago: hoy(), numero_operacion: "" }); } }}><Check size={15} /></BotonIcono>
                          <BotonIcono etiqueta="Eliminar" disabled={cerrada || b.estado_pago === "Pagado"} onClick={() => void eliminar(b)}><Trash2 size={15} /></BotonIcono>
                            </>
                          )}
                        </div></div>)} /></div>
        </>
      )}
      {detalle && <DetallePagoNomina key={detalle.id} boleta={boletas.find((b) => b.id === detalle.id) ?? detalle} trabajador={tDe(detalle.trabajador_id)} empresa={empresa} periodo={periodo} bloqueada={cerrada || detalle.estado_pago === "Pagado"} recalcular={(valores) => { const t = tDe(detalle.trabajador_id); return t ? calcularBoleta(t, valores, comisiones, rmvDe(periodoAfp)) : {}; }} onGuardar={(valores) => guardarDetalle(detalle, valores)} onCerrar={() => setDetalle(null)} />}
    </>
  );
}

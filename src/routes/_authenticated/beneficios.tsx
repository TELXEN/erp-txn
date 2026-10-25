import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { BotonIcono } from "@/components/ui-kit";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, hoy, soles } from "@/lib/format";
import { type Trabajador, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { agruparBoletasPorTrabajador, calcCts, calcGrat, calcLiquidacion, filasRegularizacionCts, periodoCts, periodoCtsAnterior, periodoGrat, type TipoBeneficio } from "@/lib/beneficios";
import { HojaCts, HojaGratificacion } from "@/components/personal/HojaCts";

export const Route = createFileRoute("/_authenticated/beneficios")({
  head: () => ({
    meta: [
      { title: "Beneficios Sociales — ERP TELXEN" },
      { name: "description", content: "Cálculo automático de CTS, gratificaciones y liquidaciones de beneficios sociales." },
      { property: "og:title", content: "Beneficios Sociales — ERP TELXEN" },
      { property: "og:description", content: "CTS mayo/noviembre, gratificaciones julio/diciembre y liquidaciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Beneficios,
});

type Tipo = TipoBeneficio;

type Beneficio = {
  id: string; tipo: Tipo; anio: number; periodo: string; trabajador_id: string;
  fecha_desde: string; fecha_hasta: string; meses: number; dias: number;
  remuneracion_computable: number; monto: number; bonificacion: number; total: number;
  detalle: Record<string, number>; estado_pago: string; fecha_pago: string | null;
  numero_operacion: string; banco_id: string | null; regularizacion: boolean;
};

function Beneficios() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [] } = useTrabajadores();
  const ahora = new Date();
  const [sel, setSel] = useState("");
  const [tipo, setTipo] = useState<Tipo>("CTS");
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [periodo, setPeriodo] = useState(ahora.getMonth() < 5 || ahora.getMonth() >= 10 ? "Mayo" : "Noviembre");
  const [liq, setLiq] = useState({ trabajador_id: "", fecha_cese: hoy() });
  const [pago, setPago] = useState<{ id: string; banco_id: string; fecha_pago: string; numero_operacion: string } | null>(null);
  const [error, setError] = useState("");
  const [hojas, setHojas] = useState<Beneficio[]>([]);
  const [regularizando, setRegularizando] = useState(false);
  const [omitirReg, setOmitirReg] = useState("");

  const { data: registros = [] } = useQuery({
    queryKey: ["beneficios", tipo, anio, periodo],
    queryFn: async () => {
      let q = supabase.from("beneficios_sociales").select("*").eq("tipo", tipo);
      q = tipo === "Liquidación" ? q.order("fecha_hasta", { ascending: false }) : q.eq("anio", anio).eq("periodo", periodo);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Beneficio[];
    },
  });
  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const ant = periodo === "Noviembre" ? { anio, periodo: "Mayo" } : { anio: anio - 1, periodo: "Noviembre" };
  const { data: previos } = useQuery({
    queryKey: ["beneficios", "previos", "CTS", ant.anio, ant.periodo],
    enabled: tipo === "CTS",
    queryFn: async () => {
      const { data, error } = await supabase.from("beneficios_sociales").select("*").eq("tipo", "CTS").eq("anio", ant.anio).eq("periodo", ant.periodo);
      if (error) throw error;
      return data as unknown as Beneficio[];
    },
  });
  const claveReg = `${anio}-${periodo}`;
  const faltantes = tipo !== "CTS" || !previos || omitirReg === claveReg ? [] : trabajadores
    .filter((t) => t.tipo_contratacion !== "Honorarios" && t.activo && !previos.some((x) => x.trabajador_id === t.id && x.estado_pago === "Pagado") && periodoCtsAnterior(t, anio, periodo))
    .map((t) => ({ t, ...ant }));
  const setFaltantes = (_: unknown[]) => setOmitirReg(claveReg);
  const visibles = tipo === "CTS"
    ? [...registros, ...(previos ?? []).filter((r) => r.regularizacion)]
      .sort((a, b) => a.trabajador_id.localeCompare(b.trabajador_id) || a.fecha_hasta.localeCompare(b.fecha_hasta))
    : registros;

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const tDe = (id: string) => trabajadores.find((t) => t.id === id);
  const planilla = trabajadores.filter((t) => t.tipo_contratacion !== "Honorarios");
  const refrescar = () => qc.invalidateQueries({ queryKey: ["beneficios"] });
  const cambiarTipo = (t: Tipo) => {
    setTipo(t);
    setError("");
    if (t === "CTS") setPeriodo(ahora.getMonth() < 5 || ahora.getMonth() >= 10 ? "Mayo" : "Noviembre");
    if (t === "Gratificación") setPeriodo(ahora.getMonth() < 7 ? "Julio" : "Diciembre");
  };

  async function calcularPeriodo(recalcular: boolean) {
    setError("");
    const { desde, hasta } = tipo === "CTS" ? periodoCts(anio, periodo) : periodoGrat(anio, periodo);
    const pagados = new Set(registros.filter((r) => r.estado_pago === "Pagado").map((r) => r.trabajador_id));
    const existentes = new Set(registros.map((r) => r.trabajador_id));
    const omitidos: string[] = [];
    const filas = planilla
      .filter((t) => {
        if (!t.fecha_ingreso || !(Number(t.sueldo_mensual) > 0)) { omitidos.push(t.nombre); return false; }
        if (t.fecha_ingreso > hasta || (t.fecha_cese && t.fecha_cese < hasta)) return false;
        if (pagados.has(t.id)) return false;
        return recalcular || !existentes.has(t.id);
      })
      .map((t) => ({ tipo, anio, periodo, trabajador_id: t.id, ...(tipo === "CTS" ? calcCts(t, desde, hasta) : calcGrat(t, desde, hasta)) }))
      .filter((f) => f.total > 0);
    if (filas.length) {
      const { error: err } = await supabase.from("beneficios_sociales").upsert(filas, { onConflict: "tipo,anio,periodo,trabajador_id" });
      if (err) return setError(err.message);
    }
    if (omitidos.length) setError(`Sin fecha de ingreso o sueldo (no calculados): ${omitidos.join(", ")}. Complétalo en Personal.`);
    else if (!filas.length) setError("No hay trabajadores nuevos con derecho en este periodo.");
    await refrescar();
  }

  async function regularizar() {
    if (regularizando || !faltantes.length) return;
    setRegularizando(true);
    setError("");
    try {
      const ids = faltantes.map(({ t }) => t.id);
      const { data: existentes, error: lecturaError } = await supabase.from("beneficios_sociales").select("trabajador_id,anio,periodo").eq("tipo", "CTS").in("trabajador_id", ids).in("anio", [anio, ant.anio]);
      if (lecturaError) throw lecturaError;
      const filas = faltantes.flatMap(({ t }) => filasRegularizacionCts(t, anio, periodo, existentes ?? []));
      if (filas.length) {
        const { error: err } = await supabase.from("beneficios_sociales").upsert(filas, { onConflict: "tipo,anio,periodo,trabajador_id", ignoreDuplicates: true });
        if (err) throw err;
      }
      const { data: guardadas, error: hojasError } = await supabase.from("beneficios_sociales").select("*").eq("tipo", "CTS").in("trabajador_id", ids).in("anio", [anio, ant.anio]);
      if (hojasError) throw hojasError;
      const ambas = (guardadas ?? []).filter((r) => (r.anio === anio && r.periodo === periodo) || (r.anio === ant.anio && r.periodo === ant.periodo));
      setHojas((ambas as unknown as Beneficio[]).sort((a, b) => a.trabajador_id.localeCompare(b.trabajador_id) || a.fecha_hasta.localeCompare(b.fecha_hasta)));
      setFaltantes([]);
      await refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la regularización. Inténtalo nuevamente.");
    } finally { setRegularizando(false); }
  }

  const tLiq = tDe(liq.trabajador_id);
  const previa = tLiq && tLiq.fecha_ingreso && liq.fecha_cese >= tLiq.fecha_ingreso ? calcLiquidacion(tLiq, liq.fecha_cese) : null;

  async function guardarLiquidacion() {
    setError("");
    if (!tLiq || !previa) return setError("Selecciona un trabajador con fecha de ingreso y una fecha de cese válida.");
    if (!window.confirm(`¿Registrar la liquidación de ${tLiq.nombre}? El trabajador quedará inactivo con fecha de cese ${fecha(liq.fecha_cese)}.`)) return;
    const { error: err } = await supabase.from("beneficios_sociales").upsert(
      { tipo: "Liquidación", anio: Number(liq.fecha_cese.slice(0, 4)), periodo: liq.fecha_cese, trabajador_id: tLiq.id, ...previa },
      { onConflict: "tipo,anio,periodo,trabajador_id" },
    );
    if (err) return setError(err.message);
    await supabase.from("trabajadores").update({ fecha_cese: liq.fecha_cese, activo: false }).eq("id", tLiq.id);
    setLiq({ trabajador_id: "", fecha_cese: hoy() });
    await Promise.all([refrescar(), qc.invalidateQueries({ queryKey: ["trabajadores"] })]);
  }

  async function confirmarPago() {
    if (!pago) return;
    if (!pago.banco_id || !pago.fecha_pago || !pago.numero_operacion.trim())
      return setError("Para pagar indica banco, fecha y número de operación.");
    const { error: err } = await supabase
      .from("beneficios_sociales")
      .update({ estado_pago: "Pagado", banco_id: pago.banco_id, fecha_pago: pago.fecha_pago, numero_operacion: pago.numero_operacion.trim() })
      .eq("id", pago.id);
    if (err) return setError(err.message);
    setPago(null);
    await refrescar();
  }

  async function eliminar(r: Beneficio) {
    if (r.estado_pago === "Pagado") return setError("No se puede eliminar un registro pagado.");
    if (!window.confirm("¿Eliminar este cálculo?")) return;
    const { error: err } = await supabase.from("beneficios_sociales").delete().eq("id", r.id);
    if (err) return setError(err.message);
    await refrescar();
  }

  const periodos = tipo === "CTS" ? ["Mayo", "Noviembre"] : ["Julio", "Diciembre"];
  const rango = tipo === "CTS" ? periodoCts(anio, periodo) : periodoGrat(anio, periodo);
  const total = visibles.reduce((s, r) => s + Number(r.total), 0);
  const pendiente = visibles.filter((r) => r.estado_pago === "Pendiente").reduce((s, r) => s + Number(r.total), 0);
  const grupos = tipo === "CTS" ? agruparBoletasPorTrabajador(visibles) : visibles.map((r) => [r]);
  const nombreDetalle: Record<string, string> = {
    cts_trunca: "CTS trunca", gratificacion_trunca: "Gratificación trunca",
    bonificacion_extraordinaria: "Bonif. extraordinaria", vacaciones_truncas: "Vacaciones truncas",
  };

  return (
    <>
      <Encabezado
        titulo="Beneficios Sociales"
        subtitulo="CTS (mayo/noviembre), gratificaciones (julio/diciembre) y liquidaciones por cese"
        acciones={
          visibles.length > 0 && (
            <Boton
              variante="linea"
              onClick={() =>
                exportarExcel(`${tipo.toLowerCase()}-${tipo === "Liquidación" ? "cesados" : `${periodo.toLowerCase()}-${anio}`}`, [
                  {
                    nombre: tipo,
                    filas: visibles.map((r) => {
                      const t = tDe(r.trabajador_id);
                      return {
                        DNI: t?.dni ?? "", Trabajador: t?.nombre ?? "", Régimen: t?.regimen_laboral ?? "", "Fecha de ingreso": fecha(t?.fecha_ingreso ?? null), Regularización: r.regularizacion ? "Sí" : "",
                        Periodo: `${r.periodo} ${r.anio}`, Desde: fecha(r.fecha_desde), Hasta: fecha(r.fecha_hasta), Meses: r.meses, Días: r.dias,
                        "Rem. computable (S/)": Number(r.remuneracion_computable),
                        ...Object.fromEntries(Object.entries(nombreDetalle).filter(([k]) => r.detalle?.[k] !== undefined).map(([k, n]) => [`${n} (S/)`, Number(r.detalle[k])])),
                        "Monto (S/)": Number(r.monto), "Bonificación (S/)": Number(r.bonificacion), "Total (S/)": Number(r.total),
                        Estado: r.estado_pago, "Fecha pago": fecha(r.fecha_pago), "N° Operación": r.numero_operacion,
                      };
                    }),
                  },
                ])
              }
            >
              <Upload size={13} /> Exportar a Excel
            </Boton>
          )
        }
      />

      <div className="mb-4 flex gap-1">
        {(["CTS", "Gratificación", "Liquidación"] as Tipo[]).map((t) => (
          <Boton key={t} variante={tipo === t ? "primario" : "linea"} onClick={() => cambiarTipo(t)}>
            {t === "Gratificación" ? "Gratificaciones" : t === "Liquidación" ? "Liquidaciones" : t}
          </Boton>
        ))}
      </div>

      <Panel className="mb-4">
        {tipo === "Liquidación" ? (
          <div className="grid gap-3 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <Campo etiqueta="Trabajador">
                <Select value={liq.trabajador_id} onChange={(e) => setLiq({ ...liq, trabajador_id: e.target.value })} className="min-w-64 py-1.5">
                  <option value="">Selecciona…</option>
                  {planilla.filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Fecha de cese"><Input type="date" value={liq.fecha_cese} onChange={(e) => setLiq({ ...liq, fecha_cese: e.target.value })} className="py-1.5" /></Campo>
              <Boton onClick={guardarLiquidacion} disabled={!previa}>Registrar liquidación</Boton>
            </div>
            {tLiq && !tLiq.fecha_ingreso && <p className="font-mono text-xs text-bad">Este trabajador no tiene fecha de ingreso. Complétala en Personal.</p>}
            {previa && (
              <div className="grid gap-2 font-mono text-xs sm:grid-cols-5">
                {[
                  ["CTS trunca", previa.detalle.cts_trunca, `${previa.detalle.cts_meses} m ${previa.detalle.cts_dias} d`],
                  ["Gratificación trunca", previa.detalle.gratificacion_trunca, `${previa.detalle.grat_meses} meses`],
                  ["Bonif. extraordinaria", previa.detalle.bonificacion_extraordinaria, tLiq?.regimen_laboral === "Agrario" ? "6%" : "9%"],
                  ["Vacaciones truncas", previa.detalle.vacaciones_truncas, `${previa.detalle.vac_meses} m ${previa.detalle.vac_dias} d`],
                  ["Total liquidación", previa.total, `R.C. ${soles(previa.remuneracion_computable)}`],
                ].map(([n, v, s]) => (
                  <div key={n as string} className="rounded-md border border-line p-3">
                    <p className="label-mono">{n}</p>
                    <p className="mt-1 text-base font-semibold text-ink">{soles(v as number)}</p>
                    <p className="text-[10px] text-muted-foreground">{s}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3 p-3">
            <Campo etiqueta="Periodo">
              <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="py-1.5">
                {periodos.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Año"><Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-24 py-1.5" /></Campo>
            <p className="pb-2 font-mono text-[11px] text-muted-foreground">Cómputo: {fecha(rango.desde)} – {fecha(rango.hasta)}</p>
            <Boton onClick={() => calcularPeriodo(false)}>Calcular {tipo} {periodo} {anio}</Boton>
            {registros.some((r) => r.estado_pago === "Pendiente") && (
              <Boton variante="linea" onClick={() => calcularPeriodo(true)}><RefreshCw size={13} /> Recalcular pendientes</Boton>
            )}
          </div>
        )}
        {error && <p className="px-3 pb-3 font-mono text-xs text-bad">{error}</p>}
      </Panel>

      {faltantes.length > 0 && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-warn/40 bg-warn/10 p-3 text-xs">
          <p className="min-w-0 flex-1">
            {faltantes.map((f) => f.t.nombre).join(", ")} no {faltantes.length > 1 ? "tienen" : "tiene"} depositada la CTS de {faltantes[0]?.periodo.toLowerCase()} {faltantes[0]?.anio}.
            <span className="block text-[11px] text-muted-foreground">Un depósito fuera de plazo puede generar intereses según la ley; el sistema no los calcula.</span>
          </p>
          <Boton onClick={regularizar} disabled={regularizando}>{regularizando ? "Generando boletas…" : "Regularizar"}</Boton>
          <Boton variante="linea" disabled={regularizando} onClick={() => setFaltantes([])}>Omitir</Boton>
        </div>
      )}

      {visibles.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="panel p-4"><p className="label-mono">Total calculado</p><p className="mt-1 text-lg font-semibold">{soles(total)}</p></div>
          <div className="panel p-4"><p className="label-mono">Pendiente de pago / depósito</p><p className="mt-1 text-lg font-semibold">{soles(pendiente)}</p></div>
        </div>
      )}

      <div className="flex items-start gap-3"><Panel className="min-w-0 flex-1" titulo={tipo === "Liquidación" ? "Liquidaciones registradas" : `${tipo} ${periodo} ${anio}${visibles.some((r) => r.anio !== anio || r.periodo !== periodo) ? " y regularizaciones" : ""}`}>
        {visibles.length === 0 ? (
          <Vacio texto="Aún no hay cálculos para este periodo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="px-4 py-2">Trabajador</th><th className="px-2 py-2">Ingreso</th><th className="px-2 py-2">{tipo === "Liquidación" ? "Ingreso – Cese" : "Periodo computado"}</th>
                  <th className="px-2 py-2 text-right">Tiempo</th><th className="px-2 py-2 text-right">Rem. computable</th>
                  <th className="px-2 py-2 text-right">Monto</th><th className="px-2 py-2 text-right">Bonificación</th>
                  <th className="px-2 py-2 text-right">Total</th><th className="px-2 py-2">Estado / Pago</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((grupo) => <Fragment key={grupo[0]?.trabajador_id + ":" + grupo[0]?.id}>{grupo.map((r, indice) => {
                  const t = tDe(r.trabajador_id);
                  return (
                    <tr key={r.id} onClick={() => setSel(r.id)} className={`cursor-pointer border-b border-line/60 align-top last:border-0 hover:bg-muted/40 ${sel === r.id ? "bg-primary/10" : ""}`}>
                      {indice === 0 && <>
                        <td rowSpan={grupo.length} className="px-4 py-2 align-middle font-semibold text-ink">{t?.nombre}<span className="block text-[10px] font-normal text-muted-foreground">{t?.regimen_laboral}</span>{grupo.length > 1 && <span className="mt-1 block text-[10px] font-normal text-primary">{grupo.length} boletas · {soles(grupo.reduce((s, b) => s + Number(b.total), 0))}</span>}</td>
                        <td rowSpan={grupo.length} className="px-2 py-2 align-middle">{fecha(t?.fecha_ingreso ?? null)}</td>
                      </>}
                      <td className="px-2 py-2">{tipo === "CTS" && <span className="mb-1 flex flex-wrap items-center gap-1">{r.periodo} {r.anio}{r.regularizacion && <Etiqueta tono="warn">Regularización</Etiqueta>}</span>}{fecha(r.fecha_desde)} – {fecha(r.fecha_hasta)}</td>
                      <td className="px-2 py-2 text-right">
                        {r.meses} m{r.dias ? ` ${r.dias} d` : ""}
                        {tipo === "Liquidación" && (
                          <span className="block text-[10px] text-muted-foreground">
                            CTS {soles(Number(r.detalle["cts_trunca"]))} · Grat. {soles(Number(r.detalle["gratificacion_trunca"]))} · Vac. {soles(Number(r.detalle["vacaciones_truncas"]))}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">{soles(Number(r.remuneracion_computable))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(r.monto))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(r.bonificacion))}</td>
                      <td className="px-2 py-2 text-right font-semibold text-ink">{soles(Number(r.total))}</td>
                      <td className="px-2 py-2">
                        {pago?.id === r.id ? (
                          <div className="grid gap-1">
                            <Select value={pago.banco_id} onChange={(e) => setPago({ ...pago, banco_id: e.target.value })} className="py-1 text-xs">
                              <option value="">Banco…</option>
                              {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.numero_cuenta}</option>)}
                            </Select>
                            <Input type="date" value={pago.fecha_pago} onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })} className="py-1 text-xs" />
                            <Input placeholder="N° operación" value={pago.numero_operacion} onChange={(e) => setPago({ ...pago, numero_operacion: e.target.value })} className="py-1 text-xs" />
                          </div>
                        ) : (
                          <>
                            <Etiqueta tono={r.estado_pago === "Pagado" ? "good" : "bad"}>{r.estado_pago}</Etiqueta>
                            {r.fecha_pago && <span className="mt-0.5 block text-[10px] text-muted-foreground">{fecha(r.fecha_pago)} · Op. {r.numero_operacion}</span>}
                          </>
                        )}
                      </td>
                      
                    </tr>
                  );
                })}</Fragment>)}
              </tbody>
            </table>
          </div>
        )}
      </Panel><BarraIconosHoja objeto="registro" haySeleccion={!!visibles.find((x) => x.id === sel)} extras={visibles.filter((x) => x.id === sel).map((r) => <div key={r.id}><div>
                          {pago?.id === r.id ? (
                            <>
                              <BotonIcono etiqueta="Confirmar" onClick={confirmarPago}><Check size={15} /></BotonIcono>
                              <BotonIcono etiqueta="Cancelar" onClick={() => setPago(null)}><span className="text-base">×</span></BotonIcono>
                            </>
                          ) : (
                            <>
                              {r.estado_pago === "Pendiente" && (
                                <BotonIcono etiqueta={tipo === "CTS" ? "Registrar depósito" : "Registrar pago"} onClick={() => setPago({ id: r.id, banco_id: "", fecha_pago: hoy(), numero_operacion: "" })}><Check size={15} /></BotonIcono>
                              )}
                              {tipo === "CTS" && <BotonIcono etiqueta="Hoja de liquidación CTS" onClick={() => setHojas([r])}><FileText size={15} /></BotonIcono>}
                              {tipo === "Gratificación" && <BotonIcono etiqueta="Boleta de gratificación" onClick={() => setHojas([r])}><FileText size={15} /></BotonIcono>}
                              <BotonIcono etiqueta="Eliminar" onClick={() => eliminar(r)}><Trash2 size={15} /></BotonIcono>
                            </>
                          )}
                        </div></div>)} /></div>
      {hojas.length > 0 && (() => { const HojaBeneficio = hojas[0]?.tipo === "Gratificación" ? HojaGratificacion : HojaCts; return <HojaBeneficio boletas={hojas.map((r) => { const b = bancos.find((x) => x.id === r.banco_id); return { registro: r, trabajador: tDe(r.trabajador_id), banco: b ? `${b.nombre} · ${b.numero_cuenta}` : undefined }; })} onCerrar={() => setHojas([])} />; })()}
    </>
  );
}

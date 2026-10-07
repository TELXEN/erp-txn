import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, hoy, soles } from "@/lib/format";
import { type Trabajador, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

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

const RMV = 1230; // vigente desde 01/10/2026
type Tipo = "CTS" | "Gratificación" | "Liquidación";

// Factores por régimen: gratificación, CTS, vacaciones (proporción del beneficio completo)
const FACTORES: Record<string, { grat: number; cts: number; vac: number }> = {
  General: { grat: 1, cts: 1, vac: 1 },
  "Construcción Civil": { grat: 1, cts: 1, vac: 1 },
  "MYPE Pequeña": { grat: 0.5, cts: 0.5, vac: 0.5 },
  "MYPE Micro": { grat: 0, cts: 0, vac: 0.5 },
  Agrario: { grat: 0, cts: 0, vac: 1 },
};
const BASE_FACT = { grat: 1, cts: 1, vac: 1 };
const factores = (r: string) => FACTORES[r] ?? BASE_FACT;

type Beneficio = {
  id: string;
  tipo: Tipo;
  anio: number;
  periodo: string;
  trabajador_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  meses: number;
  dias: number;
  remuneracion_computable: number;
  monto: number;
  bonificacion: number;
  total: number;
  detalle: Record<string, number>;
  estado_pago: string;
  fecha_pago: string | null;
  numero_operacion: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const D = (s: string) => new Date(`${s}T00:00:00Z`);
const maxF = (a: string, b: string) => (a > b ? a : b);

/** Meses y días completos entre desde y hasta (ambos inclusive), base 30. */
function computo(desde: string, hasta: string) {
  if (desde > hasta) return { meses: 0, dias: 0 };
  const a = D(desde);
  const b = D(hasta);
  b.setUTCDate(b.getUTCDate() + 1);
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  let dias = b.getUTCDate() - a.getUTCDate();
  if (dias < 0) { meses -= 1; dias += 30; }
  return { meses: Math.max(meses, 0), dias: Math.max(dias, 0) };
}

const remuneracionBase = (t: Trabajador) =>
  Number(t.sueldo_mensual) + (t.asignacion_familiar && !t.regimen_laboral.startsWith("MYPE") ? RMV * 0.1 : 0);
const tasaBonif = (t: Trabajador) => (t.regimen_laboral === "Agrario" ? 0.06 : 0.09);

function periodoGrat(anio: number, p: string) {
  return p === "Julio" ? { desde: `${anio}-01-01`, hasta: `${anio}-06-30` } : { desde: `${anio}-07-01`, hasta: `${anio}-12-31` };
}
function periodoCts(anio: number, p: string) {
  return p === "Mayo" ? { desde: `${anio - 1}-11-01`, hasta: `${anio}-04-30` } : { desde: `${anio}-05-01`, hasta: `${anio}-10-31` };
}

function calcGrat(t: Trabajador, desde: string, hasta: string) {
  const inicio = maxF(desde, t.fecha_ingreso ?? desde);
  const { meses } = computo(inicio, hasta);
  const rc = r2(remuneracionBase(t));
  const monto = r2((rc / 6) * meses * factores(t.regimen_laboral).grat);
  const bonificacion = r2(monto * tasaBonif(t));
  return { fecha_desde: inicio, fecha_hasta: hasta, meses, dias: 0, remuneracion_computable: rc, monto, bonificacion, total: r2(monto + bonificacion), detalle: {} };
}

function calcCts(t: Trabajador, desde: string, hasta: string) {
  const inicio = maxF(desde, t.fecha_ingreso ?? desde);
  const { meses, dias } = computo(inicio, hasta);
  const base = remuneracionBase(t);
  const sextoGrat = factores(t.regimen_laboral).grat > 0 ? base / 6 : 0;
  const rc = r2(base + sextoGrat);
  const monto = r2(((rc / 12) * meses + (rc / 360) * dias) * factores(t.regimen_laboral).cts);
  return { fecha_desde: inicio, fecha_hasta: hasta, meses, dias, remuneracion_computable: rc, monto, bonificacion: 0, total: monto, detalle: { sexto_gratificacion: r2(sextoGrat) } };
}

function calcLiquidacion(t: Trabajador, cese: string) {
  const y = Number(cese.slice(0, 4));
  const m = Number(cese.slice(5, 7));
  const ingreso = t.fecha_ingreso ?? cese;
  // CTS trunca desde el último 1 de mayo / 1 de noviembre
  const inicioCts = m >= 11 ? `${y}-11-01` : m >= 5 ? `${y}-05-01` : `${y - 1}-11-01`;
  const cts = calcCts(t, inicioCts, cese);
  // Gratificación trunca del semestre en curso (meses completos)
  const grat = calcGrat(t, m <= 6 ? `${y}-01-01` : `${y}-07-01`, cese);
  // Vacaciones truncas desde el último aniversario de ingreso
  let aniv = `${y}${ingreso.slice(4)}`;
  if (aniv > cese) aniv = `${y - 1}${ingreso.slice(4)}`;
  if (aniv < ingreso) aniv = ingreso;
  const v = computo(aniv, cese);
  const base = r2(remuneracionBase(t));
  const vac = r2(((base / 12) * v.meses + (base / 360) * v.dias) * factores(t.regimen_laboral).vac);
  const monto = r2(cts.monto + grat.monto + vac);
  return {
    fecha_desde: ingreso,
    fecha_hasta: cese,
    meses: v.meses,
    dias: v.dias,
    remuneracion_computable: base,
    monto,
    bonificacion: grat.bonificacion,
    total: r2(monto + grat.bonificacion),
    detalle: {
      cts_trunca: cts.monto, cts_meses: cts.meses, cts_dias: cts.dias,
      gratificacion_trunca: grat.monto, grat_meses: grat.meses,
      bonificacion_extraordinaria: grat.bonificacion,
      vacaciones_truncas: vac, vac_meses: v.meses, vac_dias: v.dias,
    },
  };
}

function Beneficios() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [] } = useTrabajadores();
  const ahora = new Date();
  const [tipo, setTipo] = useState<Tipo>("CTS");
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [periodo, setPeriodo] = useState(ahora.getMonth() < 5 || ahora.getMonth() >= 10 ? "Mayo" : "Noviembre");
  const [liq, setLiq] = useState({ trabajador_id: "", fecha_cese: hoy() });
  const [pago, setPago] = useState<{ id: string; banco_id: string; fecha_pago: string; numero_operacion: string } | null>(null);
  const [error, setError] = useState("");

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
  const total = registros.reduce((s, r) => s + Number(r.total), 0);
  const pendiente = registros.filter((r) => r.estado_pago === "Pendiente").reduce((s, r) => s + Number(r.total), 0);
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
          registros.length > 0 && (
            <Boton
              variante="linea"
              onClick={() =>
                exportarExcel(`${tipo.toLowerCase()}-${tipo === "Liquidación" ? "cesados" : `${periodo.toLowerCase()}-${anio}`}`, [
                  {
                    nombre: tipo,
                    filas: registros.map((r) => {
                      const t = tDe(r.trabajador_id);
                      return {
                        DNI: t?.dni ?? "", Trabajador: t?.nombre ?? "", Régimen: t?.regimen_laboral ?? "",
                        Desde: fecha(r.fecha_desde), Hasta: fecha(r.fecha_hasta), Meses: r.meses, Días: r.dias,
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

      {registros.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="panel p-4"><p className="label-mono">Total calculado</p><p className="mt-1 text-lg font-semibold">{soles(total)}</p></div>
          <div className="panel p-4"><p className="label-mono">Pendiente de pago / depósito</p><p className="mt-1 text-lg font-semibold">{soles(pendiente)}</p></div>
        </div>
      )}

      <Panel titulo={tipo === "Liquidación" ? "Liquidaciones registradas" : `${tipo} ${periodo} ${anio}`}>
        {registros.length === 0 ? (
          <Vacio texto="Aún no hay cálculos para este periodo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="px-4 py-2">Trabajador</th><th className="px-2 py-2">{tipo === "Liquidación" ? "Ingreso – Cese" : "Cómputo"}</th>
                  <th className="px-2 py-2 text-right">Tiempo</th><th className="px-2 py-2 text-right">Rem. computable</th>
                  <th className="px-2 py-2 text-right">Monto</th><th className="px-2 py-2 text-right">Bonificación</th>
                  <th className="px-2 py-2 text-right">Total</th><th className="px-2 py-2">Estado / Pago</th><th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => {
                  const t = tDe(r.trabajador_id);
                  return (
                    <tr key={r.id} className="border-b border-line/60 align-top last:border-0">
                      <td className="px-4 py-2 font-semibold text-ink">{t?.nombre}<span className="block text-[10px] font-normal text-muted-foreground">{t?.regimen_laboral}</span></td>
                      <td className="px-2 py-2">{fecha(r.fecha_desde)} – {fecha(r.fecha_hasta)}</td>
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
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {pago?.id === r.id ? (
                            <>
                              <Boton onClick={confirmarPago} className="py-1">Confirmar</Boton>
                              <Boton variante="linea" onClick={() => setPago(null)} className="py-1">Cancelar</Boton>
                            </>
                          ) : (
                            <>
                              {r.estado_pago === "Pendiente" && (
                                <button type="button" title={tipo === "CTS" ? "Registrar depósito" : "Registrar pago"} onClick={() => setPago({ id: r.id, banco_id: "", fecha_pago: hoy(), numero_operacion: "" })} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Check size={14} /></button>
                              )}
                              <button type="button" title="Eliminar" onClick={() => eliminar(r)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

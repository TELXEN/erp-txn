import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Landmark, Plus, Wallet } from "lucide-react";
import { Boton, Campo, Input, Select, VentanaFlotante, Vacio } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useFinanciamientos, useSaldosBancarios, type CuotaFinanciamiento } from "@/lib/financiamiento";
import { distribuirCapital, resumirDeuda, saldoTrasPago } from "@/lib/financiamiento-calculos";
import type { CuentaBancaria } from "@/components/CuentasBancarias";
import { fecha } from "@/lib/format";
const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dinero = (v: number, m: string) => `${m === "USD" ? "US$" : "S/"} ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const vacio = () => ({ acreedor: "", referencia: "", banco_id: "", capital: "", tipo_cambio: "", fecha_desembolso: hoyLima(), numero_operacion: "", cuotas: "1", primer_vencimiento: hoyLima(), interes: "0", comision: "0", notas: "" });
export function FinanciamientoPanel({ cuentas }: { cuentas: CuentaBancaria[] }) {
  const qc = useQueryClient();
  const { data, isPending, error: errorDatos } = useFinanciamientos();
  const { data: saldos = [] } = useSaldosBancarios();
  const [nuevo, setNuevo] = useState(false), [form, setForm] = useState(vacio), [abierto, setAbierto] = useState<string | null>(null);
  const [pago, setPago] = useState<{ cuota: CuotaFinanciamiento; banco: string; fecha: string; operacion: string } | null>(null);
  const [error, setError] = useState(""), [exito, setExito] = useState(""), [guardando, setGuardando] = useState(false);
  const prestamos = data?.prestamos ?? [], cuotas = data?.cuotas ?? [];
  const comerciales = cuentas.filter((c) => c.activo && !/detracc/i.test(c.tipo_cuenta));
  const moneda = cuentas.find((c) => c.id === form.banco_id)?.monedas ?? "PEN";
  const cuotaPrestamo = prestamos.find((p) => p.id === pago?.cuota.financiamiento_id);
  const saldoPago = saldos.find((s) => s.banco_id === pago?.banco)?.saldo;
  const montoPago = pago ? Number(pago.cuota.capital) + Number(pago.cuota.interes) + Number(pago.cuota.comision) : 0;
  const check = saldoPago === undefined ? null : saldoTrasPago(Number(saldoPago), montoPago);
  let primeraCuota = 0;
  try { primeraCuota = (distribuirCapital(Number(form.capital), Number(form.cuotas))[0] ?? 0) + Number(form.interes) + Number(form.comision); } catch { /* formulario incompleto */ }
  async function registrar(e: React.FormEvent) {
    e.preventDefault(); if (guardando) return; setError(""); setGuardando(true);
    try {
      distribuirCapital(Number(form.capital), Number(form.cuotas));
      const { error: err } = await supabase.rpc("registrar_financiamiento", { _datos: { ...form, capital: Number(form.capital), cuotas: Number(form.cuotas), interes: Number(form.interes), comision: Number(form.comision), tipo_cambio: moneda === "PEN" ? 1 : Number(form.tipo_cambio) } });
      if (err) throw err;
      setExito(`Financiamiento ${form.referencia} registrado; desembolso incorporado al saldo.`); setForm(vacio()); await qc.invalidateQueries();
    } catch (e) { setError(String((e as { message?: string })?.message ?? "No se pudo registrar.")); } finally { setGuardando(false); }
  }
  async function pagar(e: React.FormEvent) {
    e.preventDefault(); if (!pago || guardando) return; setGuardando(true); setError("");
    try {
      const { error: err } = await supabase.rpc("pagar_financiamiento", { _cuota: pago.cuota.id, _banco: pago.banco, _fecha: pago.fecha, _operacion: pago.operacion });
      if (err) throw err; setPago(null); await qc.invalidateQueries();
    } catch (e) { setError(String((e as { message?: string })?.message ?? "No se pudo registrar el pago.")); } finally { setGuardando(false); }
  }
  const campo = (key: keyof ReturnType<typeof vacio>, etiqueta: string, type = "text", min?: string, max?: string) => <Campo etiqueta={etiqueta}><Input required={key !== "notas"} type={type} min={min} max={max} step={type === "number" ? key === "cuotas" ? "1" : "0.01" : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Campo>;
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-semibold"><Landmark size={18} /> Préstamos / Financiamiento</h2><Boton onClick={() => { setNuevo(true); setError(""); setExito(""); }}><Plus size={14} /> Registrar financiamiento</Boton></div>
    {errorDatos && <p role="alert" className="mb-3 text-sm text-bad">No se pudo cargar el financiamiento: {errorDatos.message}</p>}
    <div className="mb-4 grid gap-3 sm:grid-cols-2">{["PEN", "USD"].map((m) => {
      const r = prestamos.filter((p) => p.moneda === m).reduce((s, p) => { const d = resumirDeuda(Number(p.capital), cuotas.filter((c) => c.financiamiento_id === p.id)); return { capital: s.capital + d.capitalPendiente, cargos: s.cargos + d.cargosPendientes }; }, { capital: 0, cargos: 0 });
      return <div key={m} className="rounded-md border border-line bg-card p-4"><p className="text-xs text-muted-foreground">Capital pendiente · {m}</p><p className="mt-1 text-xl font-semibold tabular-nums">{dinero(r.capital, m)}</p><p className="mt-1 text-xs text-muted-foreground">Intereses y comisiones pendientes: {dinero(r.cargos, m)}</p></div>;
    })}</div>
    {isPending ? <p className="p-4 text-sm text-muted-foreground">Cargando préstamos…</p> : prestamos.length === 0 ? <Vacio texto="No hay financiamientos registrados." /> : <div className="overflow-x-auto"><table className="w-full text-xs">
      <thead><tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">{["Acreedor / referencia", "Desembolso", "Cuenta de destino", "Capital recibido", "Capital pendiente", "Cuotas"].map((t) => <th key={t} className="px-3 py-2">{t}</th>)}</tr></thead>
      <tbody>{prestamos.map((p) => {
        const cs = cuotas.filter((c) => c.financiamiento_id === p.id), deuda = resumirDeuda(Number(p.capital), cs);
        return <Fragment key={p.id}><tr className="border-b border-line"><td className="px-3 py-2"><Boton variante="linea" className="px-1 py-1 text-left" onClick={() => setAbierto(abierto === p.id ? null : p.id)} aria-expanded={abierto === p.id}>{abierto === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {p.acreedor} · {p.referencia}</Boton></td><td className="px-3 py-2">{fecha(p.fecha_desembolso)}</td><td className="px-3 py-2">{cuentas.find((c) => c.id === p.banco_id)?.nombre ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums">{dinero(Number(p.capital), p.moneda)}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{dinero(deuda.capitalPendiente, p.moneda)}</td><td className="px-3 py-2">{cs.filter((c) => c.fecha_pago).length}/{cs.length} pagadas</td></tr>
        {abierto === p.id && <tr><td colSpan={6} className="bg-muted/30 px-3 py-2"><table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-muted-foreground">{["Cuota", "Vencimiento", "Capital", "Interés", "Comisión", "Total", "Estado / operación", ""].map((t, i) => <th key={i} className="px-2 py-1">{t}</th>)}</tr></thead><tbody>{cs.map((c) => <tr key={c.id} className="border-t border-line"><td className="px-2 py-1">{c.numero}</td><td className="px-2 py-1">{fecha(c.vencimiento)}</td>{[c.capital, c.interes, c.comision, Number(c.capital) + Number(c.interes) + Number(c.comision)].map((v, i) => <td key={i} className="px-2 py-1 text-right tabular-nums">{dinero(Number(v), p.moneda)}</td>)}<td className={`px-2 py-1 ${c.fecha_pago ? "text-good" : c.vencimiento < hoyLima() ? "text-bad" : "text-muted-foreground"}`}>{c.fecha_pago ? `Pagada · ${fecha(c.fecha_pago)} · ${c.numero_operacion}` : c.vencimiento < hoyLima() ? "Vencida" : "Pendiente"}</td><td className="px-2 py-1">{!c.fecha_pago && <Boton variante="linea" className="py-1" onClick={() => { setError(""); setPago({ cuota: c, banco: "", fecha: hoyLima(), operacion: "" }); }}><Wallet size={12} /> Pagar cuota</Boton>}</td></tr>)}</tbody></table></td></tr>}</Fragment>;
      })}</tbody></table></div>}
    <VentanaFlotante abierta={nuevo} titulo="Registrar financiamiento" onCerrar={() => { if (!guardando) setNuevo(false); }} ancho="max-w-2xl"><form onSubmit={registrar} className="grid gap-3 p-4 sm:grid-cols-2">
      {campo("acreedor", "Acreedor")}{campo("referencia", "Referencia / contrato")}
      <Campo etiqueta="Cuenta de destino"><Select required value={form.banco_id} onChange={(e) => setForm({ ...form, banco_id: e.target.value })}><option value="">Selecciona…</option>{comerciales.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.monedas} · {c.numero_cuenta}</option>)}</Select></Campo>
      {campo("capital", `Capital recibido (${moneda})`, "number", "0.01")}{moneda === "USD" && campo("tipo_cambio", "Tipo de cambio del desembolso", "number", "0.01")}
      {campo("fecha_desembolso", "Fecha de desembolso", "date", undefined, hoyLima())}{campo("numero_operacion", "N° de operación del desembolso")}
      {campo("cuotas", "Cuotas mensuales", "number", "1", "120")}{campo("primer_vencimiento", "Primer vencimiento", "date", form.fecha_desembolso)}
      {campo("interes", `Interés por cuota (${moneda})`, "number", "0")}{campo("comision", `Comisión por cuota (${moneda})`, "number", "0")}
      <div className="sm:col-span-2">{campo("notas", "Observaciones")}</div><p className="text-sm tabular-nums sm:col-span-2">Primera cuota: <b>{dinero(primeraCuota, moneda)}</b></p>
      {exito && <p role="status" className="text-xs text-good sm:col-span-2">{exito}</p>}{error && <p role="alert" className="text-xs text-bad sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Boton variante="linea" type="button" disabled={guardando} onClick={() => setNuevo(false)}>Cerrar</Boton><Boton type="submit" disabled={guardando}>{guardando ? "Registrando…" : "Registrar desembolso"}</Boton></div>
    </form></VentanaFlotante>
    <VentanaFlotante abierta={!!pago} titulo="Pagar cuota de financiamiento" onCerrar={() => { if (!guardando) setPago(null); }} ancho="max-w-lg">{pago && <form onSubmit={pagar} className="space-y-3 p-4">
      <p className="text-sm"><b>{cuotaPrestamo?.acreedor} · {cuotaPrestamo?.referencia}</b> · Cuota {pago.cuota.numero}</p><p className="text-sm tabular-nums">Capital {dinero(Number(pago.cuota.capital), cuotaPrestamo?.moneda ?? "PEN")} · Interés {dinero(Number(pago.cuota.interes), cuotaPrestamo?.moneda ?? "PEN")} · Comisión {dinero(Number(pago.cuota.comision), cuotaPrestamo?.moneda ?? "PEN")}</p>
      <Campo etiqueta="Cuenta de origen"><Select required value={pago.banco} onChange={(e) => setPago({ ...pago, banco: e.target.value })}><option value="">Selecciona…</option>{comerciales.filter((c) => c.monedas === cuotaPrestamo?.moneda).map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.numero_cuenta} · {dinero(Number(saldos.find((s) => s.banco_id === c.id)?.saldo ?? 0), c.monedas)}</option>)}</Select></Campo>
      {pago.banco && <div className={`rounded-md border p-3 text-sm tabular-nums ${check?.insuficiente ? "border-bad/40 bg-bad/5 text-bad" : "border-line bg-muted/30"}`}><p>Disponible: {saldoPago === undefined ? "Consultando…" : dinero(Number(saldoPago), cuotaPrestamo?.moneda ?? "PEN")}</p><p>Pago: {dinero(montoPago, cuotaPrestamo?.moneda ?? "PEN")}</p>{check?.insuficiente ? <p>Saldo insuficiente. Faltan {dinero(check.faltante, cuotaPrestamo?.moneda ?? "PEN")}.</p> : check && <p>Saldo después del pago: {dinero(check.resultado, cuotaPrestamo?.moneda ?? "PEN")}</p>}</div>}
      <Campo etiqueta="Fecha de pago"><Input required type="date" max={hoyLima()} min={cuotaPrestamo?.fecha_desembolso} value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></Campo><Campo etiqueta="N° de operación"><Input required value={pago.operacion} onChange={(e) => setPago({ ...pago, operacion: e.target.value })} /></Campo>
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}<div className="flex justify-end gap-2"><Boton type="button" variante="linea" disabled={guardando} onClick={() => setPago(null)}>Cancelar</Boton><Boton type="submit" disabled={guardando || !check || check.insuficiente}><Wallet size={14} /> {guardando ? "Registrando…" : "Confirmar pago"}</Boton></div>
    </form>}</VentanaFlotante>
  </>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Database, Lock, Printer, RefreshCw, Unlock, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, hoy, MESES, soles } from "@/lib/format";
import { type Trabajador, useTrabajadores } from "@/lib/datos";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { exportarExcel } from "@/lib/exportar";
import { aporteAfp, useComisionesAfp } from "@/lib/afp";
import type { ComisionAfp } from "@/lib/decolecta.functions";

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
type Boleta = {
  id: string;
  planilla_id: string;
  trabajador_id: string;
  regimen_laboral: string;
  sistema_pensiones: string;
  dias_laborados: number;
  sueldo_basico: number;
  asignacion_familiar: number;
  horas_extra: number;
  otros_ingresos: number;
  total_ingresos: number;
  aporte_pension: number;
  renta_quinta: number;
  otros_descuentos: number;
  total_descuentos: number;
  neto_pagar: number;
  essalud: number;
  estado_pago: string;
  banco_id: string | null;
  fecha_pago: string | null;
  numero_operacion: string;
};

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
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: empresa } = useEmpresa();
  const { fuente } = useFuenteDocumento();
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [editando, setEditando] = useState<Record<string, Record<string, string>>>({});
  const [pestana, setPestana] = useState<"planilla" | "datos">("planilla");
  const [pago, setPago] = useState<{ banco_id: string; fecha_pago: string; numero_operacion: string } | null>(null);
  const [error, setError] = useState("");
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
      const { data, error } = await supabase.from("boletas").select("*").eq("planilla_id", planilla!.id);
      if (error) throw error;
      return data as Boleta[];
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

  const enPlanilla = trabajadores.filter((t) => t.tipo_contratacion !== "Honorarios" && t.activo);
  const tDe = (id: string) => trabajadores.find((t) => t.id === id);
  const cerrada = planilla?.estado === "Cerrada";
  const periodo = `${MESES[mes - 1]} ${anio}`;
  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["planilla", anio, mes] });
    await qc.invalidateQueries({ queryKey: ["boletas"] });
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
    const existentes = new Set(boletas.map((b) => b.trabajador_id));
    const nuevas = enPlanilla
      .filter((t) => !existentes.has(t.id) && Number(t.sueldo_mensual) > 0)
      .map((t) => ({
        planilla_id: p!.id,
        trabajador_id: t.id,
        ...calcularBoleta(t, { dias_laborados: 30, horas_extra: 0, otros_ingresos: 0, renta_quinta: 0, otros_descuentos: 0 }, comisiones, rmvDe(periodoAfp)),
      }));
    if (nuevas.length) {
      const { error: err } = await supabase.from("boletas").insert(nuevas);
      if (err) return setError(err.message);
    }
    if (sinSueldo.length)
      setError(`Sin sueldo mensual (no incluidos): ${sinSueldo.map((t) => t.nombre).join(", ")}. Complétalo en Personal.`);
    await refrescar();
  }

  const valor = (b: Boleta, campo: keyof Boleta) => editando[b.id]?.[campo] ?? String(b[campo] ?? 0);
  const cambiar = (id: string, campo: string, v: string) =>
    setEditando((e) => ({ ...e, [id]: { ...e[id], [campo]: v } }));

  async function guardarFila(b: Boleta) {
    const t = tDe(b.trabajador_id);
    if (!t) return;
    const num = (c: keyof Boleta) => Number(valor(b, c) || 0);
    const dias = num("dias_laborados");
    if (dias < 0 || dias > 30) return setError("Los días laborados deben estar entre 0 y 30.");
    const calc = calcularBoleta(t, {
      dias_laborados: dias,
      horas_extra: num("horas_extra"),
      otros_ingresos: num("otros_ingresos"),
      renta_quinta: num("renta_quinta"),
      otros_descuentos: num("otros_descuentos"),
    }, comisiones, rmvDe(periodoAfp));
    const { error: err } = await supabase.from("boletas").update(calc).eq("id", b.id);
    if (err) return setError(err.message);
    setEditando(({ [b.id]: _, ...resto }) => resto);
    await refrescar();
  }

  async function cambiarEstado() {
    if (!planilla) return;
    if (Object.keys(editando).length) return setError("Guarda los cambios pendientes antes de cerrar.");
    const nuevo = cerrada ? "Borrador" : "Cerrada";
    if (cerrada && boletas.some((b) => b.estado_pago === "Pagado")) return setError("No se puede reabrir: hay boletas pagadas.");
    const { error: err } = await supabase.from("planillas").update({ estado: nuevo }).eq("id", planilla.id);
    if (err) return setError(err.message);
    await refrescar();
  }

  async function pagarTodo() {
    if (!pago || !planilla) return;
    if (!pago.banco_id || !pago.fecha_pago || !pago.numero_operacion.trim())
      return setError("Para pagar indica banco, fecha y número de operación.");
    const { error: err } = await supabase
      .from("boletas")
      .update({ estado_pago: "Pagado", ...pago, numero_operacion: pago.numero_operacion.trim() })
      .eq("planilla_id", planilla.id)
      .eq("estado_pago", "Pendiente");
    if (err) return setError(err.message);
    setPago(null);
    await refrescar();
  }

  function imprimir(lista: Boleta[]) {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const m = (n: number) => `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fila = (a: string, b: number) => `<tr><td>${a}</td><td class="n">${m(b)}</td></tr>`;
    const html = lista
      .map((b) => {
        const t = tDe(b.trabajador_id);
        return `<section class="boleta">
        <header><div><b>${esc(empresa?.razon_social ?? "TELXEN SAC")}</b><br/>RUC ${esc(empresa?.ruc ?? "")}<br/>${esc(empresa?.direccion ?? "")}</div>
        <div class="r"><b>BOLETA DE PAGO</b><br/>${periodo}<br/>D.S. 001-98-TR</div></header>
        <table class="datos"><tr><td>Trabajador</td><td><b>${esc(t?.nombre ?? "")}</b></td><td>DNI</td><td>${esc(t?.dni ?? "")}</td></tr>
        <tr><td>Cargo</td><td>${esc(t?.cargo ?? "")}</td><td>Fecha ingreso</td><td>${fecha(t?.fecha_ingreso ?? null)}</td></tr>
        <tr><td>Régimen</td><td>${esc(b.regimen_laboral)}</td><td>Pensión</td><td>${esc(b.sistema_pensiones)} ${esc(t?.cuspp ?? "")}</td></tr>
        <tr><td>Días laborados</td><td>${b.dias_laborados}</td><td>Cuenta</td><td>${esc(t?.banco ?? "")} ${esc(t?.numero_cuenta ?? "")}</td></tr></table>
        <div class="cols">
          <table><thead><tr><th colspan="2">Ingresos</th></tr></thead>${fila("Sueldo básico", b.sueldo_basico)}${fila("Asignación familiar", b.asignacion_familiar)}${fila("Horas extra", b.horas_extra)}${fila("Otros ingresos", b.otros_ingresos)}<tr class="t"><td>Total ingresos</td><td class="n">${m(b.total_ingresos)}</td></tr></table>
          <table><thead><tr><th colspan="2">Descuentos</th></tr></thead>${fila(b.sistema_pensiones === "ONP" ? "ONP 13%" : b.sistema_pensiones, b.aporte_pension)}${fila("Renta 5ta categoría", b.renta_quinta)}${fila("Otros descuentos", b.otros_descuentos)}<tr class="t"><td>Total descuentos</td><td class="n">${m(b.total_descuentos)}</td></tr></table>
          <table><thead><tr><th colspan="2">Aportes empleador</th></tr></thead>${fila(b.regimen_laboral === "MYPE Micro" ? "SIS" : "EsSalud", b.essalud)}</table>
        </div>
        <p class="neto">NETO A PAGAR: ${m(b.neto_pagar)}</p>
        <div class="firmas"><span>Empleador</span><span>Trabajador</span></div></section>`;
      })
      .join("");
    w.document.write(`<html><head><title>Boletas ${periodo}</title><style>
      body{font-family:${fuente.css};font-size:11px;color:#111;margin:20px}
      .boleta{border:1px solid #333;padding:14px;margin-bottom:24px;page-break-after:always}
      header{display:flex;justify-content:space-between;border-bottom:2px solid #003352;padding-bottom:8px;margin-bottom:8px}.r{text-align:right}
      table{width:100%;border-collapse:collapse}td,th{padding:3px 5px;border-bottom:1px solid #ddd;text-align:left}
      th{background:#003352;color:#fff}.n{text-align:right}.t td{font-weight:bold;border-top:1px solid #333}
      .cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px}
      .neto{text-align:right;font-size:14px;font-weight:bold;margin-top:10px}
      .firmas{display:flex;justify-content:space-around;margin-top:50px}.firmas span{border-top:1px solid #333;padding-top:4px;width:180px;text-align:center}
    </style></head><body>${html}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  const suma = (c: keyof Boleta) => boletas.reduce((s, b) => s + Number(b[c] ?? 0), 0);
  const ordenadas = [...boletas].sort((a, b) => (tDe(a.trabajador_id)?.nombre ?? "").localeCompare(tDe(b.trabajador_id)?.nombre ?? ""));
  const pendientes = boletas.filter((b) => b.estado_pago === "Pendiente").length;
  const celda = (b: Boleta, campo: keyof Boleta) =>
    cerrada ? soles(Number(b[campo])) : (
      <Input type="number" step="0.01" min="0" value={valor(b, campo)} onChange={(e) => cambiar(b.id, campo, e.target.value)} className="py-1 text-right text-xs" />
    );

  return (
    <>
      <Encabezado
        titulo="Nómina y Boletas"
        subtitulo="Planilla mensual del personal en 5ta categoría"
        acciones={
          pestana === "planilla" && boletas.length > 0 && (
            <div className="flex gap-2">
              <Boton variante="linea" onClick={() => imprimir(ordenadas)}><Printer size={13} /> Imprimir boletas</Boton>
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
                          Pensión: b.sistema_pensiones, Días: b.dias_laborados, "Básico (S/)": Number(b.sueldo_basico),
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
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Boton variante={pestana === "planilla" ? "primario" : "linea"} onClick={() => setPestana("planilla")}>
          <ClipboardList size={13} /> Planilla
        </Boton>
        <Boton variante={pestana === "datos" ? "primario" : "linea"} onClick={() => setPestana("datos")}>
          <Database size={13} /> Datos
        </Boton>
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
            <Select value={mes} onChange={(e) => { setMes(Number(e.target.value)); setEditando({}); }} className="py-1.5">
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Año">
            <Input type="number" value={anio} onChange={(e) => { setAnio(Number(e.target.value)); setEditando({}); }} className="w-24 py-1.5" />
          </Campo>
          {!cerrada && (
            <Boton onClick={generar}>{planilla ? "Agregar personal faltante" : `Generar planilla ${periodo}`}</Boton>
          )}
          {planilla && (
            <>
              <Etiqueta tono={cerrada ? "good" : "neutro"}>{planilla.estado}</Etiqueta>
              <Boton variante="linea" onClick={cambiarEstado}>
                {cerrada ? <><Unlock size={13} /> Reabrir</> : <><Lock size={13} /> Cerrar planilla</>}
              </Boton>
              {cerrada && pendientes > 0 && !pago && (
                <Boton variante="accion" onClick={() => setPago({ banco_id: "", fecha_pago: hoy(), numero_operacion: "" })}>
                  <Check size={13} /> Registrar pago ({pendientes})
                </Boton>
              )}
            </>
          )}
        </div>
        {pago && (
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

      <Panel titulo={`Planilla ${periodo}`} extra={<span className="font-mono text-[11px] text-muted-foreground">{boletas.length} boletas</span>}>
        {!planilla || boletas.length === 0 ? (
          <Vacio texto="Aún no se ha generado la planilla de este mes." />
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
                  <th className="px-2 py-2">Estado</th><th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((b) => {
                  const t = tDe(b.trabajador_id);
                  const sucio = !!editando[b.id];
                  return (
                    <tr key={b.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-2 font-semibold text-ink">{t?.nombre}<span className="block text-[10px] font-normal text-muted-foreground">{b.regimen_laboral} · {b.sistema_pensiones}</span></td>
                      <td className="px-2 py-2">{cerrada ? b.dias_laborados : <Input type="number" min="0" max="30" value={valor(b, "dias_laborados")} onChange={(e) => cambiar(b.id, "dias_laborados", e.target.value)} className="py-1 text-xs" />}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.sueldo_basico))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.asignacion_familiar))}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "horas_extra")}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "otros_ingresos")}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.total_ingresos))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.aporte_pension))}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "renta_quinta")}</td>
                      <td className="px-2 py-2 text-right">{celda(b, "otros_descuentos")}</td>
                      <td className="px-2 py-2 text-right font-semibold text-ink">{soles(Number(b.neto_pagar))}</td>
                      <td className="px-2 py-2 text-right">{soles(Number(b.essalud))}</td>
                      <td className="px-2 py-2">
                        <Etiqueta tono={b.estado_pago === "Pagado" ? "good" : "bad"}>{b.estado_pago}</Etiqueta>
                        {b.fecha_pago && <span className="block text-[10px] text-muted-foreground">{fecha(b.fecha_pago)}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {sucio && <button type="button" title="Recalcular y guardar" onClick={() => guardarFila(b)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"><Check size={14} /></button>}
                          <button type="button" title="Imprimir boleta" onClick={() => imprimir([b])} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Printer size={14} /></button>
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
      )}
    </>
  );
}

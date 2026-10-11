import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronRight, Info, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { MESES, pct, soles } from "@/lib/format";
import { usePagosRRHH } from "@/lib/pagos-rrhh";
import { useCajasChicas, useGastosDirectos, useGastosGenerales, useProyectos, useVentas } from "@/lib/datos";
import { useMantenimientos, useTraslados } from "@/lib/vehiculos";
import { exportarExcel } from "@/lib/exportar";

const f2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const s2 = (n: number) => (n < 0 ? `S/ -${f2.format(Math.abs(n))}` : `S/ ${f2.format(n || 0)}`);
const esCero = (n: number) => Math.abs(n || 0) < 0.005;
const Guion = () => <span className="text-muted-foreground/60">-</span>;
const corto = (n: number) => (esCero(n) ? <Guion /> : s2(n));
const alerta = (n: number) => (n < -0.005 ? "bg-bad/10 text-bad" : "");

function MetaCelda({ valor, etiqueta, onGuardar }: { valor: number; etiqueta: string; onGuardar: (v: number) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  if (editando)
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        aria-label={etiqueta}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { setEditando(false); const v = Number(texto) || 0; if (v !== valor) onGuardar(v); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setTexto(String(valor)); setEditando(false); }
        }}
        className="h-6 w-full min-w-0 rounded border border-primary bg-card px-1 text-right text-[10px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title="Doble clic para editar"
      onDoubleClick={() => { setTexto(String(valor || "")); setEditando(true); }}
      onKeyDown={(e) => { if (e.key === "Enter") { setTexto(String(valor || "")); setEditando(true); } }}
      className="block h-6 w-full rounded border border-transparent px-1 text-right text-[10px] hover:border-line hover:bg-card focus:border-primary focus:outline-none"
    >
      {corto(valor)}
    </button>
  );
}

export const Route = createFileRoute("/_authenticated/flujo-caja")({
  head: () => ({
    meta: [
      { title: "Flujo de Caja — ERP TELXEN" },
      {
        name: "description",
        content: "Metas mensuales de ingreso y costo frente al resultado objetivo y el resultado realizado.",
      },
      { property: "og:title", content: "Flujo de Caja — ERP TELXEN" },
      { property: "og:description", content: "Metas de ingreso y costo por mes, resultado objetivo y realizado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlujoCaja,
});

type Meta = {
  id: string;
  anio: number;
  mes: number;
  meta_ingreso: number;
  meta_costo: number;
  notas: string;
};

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

/** Mes (1-12) de una fecha ISO si pertenece al año indicado. */
function mesDe(fechaIso: string | null | undefined, anio: number): number | null {
  if (!fechaIso) return null;
  const [a, m] = fechaIso.slice(0, 10).split("-");
  if (Number(a) !== anio) return null;
  const mes = Number(m);
  return mes >= 1 && mes <= 12 ? mes : null;
}

function FlujoCaja() {
  const { rol } = useAuth();
  const queryClient = useQueryClient();
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [obra, setObra] = useState("global");
  const [costoAbierto, setCostoAbierto] = useState(false);
  const [verTendencia, setVerTendencia] = useState(true);
  const [pestana, setPestana] = useState<"resumen" | "matriz">(() => {
    const g = localStorage.getItem("flujo-caja:pestana");
    return g === "matriz" ? "matriz" : "resumen";
  });
  const cambiarPestana = (p: "resumen" | "matriz") => {
    setPestana(p);
    localStorage.setItem("flujo-caja:pestana", p);
  };
  const global = obra === "global";
  const { data: proyectos = [] } = useProyectos();
  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as { activo: boolean; monedas: string; saldo_inicial: number }[];
    },
  });

  const { data: ventas = [] } = useVentas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: cajas = [] } = useCajasChicas();
  const { data: rrhh } = usePagosRRHH();
  const { data: mantVeh = [] } = useMantenimientos();
  const { data: trasVeh = [] } = useTraslados();

  const { data: metas = [] } = useQuery({
    queryKey: ["metas_flujo_caja", anio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_flujo_caja")
        .select("*")
        .eq("anio", anio)
        .order("mes");
      if (error) throw error;
      return (data ?? []) as Meta[];
    },
  });

  const guardar = useMutation({
    mutationFn: async (v: { mes: number; meta_ingreso: number; meta_costo: number }) => {
      const { error } = await supabase
        .from("metas_flujo_caja")
        .upsert(
          { anio, mes: v.mes, meta_ingreso: v.meta_ingreso, meta_costo: v.meta_costo },
          { onConflict: "anio,mes" },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metas_flujo_caja", anio] }),
  });

  const filas = useMemo(() => {
    type Mov = {
      proyecto_id?: string | null;
      fecha_pago?: string | null;
      fecha_vencimiento?: string | null;
      fecha_emision?: string | null;
      fecha?: string | null;
      monto_soles: number;
      caja_chica_id?: string | null;
      condicion_pago?: string;
      estado_pago?: string | null;
      estado?: string;
    };
    const deObra = (x: { proyecto_id?: string | null }) => global || x.proyecto_id === obra;
    const V = (ventas as unknown as Mov[]).filter(deObra);
    const GD = (gastosD as unknown as Mov[]).filter(deObra);
    const GG = (gastosG as unknown as Mov[]).filter(deObra);
    const CC = cajas.filter(deObra);
    const RH = global ? (rrhh?.egresos ?? []) : [];
    const RHP = global ? (rrhh?.pendientes ?? []) : [];

    const base = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      etiqueta: MESES_CORTOS[i] ?? MESES[i] ?? String(i + 1),
      metaIngreso: 0,
      metaCosto: 0,
      ingresoReal: 0,
      costoReal: 0,
      egCompras: 0,
      egGenerales: 0,
      egMant: 0,
      egComb: 0,
      egCaja: 0,
      egRRHH: 0,
      ingresoProy: 0,
      egresoProy: 0,
    }));

    if (global)
      metas.forEach((m) => {
        const f = base[m.mes - 1];
        if (!f) return;
        f.metaIngreso = Number(m.meta_ingreso) || 0;
        f.metaCosto = Number(m.meta_costo) || 0;
      });

    // Saldo de apertura: saldo inicial de cuentas en soles + movimientos de años anteriores
    const inicioAnio = `${anio}-01-01`;
    const previo = (f: string | null | undefined) => !!f && f.slice(0, 10) < inicioAnio;
    let apertura = global
      ? bancos.filter((b) => b.activo && b.monedas === "PEN").reduce((s, b) => s + Number(b.saldo_inicial || 0), 0)
      : 0;

    const sumar = (
      fecha: string | null | undefined,
      monto: unknown,
      campo: "egCompras" | "egGenerales" | "egCaja" | "egRRHH" | "egMant" | "egComb",
    ) => {
      const n = Number(monto) || 0;
      if (previo(fecha)) apertura -= n;
      const mes = mesDe(fecha, anio);
      if (mes) {
        base[mes - 1]![campo] += n;
        base[mes - 1]!.costoReal += n;
      }
    };

    V.forEach((v) => {
      const n = Number(v.monto_soles) || 0;
      if (v.estado === "Pagado") {
        if (previo(v.fecha_pago)) apertura += n;
        const mes = mesDe(v.fecha_pago, anio);
        if (mes) base[mes - 1]!.ingresoReal += n;
      } else {
        const mes = mesDe(v.fecha_vencimiento ?? v.fecha_emision, anio);
        if (mes) base[mes - 1]!.ingresoProy += n;
      }
    });

    const gasto = (g: Mov, campo: "egCompras" | "egGenerales") => {
      if (g.caja_chica_id) return; // ya salió del banco al entregar la Caja Chica
      if (g.estado_pago === "Pagada" || g.condicion_pago !== "Crédito") {
        sumar(g.fecha_pago ?? (g.condicion_pago !== "Crédito" ? g.fecha : null), g.monto_soles, campo);
      } else {
        const mes = mesDe(g.fecha_vencimiento ?? g.fecha, anio);
        if (mes) base[mes - 1]!.egresoProy += Number(g.monto_soles) || 0;
      }
    };
    GD.forEach((g) => gasto(g, "egCompras"));
    GG.forEach((g) => gasto(g, "egGenerales"));
    CC.forEach((c) => sumar(c.fecha_entrega, c.monto_entregado, "egCaja"));
    RH.forEach((e) => sumar(e.fecha_pago, e.monto, "egRRHH"));
    RHP.forEach((d) => {
      const mes = mesDe(d.vencimiento ?? d.emision, anio);
      if (mes) base[mes - 1]!.egresoProy += Number(d.monto) || 0;
    });

    // Flota: mantenimiento y combustible pagados con banco (los de caja chica ya salieron al entregar la caja)
    if (global)
      mantVeh
        .filter((m) => !m.caja_chica_id && Number(m.costo) > 0)
        .forEach((m) => sumar(m.fecha, m.costo, "egMant"));
    trasVeh
      .filter((t) => !t.caja_chica_id && Number(t.combustible_monto) > 0 && (global || t.proyecto_id === obra))
      .forEach((t) => sumar(t.fecha, t.combustible_monto, "egComb"));

    let acumulado = 0;
    let saldo = apertura;
    let saldoProy = apertura;
    return base.map((f) => {
      const resultadoObjetivo = f.metaIngreso - f.metaCosto;
      const resultadoReal = f.ingresoReal - f.costoReal;
      acumulado += resultadoReal;
      const saldoInicioMes = saldo;
      saldo += resultadoReal;
      saldoProy += resultadoReal + f.ingresoProy - f.egresoProy;
      return {
        ...f,
        resultadoObjetivo,
        resultadoReal,
        desvioIngreso: f.ingresoReal - f.metaIngreso,
        desvioCosto: f.metaCosto - f.costoReal,
        variacion: resultadoReal - resultadoObjetivo,
        cumplimiento: resultadoObjetivo !== 0 ? (resultadoReal / resultadoObjetivo) * 100 : 0,
        acumulado,
        saldoInicioMes,
        saldoCierre: saldo,
        saldoProyectado: saldoProy,
      };
    });
  }, [metas, ventas, gastosD, gastosG, cajas, rrhh, anio, bancos, global, obra, mantVeh, trasVeh]);

  const total = useMemo(
    () =>
      filas.reduce(
        (a, f) => ({
          metaIngreso: a.metaIngreso + f.metaIngreso,
          metaCosto: a.metaCosto + f.metaCosto,
          ingresoReal: a.ingresoReal + f.ingresoReal,
          costoReal: a.costoReal + f.costoReal,
          egCompras: a.egCompras + f.egCompras,
          egGenerales: a.egGenerales + f.egGenerales,
          egMant: a.egMant + f.egMant,
          egComb: a.egComb + f.egComb,
          egCaja: a.egCaja + f.egCaja,
          egRRHH: a.egRRHH + f.egRRHH,
          ingresoProy: a.ingresoProy + f.ingresoProy,
          egresoProy: a.egresoProy + f.egresoProy,
        }),
        { metaIngreso: 0, metaCosto: 0, ingresoReal: 0, costoReal: 0, egCompras: 0, egGenerales: 0, egMant: 0, egComb: 0, egCaja: 0, egRRHH: 0, ingresoProy: 0, egresoProy: 0 },
      ),
    [filas],
  );

  const resultadoObjetivoAnual = total.metaIngreso - total.metaCosto;
  const resultadoRealAnual = total.ingresoReal - total.costoReal;
  const apertura = filas[0]?.saldoInicioMes ?? 0;
  const cierre = filas[11]?.saldoCierre ?? 0;
  const cierreProy = filas[11]?.saldoProyectado ?? 0;
  const lineasTesoreria: { concepto: string; valores: number[]; total: number; fuerte?: boolean; alerta?: boolean }[] = [
    { concepto: "Saldo inicial del mes", valores: filas.map((f) => f.saldoInicioMes), total: apertura },
    { concepto: "Saldo al cierre (real)", valores: filas.map((f) => f.saldoCierre), total: cierre, fuerte: true, alerta: true },
    { concepto: "Ingreso proyectado (CxC)", valores: filas.map((f) => f.ingresoProy), total: total.ingresoProy },
    { concepto: "Egreso proyectado (CxP)", valores: filas.map((f) => f.egresoProy), total: total.egresoProy },
    { concepto: "Saldo proyectado", valores: filas.map((f) => f.saldoProyectado), total: cierreProy, fuerte: true, alerta: true },
  ];
  const desglose = [
    { concepto: "↳ Compras y costos directos", valores: filas.map((f) => f.egCompras), total: total.egCompras },
    { concepto: "↳ Gastos generales", valores: filas.map((f) => f.egGenerales), total: total.egGenerales },
    { concepto: "↳ Mantenimiento de vehículos", valores: filas.map((f) => f.egMant), total: total.egMant },
    { concepto: "↳ Combustible de vehículos", valores: filas.map((f) => f.egComb), total: total.egComb },
    { concepto: "↳ Entregas de Caja Chica", valores: filas.map((f) => f.egCaja), total: total.egCaja },
    ...(global ? [{ concepto: "↳ Planilla, honorarios y tributos", valores: filas.map((f) => f.egRRHH), total: total.egRRHH }] : []),
  ];

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual - 2, actual - 1, actual, actual + 1];
  }, []);

  function exportar() {
    const filaHorizontal = (
      bloque: string,
      concepto: string,
      valores: (string | number)[],
      totalAnual: string | number,
    ) => ({
      Bloque: bloque,
      Concepto: concepto,
      ...Object.fromEntries(filas.map((f, i) => [f.etiqueta, valores[i] ?? 0])),
      "Total anual": totalAnual,
    });

    exportarExcel(`Flujo_de_Caja_${anio}${global ? "" : "_obra"}`, [
      {
        nombre: "Flujo de Caja",
        filas: [
          filaHorizontal("METAS", "Meta de ingreso", filas.map((f) => f.metaIngreso), total.metaIngreso),
          filaHorizontal("METAS", "Meta de costo", filas.map((f) => f.metaCosto), total.metaCosto),
          filaHorizontal(
            "METAS",
            "Resultado objetivo",
            filas.map((f) => f.resultadoObjetivo),
            resultadoObjetivoAnual,
          ),
          filaHorizontal("REALIZADO", "Ingreso realizado", filas.map((f) => f.ingresoReal), total.ingresoReal),
          filaHorizontal("REALIZADO", "Costo realizado", filas.map((f) => f.costoReal), total.costoReal),
          filaHorizontal(
            "REALIZADO",
            "Resultado realizado",
            filas.map((f) => f.resultadoReal),
            resultadoRealAnual,
          ),
          filaHorizontal(
            "CONTROL",
            "Variación",
            filas.map((f) => f.variacion),
            resultadoRealAnual - resultadoObjetivoAnual,
          ),
          filaHorizontal(
            "CONTROL",
            "Cumplimiento %",
            filas.map((f) => (f.resultadoObjetivo ? Number(f.cumplimiento.toFixed(1)) : "—")),
            resultadoObjetivoAnual
              ? Number(((resultadoRealAnual / resultadoObjetivoAnual) * 100).toFixed(1))
              : "—",
          ),
          filaHorizontal("CONTROL", "Flujo acumulado", filas.map((f) => f.acumulado), resultadoRealAnual),
          ...desglose.map((d) => filaHorizontal("DESGLOSE EGRESOS", d.concepto.replace("↳ ", ""), d.valores, d.total)),
          ...lineasTesoreria.map((d) => filaHorizontal("TESORERÍA", d.concepto, d.valores, d.total)),
        ],
      },
    ]);
  }

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const kpisA = [
    ...(global
      ? [
          { etiqueta: "Saldo en bancos al 1 de enero", valor: apertura, extra: "" },
          { etiqueta: "Saldo al cierre (real)", valor: cierre, extra: "" },
          { etiqueta: "Saldo proyectado a diciembre", valor: cierreProy, extra: "" },
        ]
      : [
          { etiqueta: "Por cobrar (CxC)", valor: total.ingresoProy, extra: "" },
          { etiqueta: "Por pagar (CxP)", valor: total.egresoProy, extra: "" },
          { etiqueta: "Flujo proyectado de la obra", valor: cierreProy, extra: "" },
        ]),
  ];
  const kpisMeta = global
    ? [
          { etiqueta: "Meta de ingreso", valor: total.metaIngreso, extra: "" },
          { etiqueta: "Meta de costo", valor: total.metaCosto, extra: "" },
          { etiqueta: "Resultado objetivo", valor: resultadoObjetivoAnual, extra: "" },
      ]
    : [];
  const kpisReal = [
    {
      etiqueta: "Ingreso realizado",
      valor: total.ingresoReal,
      extra: total.metaIngreso ? pct((total.ingresoReal / total.metaIngreso) * 100) : "",
    },
    {
      etiqueta: "Costo realizado",
      valor: total.costoReal,
      extra: total.metaCosto ? pct((total.costoReal / total.metaCosto) * 100) : "",
    },
    {
      etiqueta: "Resultado realizado",
      valor: resultadoRealAnual,
      extra: resultadoObjetivoAnual ? pct((resultadoRealAnual / resultadoObjetivoAnual) * 100) : "",
    },
  ];

  const filasGraf = filas.map((f) => {
    const activo = !esCero(f.ingresoReal) || !esCero(f.costoReal) || !esCero(f.ingresoProy) || !esCero(f.egresoProy);
    return { ...f, metaIngresoVis: activo ? f.metaIngreso : null, metaCostoVis: activo ? f.metaCosto : null };
  });

  return (
    <div style={{ fontFamily: "Roboto, system-ui, sans-serif" }}>
      <Encabezado
        titulo="Flujo de Caja"
        subtitulo={global ? "Finanzas y Contabilidad · Consolidado global en Soles" : `Flujo de la obra ${proyectos.find((p) => p.id === obra)?.nombre ?? ""} en Soles`}
        acciones={
          <div className="flex items-center gap-2">
            <Select value={obra} onChange={(e) => setObra(e.target.value)} className="w-56">
              <option value="global">Consolidado global</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} · ` : ""}{p.nombre}
                </option>
              ))}
            </Select>
            <Select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-32">
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
            <Boton variante="linea" onClick={exportar}>
              <Upload className="size-3.5" /> Exportar a Excel
            </Boton>
          </div>
        }
      />

      <div className="mb-4 flex gap-1 border-b border-line">
        {([
          { id: "resumen" as const, etiqueta: "Resumen" },
          { id: "matriz" as const, etiqueta: "Matriz anual" },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => cambiarPestana(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors ${
              pestana === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {pestana === "resumen" && (<>
      <div className={`mb-5 grid gap-4 ${global ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {[
          { titulo: global ? "Saldos" : "Proyección de la obra", items: kpisA, alertar: true },
          ...(global ? [{ titulo: "Metas", items: kpisMeta, alertar: false }] : []),
          { titulo: "Realizado", items: kpisReal, alertar: true },
        ].map((b) => (
          <section key={b.titulo} className="panel rise p-3">
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{b.titulo}</h3>
            <div className="grid gap-2">
              {b.items.map((k) => (
                <div key={k.etiqueta} className={`rounded-md border px-3 py-2 ${b.alertar && k.valor < -0.005 ? "border-bad/30 bg-bad/10" : "border-line bg-card"}`}>
                  <p className="label-mono">{k.etiqueta}</p>
                  <p className={`mt-0.5 text-right text-lg font-semibold tabular-nums ${k.valor < -0.005 ? "text-bad" : "text-ink"}`}>{s2(k.valor)}</p>
                  {k.extra && global && <p className="text-right text-[11px] tabular-nums text-muted-foreground">{k.extra} del objetivo</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
        {verTendencia && (
          <section className="panel rise flex flex-col p-3">
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Flujo acumulado</h3>
            <div className="min-h-56 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filas} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} width={62} tickFormatter={(v: number) => soles(v)} />
                  <Tooltip formatter={(v) => s2(Number(v))} />
                  <Area type="monotone" dataKey="acumulado" name="Flujo acumulado" stroke="var(--color-good)" fill="var(--color-good)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      <Panel
        titulo={`Comparativo mensual ${anio}`}
        className="mb-5"
        extra={
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={verTendencia} onChange={(e) => setVerTendencia(e.target.checked)} />
            Mostrar flujo acumulado
          </label>
        }
      >
        <div className="h-80 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filasGraf}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v: number) => soles(v)} />
              <Tooltip content={<TooltipComparativo global={global} />} cursor={{ fillOpacity: 0.06 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ingresoReal" name="Ingreso realizado" fill="var(--color-primary)" radius={[3, 3, 0, 0]}>
                {filas.map((f) => (
                  <Cell key={f.mes} fillOpacity={esCero(f.ingresoReal) && esCero(f.costoReal) ? 0.25 : 1} />
                ))}
              </Bar>
              <Bar dataKey="costoReal" name="Costo realizado" fill="var(--color-cta)" radius={[3, 3, 0, 0]}>
                {filas.map((f) => (
                  <Cell key={f.mes} fillOpacity={esCero(f.ingresoReal) && esCero(f.costoReal) ? 0.25 : 1} />
                ))}
              </Bar>
              {global && <Line type="step" dataKey="metaIngresoVis" name="Meta de ingreso" connectNulls={false} stroke="var(--color-primary)" strokeOpacity={0.55} strokeDasharray="5 4" strokeWidth={1.5} dot={false} />}
              {global && <Line type="step" dataKey="metaCostoVis" name="Meta de costo" connectNulls={false} stroke="var(--color-cta)" strokeOpacity={0.7} strokeDasharray="5 4" strokeWidth={1.5} dot={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        </Panel>
      </>)}

      {pestana === "matriz" && (<>
      <Panel titulo="Matriz anual" extra={<span className="label-mono">Doble clic en una meta para editarla</span>}>
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs tabular-nums [&_td]:whitespace-nowrap">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-[16%] border-b border-r border-line bg-paper px-2 py-2 text-left text-[10px] uppercase">
                  Concepto
                </th>
                {filas.map((f) => (
                  <th key={f.mes} className="border-b border-line bg-paper px-1 py-2 text-right text-[10px] uppercase">
                    {f.etiqueta}
                  </th>
                ))}
                <th className="sticky right-0 z-20 w-[12%] border-b border-l border-line bg-muted px-2 py-2 text-right text-[10px] uppercase">
                  Total anual
                </th>
              </tr>
            </thead>
            <tbody>
              {global && (<>
              <tr>
                <th className="border-b border-line bg-primary/10 px-2 py-1.5 text-left text-[11px] font-semibold uppercase text-primary sticky left-0 z-10 whitespace-nowrap">Metas</th><td colSpan={13} className="border-b border-line bg-primary/10" />
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-medium">Meta de ingreso</th>
                {filas.map((f) => (
                  <td key={f.mes} className="border-b border-line px-0.5 py-1">
                    <MetaCelda valor={f.metaIngreso} etiqueta={`Meta de ingreso ${f.etiqueta}`} onGuardar={(v) => guardar.mutate({ mes: f.mes, meta_ingreso: v, meta_costo: f.metaCosto })} />
                  </td>
                ))}
                <td className="sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold">{corto(total.metaIngreso)}</td>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-medium">Meta de costo</th>
                {filas.map((f) => (
                  <td key={f.mes} className="border-b border-line px-0.5 py-1">
                    <MetaCelda valor={f.metaCosto} etiqueta={`Meta de costo ${f.etiqueta}`} onGuardar={(v) => guardar.mutate({ mes: f.mes, meta_ingreso: f.metaIngreso, meta_costo: v })} />
                  </td>
                ))}
                <td className="sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold">{corto(total.metaCosto)}</td>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-semibold">Resultado objetivo</th>
                {filas.map((f) => (
                  <td key={f.mes} className="border-b border-line px-1 py-1.5 text-right text-[10px] font-semibold">{corto(f.resultadoObjetivo)}</td>
                ))}
                <td className="sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold">{corto(resultadoObjetivoAnual)}</td>
              </tr>
              </>)}

              <tr>
                <th className="border-b border-line bg-cta/15 px-2 py-1.5 text-left text-[11px] font-semibold uppercase text-foreground sticky left-0 z-10 whitespace-nowrap">Realizado</th><td colSpan={13} className="border-b border-line bg-cta/15" />
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-medium">Ingreso realizado</th>
                {filas.map((f) => (
                  <td key={f.mes} className="border-b border-line px-1 py-1.5 text-right text-[10px]">{corto(f.ingresoReal)}</td>
                ))}
                <td className="sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold">{corto(total.ingresoReal)}</td>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-medium">
                  <button type="button" onClick={() => setCostoAbierto(!costoAbierto)} className="flex items-center gap-1 hover:text-primary" aria-expanded={costoAbierto}>
                    {costoAbierto ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Costo realizado
                  </button>
                </th>
                {filas.map((f) => (
                  <td key={f.mes} className="border-b border-line px-1 py-1.5 text-right text-[10px]">{corto(f.costoReal)}</td>
                ))}
                <td className="sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold">{corto(total.costoReal)}</td>
              </tr>
              {costoAbierto && desglose.map((d) => (
                <tr key={d.concepto}>
                  <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1 pl-4 text-left text-[11px] font-normal text-muted-foreground">{d.concepto}</th>
                  {d.valores.map((v, i) => (
                    <td key={i} className="border-b border-line px-1 py-1 text-right text-[10px] text-muted-foreground">{corto(v)}</td>
                  ))}
                  <td className="sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1 text-right text-[10px]">{corto(d.total)}</td>
                </tr>
              ))}
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-semibold">Resultado realizado</th>
                {filas.map((f) => {
                  const tono = f.resultadoReal >= f.resultadoObjetivo ? "text-good" : f.resultadoReal >= f.resultadoObjetivo * 0.9 ? "text-warn" : "text-bad";
                  return <td key={f.mes} className={`border-b border-line px-1 py-1.5 text-right text-[10px] font-semibold ${f.resultadoReal < -0.005 ? alerta(f.resultadoReal) : tono}`}>{corto(f.resultadoReal)}</td>;
                })}
                <td className={`sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold ${resultadoRealAnual >= resultadoObjetivoAnual ? "text-good" : "text-bad"}`}>{corto(resultadoRealAnual)}</td>
              </tr>

              <tr>
                <th className="border-b border-line bg-muted px-2 py-1.5 text-left text-[11px] font-semibold uppercase text-muted-foreground sticky left-0 z-10 whitespace-nowrap">Control</th><td colSpan={13} className="border-b border-line bg-muted" />
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-medium">Variación</th>
                {filas.map((f) => (
                  <td key={f.mes} className={`border-b border-line px-1 py-1.5 text-right text-[10px] ${f.variacion >= 0 ? "text-good" : "bg-bad/10 font-semibold text-bad"}`}>{corto(f.variacion)}</td>
                ))}
                <td className={`sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold ${resultadoRealAnual - resultadoObjetivoAnual >= 0 ? "text-good" : "bg-bad/10 text-bad"}`}>{corto(resultadoRealAnual - resultadoObjetivoAnual)}</td>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left font-medium">Cumplimiento</th>
                {filas.map((f) => {
                  const tono = f.cumplimiento >= 100 ? "text-good" : f.cumplimiento >= 90 ? "text-warn" : f.cumplimiento < 0 ? "bg-bad/10 font-semibold text-bad" : "text-bad";
                  return <td key={f.mes} className={`border-b border-line px-1 py-1.5 text-right text-[10px] ${f.resultadoObjetivo ? tono : "text-muted-foreground"}`}>{f.resultadoObjetivo ? pct(f.cumplimiento) : "—"}</td>;
                })}
                <td className={`sticky right-0 z-10 border-b border-l border-line px-2 py-1.5 text-right text-[11px] font-semibold ${resultadoObjetivoAnual && resultadoRealAnual / resultadoObjetivoAnual < 0 ? "bg-bad/10 text-bad" : "bg-muted"}`}>
                  {resultadoObjetivoAnual ? pct((resultadoRealAnual / resultadoObjetivoAnual) * 100) : "—"}
                </td>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-r border-line bg-paper px-2 py-1.5 text-left font-semibold">Flujo acumulado</th>
                {filas.map((f) => (
                  <td key={f.mes} className={`px-0.5 py-1.5 text-right text-[10px] font-semibold ${alerta(f.acumulado)}`}>{corto(f.acumulado)}</td>
                ))}
                <td className={`sticky right-0 z-10 border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold ${resultadoRealAnual < 0 ? "text-bad" : ""}`}>{corto(resultadoRealAnual)}</td>
              </tr>
              <tr>
                <th className="border-b border-t border-line bg-primary/10 px-2 py-1.5 text-left text-[11px] font-semibold uppercase text-primary sticky left-0 z-10 whitespace-nowrap">{global ? "Tesorería y proyección (CxC / CxP)" : "Proyección de la obra (CxC / CxP)"}</th><td colSpan={13} className="border-b border-line bg-primary/10" />
              </tr>
              {lineasTesoreria.filter((l) => global || !l.concepto.startsWith("Saldo inicial") && !l.concepto.startsWith("Saldo al cierre")).map((l) => (
                <tr key={l.concepto}>
                  <th className={`sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1.5 text-left ${l.fuerte ? "font-semibold" : "font-medium"}`}>{global || !l.concepto.startsWith("Saldo") ? l.concepto : "Flujo proyectado"}</th>
                  {l.valores.map((v, i) => (
                    <td key={i} className={`border-b border-line px-0.5 py-1.5 text-right text-[10px] ${l.fuerte ? "font-semibold" : ""} ${l.alerta && v < 0 ? "bg-bad/10 text-bad" : ""}`}>{corto(v)}</td>
                  ))}
                  <td className={`sticky right-0 z-10 border-b border-l border-line bg-muted px-2 py-1.5 text-right text-[11px] font-semibold ${l.alerta && l.total < 0 ? "text-bad" : ""}`}>{corto(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <details className="group mt-3 rounded-md border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          <Info className="size-3.5 text-primary" /> ¿Cómo se calculan estos montos?
          <ChevronDown className="ml-auto size-3.5 transition-transform group-open:rotate-180" />
        </summary>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted-foreground">
        El ingreso realizado suma las facturas cobradas en el mes. El costo realizado suma las compras y gastos pagados
        más las entregas de Caja Chica; los gastos rendidos con Caja Chica no se vuelven a contar. El saldo inicial toma
        las cuentas en soles de Catálogos Maestros. La proyección usa la fecha de vencimiento de las facturas por cobrar,
        compras al crédito y pagos pendientes de RR. HH. En la vista por obra no se incluyen planillas ni tributos.
      </p>
      </details>
    </div>
  );
}

type FilaGraf = { etiqueta: string; ingresoReal: number; costoReal: number; egCompras: number; egGenerales: number; egMant: number; egComb: number; egCaja: number; egRRHH: number; metaIngreso: number; metaCosto: number; ingresoProy: number; egresoProy: number };
function TooltipComparativo({ active, payload, global }: { active?: boolean; payload?: { payload: FilaGraf }[]; global: boolean }) {
  const f = payload?.[0]?.payload;
  if (!active || !f) return null;
  const fila = (t: string, v: number, cls = "") => (
    <div className={`flex justify-between gap-6 ${cls}`}><span className="text-left">{t}</span><span className="text-right tabular-nums">{s2(v)}</span></div>
  );
  const eg = ([["Compras y costos directos", f.egCompras], ["Gastos generales", f.egGenerales], ["Mantenimiento vehículos", f.egMant], ["Combustible vehículos", f.egComb], ["Entregas Caja Chica", f.egCaja], ["RR. HH. y tributos", f.egRRHH]] as [string, number][]).filter(([, v]) => !esCero(v));
  return (
    <div className="min-w-60 rounded-md border border-line bg-card p-2.5 text-[11px] shadow-lg">
      <p className="mb-1 font-semibold">{f.etiqueta}</p>
      {fila("Ingreso realizado (cobros)", f.ingresoReal, "font-semibold text-primary")}
      {fila("Costo realizado", f.costoReal, "mt-1 font-semibold")}
      {eg.map(([t, v]) => <div key={t} className="pl-2 text-muted-foreground">{fila(`↳ ${t}`, v)}</div>)}
      {fila("Resultado", f.ingresoReal - f.costoReal, `mt-1 border-t border-line pt-1 font-semibold ${f.ingresoReal - f.costoReal < 0 ? "text-bad" : "text-good"}`)}
      {(!esCero(f.ingresoProy) || !esCero(f.egresoProy)) && <div className="mt-1 text-muted-foreground">{fila("Proyectado CxC", f.ingresoProy)}{fila("Proyectado CxP", f.egresoProy)}</div>}
      {global && <div className="mt-1 text-muted-foreground">{fila("Meta ingreso", f.metaIngreso)}{fila("Meta costo", f.metaCosto)}</div>}
    </div>
  );
}

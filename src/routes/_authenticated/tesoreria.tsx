import { useMantenimientos, useTraslados } from "@/lib/vehiculos";
import { createFileRoute } from "@tanstack/react-router";
import { coincide, Resaltar } from "@/components/Buscador";
import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Landmark, Search, Upload, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { consultarTipoCambio } from "@/lib/decolecta.functions";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import {
  useCajasChicas,
  useGastosDirectos,
  useGastosGenerales,
  useProyectos,
  useTerceros,
  useVentas,
} from "@/lib/datos";
import { InsigniaPago } from "@/components/CondicionPago";
import type { CuentaBancaria } from "@/components/CuentasBancarias";
import { exportarExcel } from "@/lib/exportar";
import { pagarRRHH, usePagosRRHH, type DocRRHH } from "@/lib/pagos-rrhh";

export const Route = createFileRoute("/_authenticated/tesoreria")({
  head: () => ({
    meta: [
      { title: "Tesorería — ERP TELXEN" },
      { name: "description", content: "Saldos bancarios, cuentas por cobrar y cuentas por pagar de TELXEN." },
      { property: "og:title", content: "Tesorería — ERP TELXEN" },
      { property: "og:description", content: "Control de liquidez: bancos, CxC y CxP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tesoreria,
});

type Mov = {
  id: string;
  moneda: "PEN" | "USD";
  monto: number;
  monto_soles: number;
  tipo_cambio: number;
  banco_id?: string | null;
  fecha_pago?: string | null;
  fecha_vencimiento?: string | null;
  condicion_pago?: string;
  estado_pago?: string;
};

type R = {
  id?: string | number | null;
  cliente_id?: string | number | null;
  numero_factura?: string | number | null;
  proyecto_id?: string | number | null;
  concepto?: string | number | null;
  fecha_emision?: string | number | null;
  created_at?: string | number | null;
  fecha_vencimiento?: string | number | null;
  condicion_pago?: string | number | null;
  moneda?: string | number | null;
  monto?: string | number | null;
  monto_soles?: string | number | null;
  total?: string | number | null;
  pct_detraccion?: string | number | null;
  tipo_cambio?: string | number | null;
  estado_pago?: string | number | null;
  proveedor_id?: string | number | null;
  proveedor?: string | number | null;
  comprobante?: string | number | null;
  rubro?: string | number | null;
  categoria?: string | number | null;
  fecha?: string | number | null;
  estado?: string | number | null;
  descripcion?: string | number | null;
};

type Pendiente = {
  id: string;
  tabla: "ventas" | "gastos_directos" | "gastos_generales" | "rrhh";
  doc?: DocRRHH;
  tercero: string;
  documento: string;
  obra: string;
  detalle: string;
  descripcion: string;
  emision: string;
  vencimiento: string | null;
  condicion: string;
  moneda: string;
  monto: number;
  soles: number;
  base?: number;
  pctDet?: number;
  tcDoc?: number;
};

const dinero = (n: number, m: string) =>
  `${m === "USD" ? "US$" : "S/"} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function enMonedaCuenta(m: Mov, cuenta: CuentaBancaria) {
  if (m.moneda === cuenta.monedas) return Number(m.monto);
  if (cuenta.monedas === "PEN") return Number(m.monto_soles);
  return Number(m.monto_soles) / (Number(m.tipo_cambio) || 1);
}

const diasA = (f: string | null) =>
  f ? Math.round((new Date(`${f}T00:00:00`).getTime() - new Date(`${hoy()}T00:00:00`).getTime()) / 86400000) : 0;

function Tesoreria() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const [pestana, setPestana] = useState<"cxc" | "cxp">("cxc");
  const [busqueda, setBusqueda] = useState("");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [accion, setAccion] = useState<{
    p: Pendiente; banco_id: string; fecha: string; operacion: string;
    detr: boolean; pct: string; banco_det: string; constancia: string;
  } | null>(null);
  const consultarTC = useServerFn(consultarTipoCambio);
  const { data: tcInfo } = useQuery({
    queryKey: ["tc_tesoreria", hoy()],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      try {
        const r = await consultarTC({ data: { fecha: hoy() } });
        if (r.encontrado && r.venta > 0) return { venta: r.venta, fecha: r.fecha, fuente: r.fuente || "SUNAT", aviso: "" };
      } catch { /* usar último registrado */ }
      const { data } = await supabase.from("tipo_cambio_diario").select("venta,fecha,fuente").order("fecha", { ascending: false }).limit(1).maybeSingle();
      if (data) return { venta: Number(data.venta), fecha: data.fecha, fuente: data.fuente, aviso: "No se obtuvo el TC de hoy; se usa el último disponible." };
      return { venta: 0, fecha: "", fuente: "", aviso: "Sin tipo de cambio disponible: los USD se muestran con el TC de cada documento." };
    },
  });
  const { data: ventasTC = [] } = useVentas();
  const tcRespaldo = (ventasTC as unknown as { moneda: string; tipo_cambio: number; fecha_emision?: string }[])
    .filter((v) => v.moneda === "USD" && Number(v.tipo_cambio) > 1)
    .sort((a, b) => String(b.fecha_emision ?? "").localeCompare(String(a.fecha_emision ?? "")))[0];
  const tcHoy = tcInfo?.venta || Number(tcRespaldo?.tipo_cambio ?? 0);
  const [error, setError] = useState("");
  const [filtroVence, setFiltroVence] = useState<"vencido" | "semana" | "mes" | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tercero, setTercero] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [lote, setLote] = useState<{ banco_id: string; fecha: string; operacion: string } | null>(null);
  const [errorLote, setErrorLote] = useState("");
  const [procesando, setProcesando] = useState(false);

  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("bancos").select("*").order("nombre");
      if (err) throw err;
      return (data ?? []) as unknown as CuentaBancaria[];
    },
  });
  const { data: ventas = [] } = useVentas();
  const { data: gd = [] } = useGastosDirectos();
  const { data: gg = [] } = useGastosGenerales();
  const { data: cajas = [] } = useCajasChicas();
  const { data: proyectos = [] } = useProyectos();
  const { data: terceros = [] } = useTerceros();
  const { data: rrhh } = usePagosRRHH();
  const { data: mantVeh = [] } = useMantenimientos();
  const { data: trasVeh = [] } = useTraslados();

  const nombreObra = (id: string | null) => (id ? (proyectos.find((p) => p.id === id)?.nombre ?? "—") : "Oficina");
  const nombreTercero = (id: string | null, respaldo = "") =>
    (id ? terceros.find((t) => t.id === id)?.razon_social : null) ?? (respaldo || "—");

  const saldos = useMemo(
    () =>
      cuentas.map((c) => {
        type V = Mov & { estado: string; banco_detraccion_id?: string | null; monto_detraccion?: number };
        const detEnCuenta = (v: V) => {
          const d = Number(v.monto_detraccion || 0);
          return c.monedas === "PEN" ? d : d / (Number(v.tipo_cambio) || 1);
        };
        const vs = (ventas as unknown as V[]).filter((v) => v.estado === "Pagado");
        const ingresos =
          vs.filter((v) => v.banco_id === c.id)
            .reduce((s, v) => s + enMonedaCuenta(v, c) - (v.banco_detraccion_id ? detEnCuenta(v) : 0), 0) +
          vs.filter((v) => v.banco_detraccion_id === c.id).reduce((s, v) => s + detEnCuenta(v), 0);
        const egresos =
          [...(gd as unknown as Mov[]), ...(gg as unknown as Mov[])]
            .filter((g) => g.banco_id === c.id && g.estado_pago === "Pagada")
            .reduce((s, g) => s + enMonedaCuenta(g, c), 0) +
          cajas
            .filter((k) => k.banco_id === c.id)
            .reduce(
              (s, k) =>
                s +
                enMonedaCuenta(
                  {
                    moneda: "PEN",
                    monto: Number(k.monto_entregado),
                    monto_soles: Number(k.monto_entregado),
                    tipo_cambio: 1,
                  } as Mov,
                  c,
                ),
              0,
            ) +
          [
            ...mantVeh.filter((m) => m.banco_id === c.id).map((m) => Number(m.costo)),
            ...trasVeh.filter((t) => t.banco_id === c.id).map((t) => Number(t.combustible_monto)),
          ].reduce((s, m) => s + enMonedaCuenta({ moneda: "PEN", monto: m, monto_soles: m, tipo_cambio: 1 } as Mov, c), 0);
        return { c, ingresos, egresos, saldo: Number(c.saldo_inicial) + ingresos - egresos };
      }),
    [cuentas, ventas, gd, gg, cajas, rrhh, mantVeh, trasVeh],
  );

  const cxc: Pendiente[] = (ventas as unknown as (Mov & Record<string, never>)[])
    .filter((v) => (v as unknown as { estado: string }).estado !== "Pagado")
    .map((v) => {
      const x = v as unknown as R;
      return {
        id: String(x.id),
        tabla: "ventas" as const,
        tercero: nombreTercero(x.cliente_id as string | null),
        documento: String(x.numero_factura || "—"),
        obra: nombreObra(x.proyecto_id as string),
        detalle: "Valorización / factura",
        descripcion: String(x.concepto ?? ""),
        emision: String(x.fecha_emision ?? String(x.created_at).slice(0, 10)),
        vencimiento: (x.fecha_vencimiento as string) ?? null,
        condicion: String(x.condicion_pago ?? "Crédito"),
        moneda: String(x.moneda),
        monto: Number(x.monto),
        soles: String(x.moneda) === "USD" && tcHoy > 0 ? Number(x.monto) * tcHoy : Number(x.monto_soles),
        base: Number(x.total) > 0 ? Number(x.total) : Number(x.monto),
        pctDet: Number(x.pct_detraccion) || 0,
        tcDoc: Number(x.tipo_cambio) || 1,
      };
    });

  const cxp: Pendiente[] = [
    ...[
    ...(gd as unknown as R[]).map((x) => ({ x, tabla: "gastos_directos" as const })),
    ...(gg as unknown as R[]).map((x) => ({ x, tabla: "gastos_generales" as const })),
  ]
    .filter(({ x }) => x.condicion_pago === "Crédito" && x.estado_pago !== "Pagada")
    .map(({ x, tabla }) => ({
      id: String(x.id),
      tabla,
      tercero: nombreTercero(x.proveedor_id as string | null, String(x.proveedor ?? "")),
      documento: String(x.comprobante || "—"),
      obra: nombreObra(x.proyecto_id as string | null),
      detalle: tabla === "gastos_directos" ? `Costo directo · ${x.rubro ?? ""}` : `Gasto general · ${x.categoria ?? ""}`,
      descripcion: String(x.descripcion ?? ""),
      emision: String(x.fecha),
      vencimiento: (x.fecha_vencimiento as string) ?? null,
      condicion: "Crédito",
      moneda: String(x.moneda),
      monto: Number(x.monto),
      soles: Number(x.monto_soles),
    })),
    ...(rrhh?.pendientes ?? []).map((d) => ({
      id: d.tabla + d.id, tabla: "rrhh" as const, doc: d, tercero: d.tercero, documento: d.documento, obra: d.obra,
      detalle: d.detalle, descripcion: d.descripcion, emision: d.emision, vencimiento: d.vencimiento,
      condicion: "Crédito", moneda: "PEN", monto: d.monto, soles: d.monto,
    })),
  ];

  const listaBase = (pestana === "cxc" ? cxc : cxp);
  const enVence = (p: Pendiente) => {
    const d = diasA(p.vencimiento);
    if (filtroVence === "vencido") return d < 0;
    if (filtroVence === "semana") return d >= 0 && d <= 7;
    if (filtroVence === "mes") return d >= 0 && d <= 30;
    return true;
  };
  const tercerosLista = Array.from(new Set(listaBase.map((p) => p.tercero))).sort();
  const listaFiltrada = listaBase.filter(
    (p) =>
      coincide(busqueda, p.tercero, p.documento, p.descripcion, p.detalle) &&
      enVence(p) &&
      (!tercero || p.tercero === tercero) &&
      (!desde || (p.vencimiento ?? "") >= desde) &&
      (!hasta || (p.vencimiento ?? "9999") <= hasta),
  );
  const clave = (p: Pendiente) => p.tabla + p.id;
  const seleccionados = listaFiltrada.filter((p) => seleccion.has(clave(p)));
  const totalSel = seleccionados.reduce((s2, p) => s2 + p.soles, 0);
  const alternar = (ps: Pendiente[], marcar: boolean) =>
    setSeleccion((prev) => {
      const n = new Set(prev);
      ps.forEach((p) => (marcar ? n.add(clave(p)) : n.delete(clave(p))));
      return n;
    });
  const limpiarFiltros = () => { setSeleccion(new Set()); };
  const lista = listaFiltrada.sort((a, b) => (a.vencimiento ?? "").localeCompare(b.vencimiento ?? ""));
  const kpi = (l: Pendiente[]) => ({
    total: l.reduce((s, p) => s + p.soles, 0),
    vencido: l.filter((p) => diasA(p.vencimiento) < 0).reduce((s, p) => s + p.soles, 0),
    semana: l.filter((p) => diasA(p.vencimiento) >= 0 && diasA(p.vencimiento) <= 7).reduce((s, p) => s + p.soles, 0),
    mes: l.filter((p) => diasA(p.vencimiento) >= 0 && diasA(p.vencimiento) <= 30).reduce((s, p) => s + p.soles, 0),
  });
  const kc = kpi(cxc);
  const kp = kpi(cxp);
  const k = pestana === "cxc" ? kc : kp;
  const saldoPEN = saldos.filter((s) => s.c.activo && s.c.monedas === "PEN").reduce((a, s) => a + s.saldo, 0);
  const saldoUSD = saldos.filter((s) => s.c.activo && s.c.monedas === "USD").reduce((a, s) => a + s.saldo, 0);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  /** Detracción en soles redondeada a entero (SUNAT). */
  function montoDetraccion(p: Pendiente, pct: number) {
    const baseSoles = (p.base ?? p.monto) * (p.moneda === "USD" ? (p.tcDoc ?? 1) : 1);
    return Math.round((baseSoles * pct) / 100);
  }
  const cuentasDet = cuentas.filter((c) => c.activo && /detracc/i.test(c.tipo_cuenta ?? ""));
  const cuentasCom = cuentas.filter((c) => c.activo && !/detracc/i.test(c.tipo_cuenta ?? ""));
  const consolidado = saldoPEN + saldoUSD * tcHoy;

  async function registrarUno(p: Pendiente, banco_id: string, fecha: string, numero_operacion: string): Promise<string | null> {
    if (p.tabla === "rrhh" && p.doc) {
      const { error: e2 } = await pagarRRHH(p.doc, banco_id, fecha, numero_operacion);
      return e2 ? e2.message : null;
    }
    const det = accion && accion.p === p && accion.detr && p.tabla === "ventas" ? accion : null;
    const cambios =
      p.tabla === "ventas"
        ? {
            estado: "Pagado", fecha_pago: fecha, banco_id, numero_operacion,
            ...(det
              ? {
                  banco_detraccion_id: det.banco_det,
                  pct_detraccion: Number(det.pct),
                  monto_detraccion: montoDetraccion(p, Number(det.pct)),
                  detraccion_estado: "Depositada",
                  detraccion_fecha: fecha,
                  detraccion_constancia: det.constancia.trim(),
                }
              : {}),
          }
        : { estado_pago: "Pagada", fecha_pago: fecha, banco_id, numero_operacion };
    const { error: err } = await supabase.from(p.tabla as "ventas").update(cambios as never).eq("id", p.id);
    return err ? err.message : null;
  }

  async function confirmar() {
    if (!accion) return;
    if (!accion.banco_id) return setError("Elige la cuenta bancaria.");
    if (!accion.operacion.trim()) return setError("Ingresa el N° de operación.");
    if (accion.detr) {
      if (!(Number(accion.pct) > 0 && Number(accion.pct) < 100)) return setError("Ingresa un porcentaje de detracción válido.");
      if (!accion.banco_det) return setError("Elige la cuenta del Banco de la Nación.");
    }
    setError("");
    const msg = await registrarUno(accion.p, accion.banco_id, accion.fecha, accion.operacion.trim());
    if (msg) return setError(msg);
    setAccion(null);
    qc.invalidateQueries();
  }

  async function confirmarLote() {
    if (!lote) return;
    if (!lote.banco_id) return setErrorLote("Elige la cuenta bancaria.");
    if (!lote.operacion.trim()) return setErrorLote("Ingresa el N° de operación.");
    setErrorLote("");
    setProcesando(true);
    const fallos: string[] = [];
    for (const p of seleccionados) {
      const msg = await registrarUno(p, lote.banco_id, lote.fecha, lote.operacion.trim());
      if (msg) fallos.push(`${p.documento} (${p.tercero}): ${msg}`);
    }
    setProcesando(false);
    qc.invalidateQueries();
    if (fallos.length) {
      setSeleccion(new Set(seleccionados.filter((p) => fallos.some((f) => f.startsWith(p.documento))).map(clave)));
      return setErrorLote(`No se registraron: ${fallos.join(" · ")}`);
    }
    setSeleccion(new Set());
    setLote(null);
  }

  const tarjeta = (titulo: string, monto: number, filtro: "vencido" | "semana" | "mes" | null, tono = "text-ink") => {
    const cero = Math.abs(monto) < 0.005;
    const activa = filtro !== null && filtroVence === filtro;
    const clicable = filtro === null || !cero;
    return (
      <button
        type="button"
        disabled={!clicable}
        onClick={() => { setFiltroVence(filtro === null || activa ? null : filtro); limpiarFiltros(); }}
        className={`panel p-4 text-left transition ${activa ? "ring-2 ring-primary" : ""} ${filtro !== null && cero ? "cursor-default opacity-60" : "hover:bg-ink/5"}`}
      >
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{titulo}</p>
        <p className={`mt-1 text-lg font-semibold ${filtro !== null && cero ? "text-muted-foreground" : tono}`}>{soles(monto)}</p>
      </button>
    );
  };

  return (
    <div className="font-['Roboto']">
      <Encabezado
        titulo="Tesorería"
        subtitulo="Bancos, cuentas por cobrar y cuentas por pagar"
        acciones={
          <Boton
            variante="accion"
            onClick={() =>
              exportarExcel("tesoreria", [
                {
                  nombre: "Bancos",
                  filas: saldos.map((s) => ({
                    Banco: s.c.nombre, Moneda: s.c.monedas, "N° Cuenta": s.c.numero_cuenta,
                    "Saldo inicial": Number(s.c.saldo_inicial), Ingresos: s.ingresos, Egresos: s.egresos, Saldo: s.saldo,
                  })),
                },
                ...[["Cuentas por cobrar", cxc], ["Cuentas por pagar", cxp]].map(([n, l]) => ({
                  nombre: n as string,
                  filas: (l as Pendiente[]).map((p) => ({
                    Tercero: p.tercero, Documento: p.documento, Obra: p.obra, Detalle: p.detalle,
                    Emisión: p.emision, Vencimiento: p.vencimiento ?? "", Moneda: p.moneda, Monto: p.monto, "Equiv. S/": p.soles,
                  })),
                })),
              ])
            }
          >
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <div className="panel mb-4 flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-primary/5 p-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Balance consolidado en PEN</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tcHoy > 0 ? `TC venta ${tcHoy.toFixed(3)}${tcInfo?.venta ? ` · ${fmtFecha(tcInfo.fecha)} · ${tcInfo.fuente}` : " · referencial"}` : "Sin tipo de cambio"}
          </p>
          {tcInfo?.aviso && !(tcInfo.venta > 0) && tcHoy > 0 && <p className="mt-1 text-[11px] text-warn">Se usa el TC de la última factura en USD como referencia.</p>}
          {tcInfo?.aviso && !(tcHoy > 0) && <p className="mt-1 flex items-center gap-1 text-[11px] text-warn"><AlertTriangle size={12} /> {tcInfo.aviso}</p>}
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${consolidado < 0 ? "text-bad" : "text-ink"}`}>{soles(consolidado)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">PEN {dinero(saldoPEN, "PEN")} · USD {dinero(saldoUSD, "USD")}</p>
        </div>
      </div>

      <Panel
        titulo="Saldos bancarios"
        className="mb-4"
        extra={
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-md border border-line bg-muted px-2.5 py-1 text-muted-foreground">
              Total PEN: <b className={saldoPEN < 0 ? "text-bad" : "text-ink"}>{dinero(saldoPEN, "PEN")}</b>
            </span>
            <span className="rounded-md border border-line bg-muted px-2.5 py-1 text-muted-foreground">
              Total USD: <b className={saldoUSD < 0 ? "text-bad" : "text-ink"}>{dinero(saldoUSD, "USD")}</b>
            </span>
          </div>
        }
      >
        {saldos.length === 0 ? (
          <Vacio texto="Registra tus cuentas en Catálogos Maestros › Bancos." />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {saldos.filter((s) => s.c.activo).map((s) => (
              <div key={s.c.id} className={`rounded-lg border p-3 text-xs ${s.saldo < 0 ? "border-bad/40 bg-bad/10" : "border-line"}`}>
                <div className="flex justify-between">
                  <b className="text-ink">{s.c.nombre}</b>
                  <span className="text-muted-foreground">{s.c.monedas} · {s.c.tipo_cuenta}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">N° {String(s.c.numero_cuenta ?? "").replace(/^\s*(n[°º.]?|nro\.?|cta\.?)\s*/i, "") || "—"}</p>
                <p className={`mt-2 flex items-center justify-end gap-1.5 text-lg font-semibold tabular-nums ${s.saldo < 0 ? "text-bad" : "text-ink"}`}>
                  {s.saldo < 0 && <AlertTriangle size={16} />}
                  {dinero(s.saldo, s.c.monedas)}
                </p>
                <div className="mt-1 space-y-0.5 text-[11px] tabular-nums text-muted-foreground">
                  <div className="flex justify-between"><span>Inicial</span><span>{dinero(s.c.saldo_inicial, s.c.monedas)}</span></div>
                  <div className="flex justify-between"><span>Ingresos (+)</span><span className="text-good">{dinero(s.ingresos, s.c.monedas)}</span></div>
                  <div className="flex justify-between"><span>Egresos (−)</span><span className="text-bad">{dinero(s.egresos, s.c.monedas)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="mb-3 flex gap-2">
        {(["cxc", "cxp"] as const).map((t) => {
          const activa = pestana === t;
          const tono = t === "cxc"
            ? activa
              ? "border-good bg-good text-white"
              : "border-good/50 text-good hover:bg-good/10"
            : activa
              ? "border-warn bg-warn text-white"
              : "border-warn/50 text-warn hover:bg-warn/10";
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setPestana(t); setAccion(null); setFiltroVence(null); setTercero(""); setSeleccion(new Set()); }}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${tono}`}
            >
              {t === "cxc" ? `Cuentas por cobrar (${cxc.length})` : `Cuentas por pagar (${cxp.length})`}
            </button>
          );
        })}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {tarjeta(pestana === "cxc" ? "Total por cobrar" : "Total por pagar", k.total, null)}
        {tarjeta("Vencido", k.vencido, "vencido", k.vencido > 0 ? "text-bad" : "text-ink")}
        {tarjeta("Vence en 7 días", k.semana, "semana")}
        {tarjeta("Vence en 30 días", k.mes, "mes")}
      </div>

<Panel titulo={pestana === "cxc" ? "Facturas emitidas pendientes de cobro" : "Compras al crédito, planillas, honorarios, beneficios y obligaciones con el Estado"}
>
        <div className="flex flex-wrap items-end gap-2 border-b border-line bg-muted/40 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); limpiarFiltros(); }}
              placeholder={`Buscar en ${pestana === "cxc" ? "cobranzas" : "pagos"}...`}
              className="h-9 w-full rounded-md border border-line bg-card pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <label className="text-[10px] uppercase text-muted-foreground">Vence desde
            <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); limpiarFiltros(); }} />
          </label>
          <label className="text-[10px] uppercase text-muted-foreground">Hasta
            <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); limpiarFiltros(); }} />
          </label>
          <label className="text-[10px] uppercase text-muted-foreground">{pestana === "cxc" ? "Cliente" : "Proveedor"}
            <Select value={tercero} onChange={(e) => { setTercero(e.target.value); limpiarFiltros(); }}>
              <option value="">Todos</option>
              {tercerosLista.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </label>
          {(desde || hasta || tercero || filtroVence) && (
            <Boton variante="linea" onClick={() => { setDesde(""); setHasta(""); setTercero(""); setFiltroVence(null); limpiarFiltros(); }}>
              Limpiar filtros
            </Boton>
          )}
          {seleccionados.length > 0 && (
            <Boton variante="accion" onClick={() => { setErrorLote(""); setLote({ banco_id: "", fecha: hoy(), operacion: "" }); }}>
              {pestana === "cxc" ? "Registrar cobros en lote" : "Registrar pagos en lote"} ({seleccionados.length} · {soles(totalSel)})
            </Boton>
          )}
        </div>
        {lista.length === 0 ? (
          <Vacio
            texto={
              busqueda
                ? `Sin coincidencias para «${busqueda}»`
                : (pestana === "cxc" ? "No hay facturas por cobrar." : "No hay compras al crédito por pagar.")
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="w-8 pl-4 py-2">
                    <input
                      type="checkbox"
                      aria-label="Marcar todo"
                      checked={lista.length > 0 && seleccionados.length === lista.length}
                      onChange={(e) => alternar(lista, e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-2 font-medium">{pestana === "cxc" ? "Cliente" : "Proveedor"}</th>
                  <th className="px-3 py-2 font-medium">Documento</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium">Emisión</th>
                  <th className="px-3 py-2 font-medium">Vencimiento</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                  <th className="px-3 py-2 text-right font-medium">Equiv. S/</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  lista.reduce((m, p) => { const g = pestana === "cxc" ? p.tercero : p.obra; return m.set(g, [...(m.get(g) ?? []), p]); }, new Map<string, Pendiente[]>()),
                ).map(([obra, filas]) => {
                  const cerrado = cerrados.has(obra);
                  const sub = filas.reduce((s, p) => s + p.soles, 0);
                  return (
                    <Fragment key={obra}>
                      <tr
                        className="cursor-pointer border-b border-line bg-muted/60 hover:bg-muted"
                        onClick={() =>
                          setCerrados((prev) => {
                            const n = new Set(prev);
                            if (n.has(obra)) n.delete(obra); else n.add(obra);
                            return n;
                          })
                        }
                      >
                        <td className="pl-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Marcar ${obra}`}
                            checked={filas.every((p) => seleccion.has(clave(p)))}
                            onChange={(e) => alternar(filas, e.target.checked)}
                          />
                        </td>
                        <td colSpan={6} className="px-4 py-2 font-semibold text-ink">
                          {cerrado ? "▸" : "▾"} {obra}{" "}
                          <span className="font-normal text-muted-foreground">({filas.length})</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ink">{soles(sub)}</td>
                        <td />
                      </tr>
                      {!cerrado && filas.map((p) => {
                        const d = diasA(p.vencimiento);
                        return (
                          <tr key={p.tabla + p.id} className="border-b border-line/60 align-top last:border-0">
                            <td className="pl-4 py-2.5">
                              <input type="checkbox" aria-label={`Marcar ${p.documento}`} checked={seleccion.has(clave(p))} onChange={(e) => alternar([p], e.target.checked)} />
                            </td>
                            <td className="px-4 py-2.5">
                              <b className="text-ink"><Resaltar texto={p.tercero} termino={busqueda}/></b>
                              {pestana === "cxc" && <div className="text-[10px] text-muted-foreground">{p.obra === "Oficina" ? "Sin obra" : p.obra}</div>}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-ink"><Resaltar texto={p.documento} termino={busqueda}/></td>
                            <td className="max-w-64 px-3 py-2.5">
                              <div className="text-ink"><Resaltar texto={p.descripcion || "—"} termino={busqueda}/></div>
                              <div className="text-[10px] text-muted-foreground"><Resaltar texto={p.detalle} termino={busqueda}/></div>
                            </td>
                            <td className="px-3 py-2.5">{fmtFecha(p.emision)}</td>
                            <td className="px-3 py-2.5">
                              <InsigniaPago condicion={p.condicion === "Contado" ? "Crédito" : p.condicion} vencimiento={p.vencimiento} pagado={false} />
                              <div className={`text-[10px] ${d < 0 ? "text-bad" : "text-muted-foreground"}`}>
                                {d < 0 ? `${-d} días de atraso` : d === 0 ? "Vence hoy" : `Faltan ${d} días`}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{dinero(p.monto, p.moneda)}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{p.moneda === "PEN" ? soles(p.soles) : <span title={tcHoy > 0 ? `TC ref. ${tcHoy.toFixed(3)}` : "TC del documento"}>{soles(p.soles)}<span className="block text-[9px] font-normal text-muted-foreground">TC ref. {(tcHoy || p.tcDoc || 0).toFixed(3)}</span></span>}</td>
                            <td className="px-4 py-2 text-right">
                              <Boton type="button" variante="linea" onClick={() => { setError(""); setAccion({ p, banco_id: "", fecha: hoy(), operacion: "", detr: false, pct: String(p.pctDet || 12), banco_det: cuentasDet[0]?.id ?? "", constancia: "" }); }}>
                                {pestana === "cxc" ? "Registrar cobro" : "Registrar pago"}
                              </Boton>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {lote && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !procesando) setLote(null); }}
        >
          <div className="mt-16 w-full max-w-md rounded-lg border border-line bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">{pestana === "cxc" ? "Registrar cobros en lote" : "Registrar pagos en lote"}</h2>
              <button type="button" onClick={() => !procesando && setLote(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" title="Cerrar"><X size={16} /></button>
            </div>
            <div className="space-y-3 px-5 py-4 text-xs">
              <p className="text-muted-foreground">
                {seleccionados.length} documento(s) · Total <b className="text-ink">{soles(totalSel)}</b>
              </p>
              <Select value={lote.banco_id} onChange={(e) => setLote({ ...lote, banco_id: e.target.value })}>
                <option value="">{pestana === "cxc" ? "Cuenta de ingreso…" : "Cuenta de egreso…"}</option>
                {cuentas.filter((c) => c.activo).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} · {c.monedas} · {c.numero_cuenta}</option>
                ))}
              </Select>
              <Input type="date" value={lote.fecha} onChange={(e) => setLote({ ...lote, fecha: e.target.value })} />
              <Input placeholder="N° de operación" value={lote.operacion} onChange={(e) => setLote({ ...lote, operacion: e.target.value })} />
              {errorLote && <p className="text-bad">{errorLote}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
              <Boton type="button" variante="linea" onClick={() => setLote(null)} disabled={procesando}>Cancelar</Boton>
              <Boton type="button" variante="accion" onClick={confirmarLote} disabled={procesando}>{procesando ? "Registrando…" : "Confirmar"}</Boton>
            </div>
          </div>
        </div>
      )}
      {accion && (() => {
        const p = accion.p;
        const det = accion.detr ? montoDetraccion(p, Number(accion.pct) || 0) : 0;
        const totalS = (p.base ?? p.monto) * (p.moneda === "USD" ? (p.tcDoc ?? 1) : 1);
        const banco = cuentas.find((c) => c.id === accion.banco_id);
        const bn = cuentas.find((c) => c.id === accion.banco_det);
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setAccion(null); }}>
            <div className="mt-14 w-full max-w-lg rounded-lg border border-line bg-card font-['Roboto'] shadow-xl">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">{p.tabla === "ventas" ? "Registrar cobro" : "Registrar pago"}</h2>
                <button type="button" onClick={() => setAccion(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" title="Cerrar"><X size={16} /></button>
              </div>
              <div className="space-y-3 px-5 py-4 text-xs">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-line bg-muted/40 p-3">
                  <span className="text-muted-foreground">{p.tabla === "ventas" ? "Cliente" : "Proveedor"}</span><b className="text-ink">{p.tercero}</b>
                  <span className="text-muted-foreground">Documento</span><b className="text-ink">{p.documento}</b>
                  <span className="text-muted-foreground">Monto</span>
                  <span className="text-right tabular-nums"><b className="text-ink">{dinero(p.base ?? p.monto, p.moneda)}</b>{p.moneda === "USD" && <span className="ml-2 text-muted-foreground">≈ {soles(totalS)}</span>}</span>
                </div>
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">Cuenta bancaria de destino
                  <Select value={accion.banco_id} onChange={(e) => setAccion({ ...accion, banco_id: e.target.value })}>
                    <option value="">Selecciona…</option>
                    {(p.tabla === "ventas" ? cuentasCom : cuentas.filter((c) => c.activo)).map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre} · {c.monedas} · {c.numero_cuenta}</option>
                    ))}
                  </Select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">N° de operación
                    <Input value={accion.operacion} onChange={(e) => setAccion({ ...accion, operacion: e.target.value })} />
                  </label>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">Fecha
                    <Input type="date" value={accion.fecha} onChange={(e) => setAccion({ ...accion, fecha: e.target.value })} />
                  </label>
                </div>
                {p.tabla === "ventas" && (
                  <div className="rounded-md border border-line p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={accion.detr} onChange={(e) => setAccion({ ...accion, detr: e.target.checked })} />
                      <Landmark size={14} /> Aplicar detracción
                    </label>
                    {accion.detr && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-[90px_1fr] gap-2">
                          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">%
                            <Input type="number" step="0.01" min="0" max="99" className="text-right" value={accion.pct} onChange={(e) => setAccion({ ...accion, pct: e.target.value })} />
                          </label>
                          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">Cuenta de detracciones
                            <Select value={accion.banco_det} onChange={(e) => setAccion({ ...accion, banco_det: e.target.value })}>
                              <option value="">Selecciona…</option>
                              {cuentasDet.map((c) => (<option key={c.id} value={c.id}>{c.nombre} · {c.numero_cuenta}</option>))}
                            </Select>
                          </label>
                        </div>
                        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">N° de constancia (opcional)
                          <Input value={accion.constancia} onChange={(e) => setAccion({ ...accion, constancia: e.target.value })} />
                        </label>
                        <div className="space-y-1 rounded-md bg-muted/50 p-2.5 tabular-nums">
                          <div className="flex justify-between"><span>{bn?.nombre ?? "Banco de la Nación"}</span><b className="text-ink">{soles(det)}</b></div>
                          <div className="flex justify-between"><span>{banco?.nombre ?? "Banco comercial"}</span><b className="text-ink">{soles(totalS - det)}</b></div>
                          <div className="flex justify-between border-t border-line pt-1 text-muted-foreground"><span>Total</span><span>{soles(totalS)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="text-bad">{error}</p>}
              </div>
              <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
                <Boton type="button" variante="linea" onClick={() => setAccion(null)}>Cancelar</Boton>
                <Boton type="button" variante="accion" onClick={confirmar}>Confirmar</Boton>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

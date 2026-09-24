import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useGastosDirectos, useGastosGenerales, useProyectos, useTerceros, useVentas } from "@/lib/datos";
import { InsigniaPago } from "@/components/CondicionPago";
import type { CuentaBancaria } from "@/components/CuentasBancarias";
import { exportarExcel } from "@/lib/exportar";

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
  tabla: "ventas" | "gastos_directos" | "gastos_generales";
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
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [accion, setAccion] = useState<{ p: Pendiente; banco_id: string; fecha: string } | null>(null);
  const [error, setError] = useState("");

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
  const { data: proyectos = [] } = useProyectos();
  const { data: terceros = [] } = useTerceros();

  const nombreObra = (id: string | null) => (id ? (proyectos.find((p) => p.id === id)?.nombre ?? "—") : "Oficina");
  const nombreTercero = (id: string | null, respaldo = "") =>
    (id ? terceros.find((t) => t.id === id)?.razon_social : null) ?? (respaldo || "—");

  const saldos = useMemo(
    () =>
      cuentas.map((c) => {
        const ingresos = (ventas as unknown as (Mov & { estado: string })[])
          .filter((v) => v.banco_id === c.id && v.estado === "Pagado")
          .reduce((s, v) => s + enMonedaCuenta(v, c), 0);
        const egresos = [...(gd as unknown as Mov[]), ...(gg as unknown as Mov[])]
          .filter((g) => g.banco_id === c.id && g.estado_pago === "Pagada")
          .reduce((s, g) => s + enMonedaCuenta(g, c), 0);
        return { c, ingresos, egresos, saldo: Number(c.saldo_inicial) + ingresos - egresos };
      }),
    [cuentas, ventas, gd, gg],
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
        soles: Number(x.monto_soles),
      };
    });

  const cxp: Pendiente[] = [
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
    }));

  const lista = (pestana === "cxc" ? cxc : cxp).sort((a, b) => (a.vencimiento ?? "").localeCompare(b.vencimiento ?? ""));
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

  async function confirmar() {
    if (!accion) return;
    if (!accion.banco_id) return setError("Elige la cuenta bancaria.");
    setError("");
    const { p, banco_id, fecha } = accion;
    const cambios =
      p.tabla === "ventas"
        ? { estado: "Pagado", fecha_pago: fecha, banco_id }
        : { estado_pago: "Pagada", fecha_pago: fecha, banco_id };
    const { error: err } = await supabase.from(p.tabla).update(cambios as never).eq("id", p.id);
    if (err) return setError(err.message);
    setAccion(null);
    qc.invalidateQueries({ queryKey: [p.tabla] });
  }

  const tarjeta = (titulo: string, valor: string, tono = "text-ink") => (
    <div className="panel p-4">
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{titulo}</p>
      <p className={`mt-1 font-mono text-lg font-semibold ${tono}`}>{valor}</p>
    </div>
  );

  return (
    <>
      <Encabezado
        titulo="Tesorería"
        subtitulo="Bancos, cuentas por cobrar y cuentas por pagar"
        acciones={
          <Boton
            variante="linea"
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
            Exportar a Excel
          </Boton>
        }
      />

      <Panel
        titulo="Saldos bancarios"
        className="mb-4"
        extra={
          <span className="font-mono text-[11px] text-muted-foreground">
            Total: <b className="text-ink">{dinero(saldoPEN, "PEN")}</b> · <b className="text-ink">{dinero(saldoUSD, "USD")}</b>
          </span>
        }
      >
        {saldos.length === 0 ? (
          <Vacio texto="Registra tus cuentas en Catálogos Maestros › Bancos." />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {saldos.filter((s) => s.c.activo).map((s) => (
              <div key={s.c.id} className="rounded-lg border border-line p-3 font-mono text-xs">
                <div className="flex justify-between">
                  <b className="text-ink">{s.c.nombre}</b>
                  <span className="text-muted-foreground">{s.c.monedas} · {s.c.tipo_cuenta}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">N° {s.c.numero_cuenta || "—"}</p>
                <p className={`mt-2 text-lg font-semibold ${s.saldo < 0 ? "text-bad" : "text-ink"}`}>{dinero(s.saldo, s.c.monedas)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Inicial {dinero(s.c.saldo_inicial, s.c.monedas)} · <span className="text-good">+{dinero(s.ingresos, s.c.monedas)}</span> ·{" "}
                  <span className="text-bad">−{dinero(s.egresos, s.c.monedas)}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="mb-3 flex gap-2">
        {(["cxc", "cxp"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setPestana(t); setAccion(null); }}
            className={`rounded-md border px-3 py-1.5 font-mono text-xs ${pestana === t ? "border-primary bg-primary text-primary-foreground" : "border-line"}`}
          >
            {t === "cxc" ? `Cuentas por cobrar (${cxc.length})` : `Cuentas por pagar (${cxp.length})`}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {tarjeta(pestana === "cxc" ? "Total por cobrar" : "Total por pagar", soles(k.total))}
        {tarjeta("Vencido", soles(k.vencido), k.vencido > 0 ? "text-bad" : "text-ink")}
        {tarjeta("Vence en 7 días", soles(k.semana))}
        {tarjeta("Vence en 30 días", soles(k.mes))}
      </div>

<Panel titulo={pestana === "cxc" ? "Facturas emitidas pendientes de cobro" : "Compras al crédito pendientes de pago"}>
        {lista.length === 0 ? (
          <Vacio texto={pestana === "cxc" ? "No hay facturas por cobrar." : "No hay compras al crédito por pagar."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
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
                  lista.reduce((m, p) => m.set(p.obra, [...(m.get(p.obra) ?? []), p]), new Map<string, Pendiente[]>()),
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
                        <td colSpan={6} className="px-4 py-2 font-semibold text-ink">
                          {cerrado ? "▸" : "▾"} {obra}{" "}
                          <span className="font-normal text-muted-foreground">({filas.length})</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-ink">{soles(sub)}</td>
                        <td />
                      </tr>
                      {!cerrado && filas.map((p) => {
                        const d = diasA(p.vencimiento);
                        const abierta = accion?.p.id === p.id;
                        return (
                          <tr key={p.tabla + p.id} className="border-b border-line/60 align-top last:border-0">
                            <td className="px-4 py-2.5"><b className="text-ink">{p.tercero}</b></td>
                            <td className="px-3 py-2.5">{p.documento}</td>
                            <td className="max-w-64 px-3 py-2.5">
                              <div className="text-ink">{p.descripcion || "—"}</div>
                              <div className="text-[10px] text-muted-foreground">{p.detalle}</div>
                            </td>
                            <td className="px-3 py-2.5">{fmtFecha(p.emision)}</td>
                            <td className="px-3 py-2.5">
                              <InsigniaPago condicion={p.condicion === "Contado" ? "Crédito" : p.condicion} vencimiento={p.vencimiento} pagado={false} />
                              <div className={`text-[10px] ${d < 0 ? "text-bad" : "text-muted-foreground"}`}>
                                {d < 0 ? `${-d} días de atraso` : d === 0 ? "Vence hoy" : `Faltan ${d} días`}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right">{dinero(p.monto, p.moneda)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold">{soles(p.soles)}</td>
                            <td className="px-4 py-2 text-right">
                              {abierta && accion ? (
                                <div className="flex min-w-64 flex-col gap-1.5">
                                  <Select value={accion.banco_id} onChange={(e) => setAccion({ ...accion, banco_id: e.target.value })}>
                                    <option value="">{pestana === "cxc" ? "Cuenta de ingreso…" : "Cuenta de egreso…"}</option>
                                    {cuentas.filter((c) => c.activo).map((c) => (
                                      <option key={c.id} value={c.id}>{c.nombre} · {c.monedas} · {c.numero_cuenta}</option>
                                    ))}
                                  </Select>
                                  <Input type="date" value={accion.fecha} onChange={(e) => setAccion({ ...accion, fecha: e.target.value })} />
                                  <div className="flex justify-end gap-1">
                                    <Boton type="button" onClick={confirmar}>Confirmar</Boton>
                                    <Boton type="button" variante="linea" onClick={() => setAccion(null)}>Cancelar</Boton>
                                  </div>
                                  {error && <p className="text-[10px] text-bad">{error}</p>}
                                </div>
                              ) : (
                                <Boton type="button" variante="linea" onClick={() => { setError(""); setAccion({ p, banco_id: "", fecha: hoy() }); }}>
                                  {pestana === "cxc" ? "Registrar cobro" : "Registrar pago"}
                                </Boton>
                              )}
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
    </>
  );
}

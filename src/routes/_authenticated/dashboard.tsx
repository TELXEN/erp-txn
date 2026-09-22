import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { pct, soles } from "@/lib/format";
import {
  costoRealPartida,
  costoRealProyecto,
  presupuestoProyecto,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
  useVentas,
} from "@/lib/datos";
import { exportarExcel, exportarPdf } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Financiero — ERP TELXEN" },
      { name: "description", content: "Consolidado global en Soles: presupuesto, ventas, gastos y utilidad por obra." },
      { property: "og:title", content: "Dashboard Financiero — ERP TELXEN" },
      { property: "og:description", content: "Presupuesto, ventas, gastos y utilidad consolidados en Soles." },
    ],
  }),
  component: Dashboard,
});

const COLOR_PRESUPUESTO = "oklch(0.46 0.083 162)";
const COLOR_VENTAS = "oklch(0.53 0.12 152)";
const COLOR_COSTO = "oklch(0.56 0.19 29)";

function corto(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function Dashboard() {
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: tareos = [] } = useTareos();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: ventas = [] } = useVentas();
  const [seleccion, setSeleccion] = useState("global");

  const global = seleccion === "global";
  const nombreVista = global ? "Consolidado Global" : (proyectos.find((p) => p.id === seleccion)?.nombre ?? "");

  /** Una fila financiera por obra: presupuesto, ventas y costo real. */
  const porProyecto = useMemo(
    () =>
      proyectos.map((p) => {
        const vd = ventas.filter((v) => v.proyecto_id === p.id);
        const cobrado = vd.filter((v) => v.estado === "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);
        const pendiente = vd.filter((v) => v.estado !== "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);
        const presupuesto = presupuestoProyecto(p.id, partidas);
        const costoReal = costoRealProyecto(p.id, gastosD, tareos, gastosG);
        return {
          id: p.id,
          nombre: p.nombre,
          presupuesto,
          cobrado,
          pendiente,
          facturado: cobrado + pendiente,
          costoReal,
          margen: cobrado - costoReal,
          avanceFacturado: presupuesto > 0 ? (cobrado / presupuesto) * 100 : 0,
        };
      }),
    [proyectos, partidas, ventas, gastosD, tareos, gastosG],
  );

  const datos = useMemo(() => {
    const filas = global ? porProyecto : porProyecto.filter((f) => f.id === seleccion);
    const gd = global ? gastosD : gastosD.filter((g) => g.proyecto_id === seleccion);
    const td = global ? tareos : tareos.filter((t) => t.proyecto_id === seleccion);
    const gg = global ? gastosG : gastosG.filter((g) => g.proyecto_id === seleccion);
    const totalVentas = filas.reduce((s, f) => s + f.cobrado, 0);
    const ventasPendientes = filas.reduce((s, f) => s + f.pendiente, 0);
    const presupuesto = filas.reduce((s, f) => s + f.presupuesto, 0);
    const totalDirectos = gd.reduce((s, g) => s + Number(g.monto_soles), 0);
    const totalTareo = td.reduce((s, t) => s + Number(t.costo_soles), 0);
    const totalGenerales = gg.reduce((s, g) => s + Number(g.monto_soles), 0);
    const totalGastos = totalDirectos + totalTareo + totalGenerales;
    return {
      presupuesto,
      totalVentas,
      ventasPendientes,
      totalDirectos,
      totalTareo,
      totalGenerales,
      totalGastos,
      margen: totalVentas - totalGastos,
    };
  }, [global, seleccion, porProyecto, gastosD, tareos, gastosG]);

  const grafico = useMemo(() => {
    const filas = global ? porProyecto : porProyecto.filter((f) => f.id === seleccion);
    return filas
      .filter((f) => f.presupuesto > 0 || f.facturado > 0 || f.costoReal > 0)
      .map((f) => ({
        obra: f.nombre.length > 18 ? `${f.nombre.slice(0, 17)}…` : f.nombre,
        nombre: f.nombre,
        Presupuesto: f.presupuesto,
        Ventas: f.cobrado,
        "Costo real": f.costoReal,
      }));
  }, [global, seleccion, porProyecto]);

  const barras = useMemo(() => {
    if (global) return [];
    return partidas
      .filter((p) => p.proyecto_id === seleccion)
      .map((p) => {
        const presupuesto = Number(p.presupuesto_inicial);
        const costo = costoRealPartida(p.id, gastosD);
        return {
          partida: `${p.especialidad} · ${p.nombre}`,
          avance: Number(p.avance_pct),
          gastado: presupuesto > 0 ? (costo / presupuesto) * 100 : 0,
          diferencia: presupuesto - costo,
        };
      });
  }, [global, seleccion, partidas, gastosD]);

  if (rol !== "gerente") return <SinAcceso />;

  const kpis = [
    { etiqueta: "Presupuesto Total", valor: datos.presupuesto },
    { etiqueta: "Total Ventas (Cobrado)", valor: datos.totalVentas },
    { etiqueta: "Total Gastos", valor: datos.totalGastos },
    { etiqueta: "Margen de Utilidad", valor: datos.margen },
  ];

  function excel() {
    exportarExcel(`reporte-${global ? "global" : "proyecto"}`, [
      {
        nombre: "KPIs",
        filas: [
          { Indicador: "Presupuesto Total (S/)", Valor: datos.presupuesto },
          { Indicador: "Total Ventas Cobradas (S/)", Valor: datos.totalVentas },
          { Indicador: "Ventas Pendientes de Pago (S/)", Valor: datos.ventasPendientes },
          { Indicador: "Compras Directas (S/)", Valor: datos.totalDirectos },
          { Indicador: "Mano de Obra / Tareo (S/)", Valor: datos.totalTareo },
          { Indicador: "Gastos Generales (S/)", Valor: datos.totalGenerales },
          { Indicador: "Total Gastos (S/)", Valor: datos.totalGastos },
          { Indicador: "Margen de Utilidad (S/)", Valor: datos.margen },
        ],
      },
      {
        nombre: "Por Proyecto",
        filas: (global ? porProyecto : porProyecto.filter((f) => f.id === seleccion)).map((f) => ({
          Obra: f.nombre,
          "Presupuesto (S/)": f.presupuesto,
          "Ventas Cobradas (S/)": f.cobrado,
          "Ventas por Cobrar (S/)": f.pendiente,
          "Costo Real (S/)": f.costoReal,
          "Margen (S/)": f.margen,
          "% Cobrado vs Presupuesto": Number(f.avanceFacturado.toFixed(1)),
        })),
      },
      {
        nombre: "Partidas",
        filas: barras.map((b) => ({
          Partida: b.partida,
          "Avance Fisico %": Number(b.avance.toFixed(1)),
          "Presupuesto Gastado %": Number(b.gastado.toFixed(1)),
          "Diferencia (S/)": b.diferencia,
        })),
      },
    ]);
  }

  function pdf() {
    exportarPdf({
      titulo: "Reporte Ejecutivo de Obra",
      subtitulo: `${nombreVista} — Moneda base: Soles (PEN)`,
      kpis,
      barras,
      archivo: `reporte-${global ? "global" : "proyecto"}`,
    });
  }

  const filasTabla = global ? porProyecto : porProyecto.filter((f) => f.id === seleccion);

  return (
    <>
      <Encabezado
        titulo="Dashboard Financiero"
        subtitulo="Consolidación en Soles (PEN)"
        acciones={
          <>
            <div className="w-60">
              <Select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
                <option value="global">Consolidado Global</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <Boton variante="linea" onClick={excel}>
              Exportar a Excel
            </Boton>
            <Boton onClick={pdf}>Exportar a PDF</Boton>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          etiqueta="Presupuesto Total"
          valor={datos.presupuesto}
          detalle="Suma de todas las partidas"
        />
        <Tarjeta
          etiqueta="Total Ventas (Cobrado)"
          valor={datos.totalVentas}
          detalle={`Por cobrar ${soles(datos.ventasPendientes)} · ${pct(
            datos.presupuesto > 0 ? (datos.totalVentas / datos.presupuesto) * 100 : 0,
          )} del presupuesto`}
        />
        <Tarjeta
          etiqueta="Total Gastos"
          valor={datos.totalGastos}
          detalle={`Directos ${soles(datos.totalDirectos)} · Tareo ${soles(datos.totalTareo)} · Generales ${soles(
            datos.totalGenerales,
          )}`}
        />
        <Tarjeta etiqueta="Margen de Utilidad Actual" valor={datos.margen} detalle="Ventas − Gastos" resaltar />
      </div>

      <Panel titulo={`Presupuesto vs Ventas vs Costo Real — ${nombreVista}`}>
        {grafico.length === 0 ? (
          <Vacio texto="Aún no hay presupuesto, ventas ni costos registrados." />
        ) : (
          <div className="h-80 w-full px-3 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="obra"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={grafico.length > 4 ? -20 : 0}
                  textAnchor={grafico.length > 4 ? "end" : "middle"}
                  height={grafico.length > 4 ? 56 : 30}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={corto} width={56} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(v: number) => soles(Number(v))}
                  labelFormatter={(_l, p) => p?.[0]?.payload?.nombre ?? ""}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Presupuesto" fill={COLOR_PRESUPUESTO} radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Bar dataKey="Ventas" fill={COLOR_VENTAS} radius={[4, 4, 0, 0]} maxBarSize={44} />
                <Bar dataKey="Costo real" fill={COLOR_COSTO} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="mt-4">
        <Panel titulo="Resumen financiero por obra">
          {filasTabla.length === 0 ? (
            <Vacio texto="No hay obras registradas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line/60 text-left">
                    <th className="label-mono px-4 py-2">Obra</th>
                    <th className="label-mono px-4 py-2 text-right">Presupuesto</th>
                    <th className="label-mono px-4 py-2 text-right">Ventas cobradas</th>
                    <th className="label-mono px-4 py-2 text-right">Por cobrar</th>
                    <th className="label-mono px-4 py-2 text-right">Costo real</th>
                    <th className="label-mono px-4 py-2 text-right">Margen</th>
                    <th className="label-mono px-4 py-2 text-right">% Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filasTabla.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-2 font-medium">{f.nombre}</td>
                      <td className="px-4 py-2 text-right font-mono">{soles(f.presupuesto)}</td>
                      <td className="px-4 py-2 text-right font-mono">{soles(f.cobrado)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{soles(f.pendiente)}</td>
                      <td
                        className={`px-4 py-2 text-right font-mono ${
                          f.costoReal > f.presupuesto && f.presupuesto > 0 ? "text-bad" : ""
                        }`}
                      >
                        {soles(f.costoReal)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono font-semibold ${
                          f.margen < 0 ? "text-bad" : "text-good"
                        }`}
                      >
                        {soles(f.margen)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{pct(f.avanceFacturado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel titulo={global ? "Rendimiento por Partida" : `Rendimiento por Partida — ${nombreVista}`}>
          {global ? (
            <Vacio texto="Selecciona un proyecto específico para ver el rendimiento por partida." />
          ) : barras.length === 0 ? (
            <Vacio texto="Este proyecto aún no tiene partidas registradas." />
          ) : (
            <ul className="divide-y divide-line/60">
              {barras.map((b) => {
                const sobre = b.gastado > b.avance;
                return (
                  <li key={b.partida} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="min-w-64 flex-1">
                      <p className="text-sm font-semibold">{b.partida}</p>
                      <div className="mt-2 space-y-1.5">
                        <Barra etiqueta="Avance Físico" valor={b.avance} clase="bg-primary" />
                        <Barra
                          etiqueta="Presupuesto Gastado"
                          valor={b.gastado}
                          clase={sobre ? "bg-bad" : "bg-good"}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="label-mono">Diferencia</p>
                      <p className={`font-mono text-sm font-semibold ${b.diferencia < 0 ? "text-bad" : "text-good"}`}>
                        {soles(b.diferencia)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  resaltar,
}: {
  etiqueta: string;
  valor: number;
  detalle: string;
  resaltar?: boolean;
}) {
  return (
    <div className="panel rise p-5">
      <p className="label-mono">{etiqueta}</p>
      <p
        className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
          resaltar ? (valor < 0 ? "text-bad" : "text-good") : "text-ink"
        }`}
      >
        {soles(valor)}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{detalle}</p>
    </div>
  );
}

function Barra({ etiqueta, valor, clase }: { etiqueta: string; valor: number; clase: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full growx rounded-full ${clase}`} style={{ width: `${Math.min(valor, 100)}%` }} />
      </div>
      <span className="w-14 text-right font-mono text-[11px]">{pct(valor)}</span>
    </div>
  );
}

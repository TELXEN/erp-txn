import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { pct, soles } from "@/lib/format";
import {
  costoRealPartida,
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
      { title: "Dashboard Financiero — Control de Obra" },
      { name: "description", content: "Consolidado global en Soles: ventas, gastos, utilidad y rendimiento por partida." },
      { property: "og:title", content: "Dashboard Financiero — Control de Obra" },
      { property: "og:description", content: "Ventas, gastos y utilidad consolidados en Soles." },
    ],
  }),
  component: Dashboard,
});

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

  const datos = useMemo(() => {
    const vd = global ? ventas : ventas.filter((v) => v.proyecto_id === seleccion);
    const gd = global ? gastosD : gastosD.filter((g) => g.proyecto_id === seleccion);
    const td = global ? tareos : tareos.filter((t) => t.proyecto_id === seleccion);
    const totalVentas = vd
      .filter((v) => v.estado === "Pagado")
      .reduce((s, v) => s + Number(v.monto_soles), 0);
    const ventasPendientes = vd
      .filter((v) => v.estado !== "Pagado")
      .reduce((s, v) => s + Number(v.monto_soles), 0);
    const totalDirectos = gd.reduce((s, g) => s + Number(g.monto_soles), 0);
    const totalTareo = td.reduce((s, t) => s + Number(t.costo_soles), 0);
    const totalGenerales = global ? gastosG.reduce((s, g) => s + Number(g.monto_soles), 0) : 0;
    const totalGastos = totalDirectos + totalTareo + totalGenerales;
    return { totalVentas, totalDirectos, totalTareo, totalGenerales, totalGastos, margen: totalVentas - totalGastos };
  }, [global, seleccion, ventas, gastosD, tareos, gastosG]);

  const barras = useMemo(() => {
    if (global) return [];
    return partidas
      .filter((p) => p.proyecto_id === seleccion)
      .map((p) => {
        const presupuesto = Number(p.presupuesto_inicial);
        const costo = costoRealPartida(p.id, tareos, gastosD);
        return {
          partida: `${p.especialidad} · ${p.nombre}`,
          avance: Number(p.avance_pct),
          gastado: presupuesto > 0 ? (costo / presupuesto) * 100 : 0,
          diferencia: presupuesto - costo,
        };
      });
  }, [global, seleccion, partidas, tareos, gastosD]);

  if (rol !== "gerente") return <SinAcceso />;

  const kpis = [
    { etiqueta: "Total Ventas", valor: datos.totalVentas },
    { etiqueta: "Total Gastos", valor: datos.totalGastos },
    { etiqueta: "Margen de Utilidad", valor: datos.margen },
  ];

  function excel() {
    exportarExcel(`reporte-${global ? "global" : "proyecto"}`, [
      {
        nombre: "KPIs",
        filas: [
          { Indicador: "Total Ventas (S/)", Valor: datos.totalVentas },
          { Indicador: "Compras Directas (S/)", Valor: datos.totalDirectos },
          { Indicador: "Mano de Obra / Tareo (S/)", Valor: datos.totalTareo },
          { Indicador: "Gastos Generales (S/)", Valor: datos.totalGenerales },
          { Indicador: "Total Gastos (S/)", Valor: datos.totalGastos },
          { Indicador: "Margen de Utilidad (S/)", Valor: datos.margen },
        ],
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

  return (
    <>
      <Encabezado
        titulo="Dashboard Financiero"
        subtitulo="Consolidación en Soles (PEN)"
        acciones={
          <>
            <Select className="w-60" value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
              <option value="global">Consolidado Global</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
            <Boton variante="linea" onClick={excel}>
              Exportar a Excel
            </Boton>
            <Boton onClick={pdf}>Exportar a PDF</Boton>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Tarjeta etiqueta="Total Ventas" valor={datos.totalVentas} detalle="Valorizaciones registradas" />
        <Tarjeta
          etiqueta="Total Gastos"
          valor={datos.totalGastos}
          detalle={`Directos ${soles(datos.totalDirectos)} · Tareo ${soles(datos.totalTareo)}${
            global ? ` · Generales ${soles(datos.totalGenerales)}` : ""
          }`}
        />
        <Tarjeta etiqueta="Margen de Utilidad Actual" valor={datos.margen} detalle="Ventas − Gastos" resaltar />
      </div>

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

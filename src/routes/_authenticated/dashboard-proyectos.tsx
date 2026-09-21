import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { CurvaS } from "@/components/CurvaS";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { pct, soles } from "@/lib/format";
import {
  costoRealProyecto,
  presupuestoProyecto,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
} from "@/lib/datos";
import { exportarExcel, exportarPdf } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/dashboard-proyectos")({
  head: () => ({
    meta: [
      { title: "Dashboard de Proyectos — ERP TELXEN" },
      {
        name: "description",
        content: "Estado, avance físico y desviación de costos de todas las obras en ejecución.",
      },
      { property: "og:title", content: "Dashboard de Proyectos — ERP TELXEN" },
      { property: "og:description", content: "Avance físico y control de costos por obra." },
    ],
  }),
  component: DashboardProyectos,
});

function DashboardProyectos() {
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();

  const filas = useMemo(
    () =>
      proyectos.map((p) => {
        const propias = partidas.filter((x) => x.proyecto_id === p.id);
        const presupuesto = presupuestoProyecto(p.id, partidas);
        const costoReal = costoRealProyecto(p.id, gastosD, tareos, gastosG);
        const baseAvance = propias.reduce((s, x) => s + Number(x.presupuesto_inicial), 0);
        const avance =
          baseAvance > 0
            ? propias.reduce((s, x) => s + Number(x.avance_pct) * Number(x.presupuesto_inicial), 0) / baseAvance
            : propias.length > 0
              ? propias.reduce((s, x) => s + Number(x.avance_pct), 0) / propias.length
              : 0;
        const gastado = presupuesto > 0 ? (costoReal / presupuesto) * 100 : 0;
        return {
          proyecto: p,
          partidas: propias.length,
          presupuesto,
          costoReal,
          avance,
          gastado,
          diferencia: presupuesto - costoReal,
          desviado: gastado > avance,
        };
      }),
    [proyectos, partidas, gastosD, gastosG, tareos],
  );

  const resumen = useMemo(() => {
    const presupuesto = filas.reduce((s, f) => s + f.presupuesto, 0);
    const costoReal = filas.reduce((s, f) => s + f.costoReal, 0);
    return {
      total: proyectos.length,
      enProceso: proyectos.filter((p) => p.situacion === "En proceso").length,
      retrasados: proyectos.filter((p) => p.situacion === "Retrasado").length,
      completados: proyectos.filter((p) => p.situacion === "Completado").length,
      presupuesto,
      costoReal,
      diferencia: presupuesto - costoReal,
      desviadas: filas.filter((f) => f.desviado).length,
    };
  }, [filas, proyectos]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function excel() {
    exportarExcel("dashboard-proyectos", [
      {
        nombre: "Resumen",
        filas: [
          { Indicador: "Obras registradas", Valor: resumen.total },
          { Indicador: "En proceso", Valor: resumen.enProceso },
          { Indicador: "Retrasadas", Valor: resumen.retrasados },
          { Indicador: "Completadas", Valor: resumen.completados },
          { Indicador: "Presupuesto total (S/)", Valor: resumen.presupuesto },
          { Indicador: "Costo real total (S/)", Valor: resumen.costoReal },
          { Indicador: "Diferencia (S/)", Valor: resumen.diferencia },
        ],
      },
      {
        nombre: "Obras",
        filas: filas.map((f) => ({
          Obra: f.proyecto.nombre,
          Cliente: f.proyecto.cliente,
          Status: f.proyecto.situacion,
          Prioridad: f.proyecto.prioridad,
          Partidas: f.partidas,
          "Presupuesto (S/)": f.presupuesto,
          "Costo Real (S/)": f.costoReal,
          "Avance Fisico %": Number(f.avance.toFixed(1)),
          "Presupuesto Gastado %": Number(f.gastado.toFixed(1)),
          "Diferencia (S/)": f.diferencia,
        })),
      },
    ]);
  }

  function pdf() {
    exportarPdf({
      titulo: "Dashboard de Proyectos",
      subtitulo: "Avance físico y control de costos por obra — Moneda base: Soles (PEN)",
      kpis: [
        { etiqueta: "Presupuesto Total", valor: resumen.presupuesto },
        { etiqueta: "Costo Real Total", valor: resumen.costoReal },
        { etiqueta: "Diferencia", valor: resumen.diferencia },
      ],
      barras: filas.map((f) => ({
        partida: f.proyecto.nombre,
        avance: f.avance,
        gastado: f.gastado,
        diferencia: f.diferencia,
      })),
      archivo: "dashboard-proyectos",
    });
  }

  return (
    <>
      <Encabezado
        titulo="Dashboard de Proyectos"
        subtitulo="Control operativo de obras"
        acciones={
          <>
            <Boton variante="linea" onClick={excel}>
              Exportar a Excel
            </Boton>
            <Boton onClick={pdf}>Exportar a PDF</Boton>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta etiqueta="Obras registradas" valor={String(resumen.total)} detalle={`${resumen.enProceso} en proceso · ${resumen.completados} completadas`} />
        <Tarjeta etiqueta="Obras retrasadas" valor={String(resumen.retrasados)} detalle={`${resumen.desviadas} con sobrecosto frente al avance`} tono={resumen.retrasados > 0 ? "bad" : "good"} />
        <Tarjeta etiqueta="Presupuesto total" valor={soles(resumen.presupuesto)} detalle="Suma de partidas de todas las obras" />
        <Tarjeta
          etiqueta="Costo real total"
          valor={soles(resumen.costoReal)}
          detalle={`Diferencia ${soles(resumen.diferencia)}`}
          tono={resumen.diferencia < 0 ? "bad" : "good"}
        />
      </div>

      <Panel titulo="Radiografía por obra">
        {filas.length === 0 ? (
          <Vacio texto="Aún no hay proyectos registrados." />
        ) : (
          <ul className="divide-y divide-line/60">
            {filas.map((f) => (
              <li key={f.proyecto.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-64 flex-1">
                    <p className="text-sm font-semibold">{f.proyecto.nombre}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {f.proyecto.cliente} · {f.partidas} partidas
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <InsigniaSituacion valor={f.proyecto.situacion} />
                      <InsigniaPrioridad valor={f.proyecto.prioridad} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="label-mono">Presupuesto / Costo real</p>
                    <p className="font-mono text-sm font-semibold">
                      {soles(f.presupuesto)}{" "}
                      <span className={f.desviado ? "text-bad" : "text-good"}>/ {soles(f.costoReal)}</span>
                    </p>
                    <p className={`font-mono text-[11px] ${f.diferencia < 0 ? "text-bad" : "text-muted-foreground"}`}>
                      Diferencia {soles(f.diferencia)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Barra etiqueta="Avance Físico" valor={f.avance} clase="bg-primary" />
                  <Barra
                    etiqueta="Presupuesto Gastado"
                    valor={f.gastado}
                    clase={f.desviado ? "bg-bad" : "bg-good"}
                  />
                </div>
              </li>
            ))}
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
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: "good" | "bad";
}) {
  return (
    <div className="panel rise p-5">
      <p className="label-mono">{etiqueta}</p>
      <p
        className={`mt-2 font-mono text-2xl font-bold tracking-tight ${
          tono === "bad" ? "text-bad" : tono === "good" ? "text-good" : "text-ink"
        }`}
      >
        {valor}
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

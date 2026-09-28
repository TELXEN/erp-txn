import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { pct, soles } from "@/lib/format";
import {
  clasificacionDeCargo,
  costoRealPartida,
  ofertaProyecto,
  presupuestoProyecto,
  resumenPresupuesto,
  useCargos,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
  useTiposPresupuesto,
  useTrabajadores,
  useVentas,
} from "@/lib/datos";
import { exportarExcel, exportarPdf } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Financiero — ERP TELXEN" },
      {
        name: "description",
        content: "Consolidado en Soles: oferta, ventas, costos por recurso y utilidad real por obra.",
      },
      { property: "og:title", content: "Dashboard Financiero — ERP TELXEN" },
      { property: "og:description", content: "Oferta, ventas, costos por recurso y utilidad real por obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

/** Composición del costo real ejecutado. */
const COMPOSICION = [
  { clave: "materiales", etiqueta: "Materiales", color: "#2563EB" },
  { clave: "subcontratos", etiqueta: "Subcontratos", color: "#F59E0B" },
  { clave: "equipos", etiqueta: "Equipos y Maquinaria", color: "#EA580C" },
  { clave: "servicios", etiqueta: "Servicios de Terceros", color: "#7C3AED" },
  { clave: "mod", etiqueta: "Mano de Obra Directa", color: "#10B981" },
  { clave: "honorarios", etiqueta: "Honorarios (locadores)", color: "#DB2777" },
  { clave: "staff", etiqueta: "Staff Técnico", color: "#0EA5E9" },
  { clave: "generales", etiqueta: "Gastos Generales", color: "#64748B" },
] as const;

type ClaveComposicion = (typeof COMPOSICION)[number]["clave"];

function Dashboard() {
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: tareos = [] } = useTareos();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: ventas = [] } = useVentas();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: cargos = [] } = useCargos();
  const { data: recibos = [] } = useQuery({
    queryKey: ["recibos_honorarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recibos_honorarios").select("proyecto_id,monto_bruto");
      if (error) throw error;
      return (data ?? []) as { proyecto_id: string | null; monto_bruto: number }[];
    },
  });
  const [seleccion, setSeleccion] = useState("global");
  const [exportandoPdf, setExportandoPdf] = useState(false);

  const global = seleccion === "global";
  const nombreVista = global ? "Consolidado Global" : (proyectos.find((p) => p.id === seleccion)?.nombre ?? "");

  /** Clasificación (Directo / Indirecto) de cada trabajador. */
  const clasifTrabajador = useMemo(() => {
    const mapa = new Map<string, "Directo" | "Indirecto">();
    trabajadores.forEach((t) => mapa.set(t.id, clasificacionDeCargo(t.cargo ?? "", cargos)));
    return mapa;
  }, [trabajadores, cargos]);

  /** Una fila financiera completa por obra. */
  const porProyecto = useMemo(
    () =>
      proyectos.map((p) => {
        const vd = ventas.filter((v) => v.proyecto_id === p.id);
        const cobrado = vd.filter((v) => v.estado === "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);
        const pendiente = vd.filter((v) => v.estado !== "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);
        const presupuesto = presupuestoProyecto(p.id, partidas);
        const oferta = ofertaProyecto(
          partidas.filter((x) => x.proyecto_id === p.id),
          tiposPresupuesto,
          p.pct_gastos_generales,
          p.pct_utilidad,
        );

        const gd = gastosD.filter((g) => g.proyecto_id === p.id);
        const porRubro = (rubro: string) =>
          gd.filter((g) => (g.rubro ?? "Materiales") === rubro).reduce((s, g) => s + Number(g.monto_soles), 0);
        const materiales = porRubro("Materiales");
        const subcontratos = porRubro("Subcontratos");
        const equipos = porRubro("Equipos");
        const servicios = porRubro("Servicios");

        const td = tareos.filter((t) => t.proyecto_id === p.id);
        let mod = 0;
        let staff = 0;
        td.forEach((t) => {
          const monto = Number(t.costo_soles);
          if (clasifTrabajador.get(t.trabajador_id) === "Indirecto") staff += monto;
          else mod += monto;
        });

        const generales = gastosG
          .filter((g) => g.proyecto_id === p.id)
          .reduce((s, g) => s + Number(g.monto_soles), 0);

        const honorarios = recibos
          .filter((r) => r.proyecto_id === p.id)
          .reduce((s, r) => s + Number(r.monto_bruto), 0);
        const resumen = resumenPresupuesto(
          partidas.filter((x) => x.proyecto_id === p.id),
          tiposPresupuesto,
        );

        const costoDirectoReal = materiales + subcontratos + equipos + servicios + mod + honorarios;
        const ggReal = generales + staff;
        const costoReal = costoDirectoReal + ggReal;
        const margen = cobrado - costoReal;
        const facturado = cobrado + pendiente;

        return {
          id: p.id,
          nombre: p.nombre,
          presupuesto,
          contractual: resumen.contractual,
          adicionales: resumen.adicionales,
          honorarios,
          pctGG: Number(p.pct_gastos_generales ?? 0),
          pctUtilidad: Number(p.pct_utilidad ?? 0),
          ggPresupuestado: oferta.gastosGenerales,
          utilidadPrevista: oferta.utilidad,
          ofertado: oferta.ofertado,
          cobrado,
          pendiente,
          facturado,
          materiales,
          subcontratos,
          equipos,
          servicios,
          mod,
          staff,
          generales,
          costoDirectoReal,
          ggReal,
          costoReal,
          margen,
          margenPct: cobrado > 0 ? (margen / cobrado) * 100 : 0,
          roiPct: costoReal > 0 ? (margen / costoReal) * 100 : 0,
          variacionUtilidad: margen - oferta.utilidad,
          cobranzaPct: facturado > 0 ? (cobrado / facturado) * 100 : 0,
          avanceFacturado: presupuesto > 0 ? (cobrado / presupuesto) * 100 : 0,
        };
      }),
    [proyectos, partidas, ventas, gastosD, tareos, gastosG, tiposPresupuesto, clasifTrabajador, recibos],
  );

  const filasTabla = useMemo(
    () => (global ? porProyecto : porProyecto.filter((f) => f.id === seleccion)),
    [global, seleccion, porProyecto],
  );

  const datos = useMemo(() => {
    const sum = (f: (x: (typeof filasTabla)[number]) => number) => filasTabla.reduce((s, x) => s + f(x), 0);
    const presupuesto = sum((f) => f.presupuesto);
    const ggPresupuestado = sum((f) => f.ggPresupuestado);
    const utilidadPrevista = sum((f) => f.utilidadPrevista);
    const ofertado = sum((f) => f.ofertado);
    const cobrado = sum((f) => f.cobrado);
    const pendiente = sum((f) => f.pendiente);
    const materiales = sum((f) => f.materiales);
    const subcontratos = sum((f) => f.subcontratos);
    const equipos = sum((f) => f.equipos);
    const servicios = sum((f) => f.servicios);
    const mod = sum((f) => f.mod);
    const staff = sum((f) => f.staff);
    const generales = sum((f) => f.generales);
    const honorarios = sum((f) => f.honorarios);
    const contractual = sum((f) => f.contractual);
    const adicionales = sum((f) => f.adicionales);
    const costoDirectoReal = materiales + subcontratos + equipos + servicios + mod + honorarios;
    const ggReal = generales + staff;
    const costoReal = costoDirectoReal + ggReal;
    const facturado = cobrado + pendiente;
    const margen = cobrado - costoReal;
    return {
      presupuesto,
      contractual,
      adicionales,
      honorarios,
      ggPresupuestado,
      utilidadPrevista,
      ofertado,
      cobrado,
      pendiente,
      facturado,
      materiales,
      subcontratos,
      equipos,
      servicios,
      mod,
      staff,
      generales,
      costoDirectoReal,
      ggReal,
      costoReal,
      margen,
      margenPct: cobrado > 0 ? (margen / cobrado) * 100 : 0,
      roiPct: costoReal > 0 ? (margen / costoReal) * 100 : 0,
      margenSobreOferta: ofertado > 0 ? (margen / ofertado) * 100 : 0,
      variacionUtilidad: margen - utilidadPrevista,
      cobranzaPct: facturado > 0 ? (cobrado / facturado) * 100 : 0,
      consumoPresupuesto: presupuesto > 0 ? (costoDirectoReal / presupuesto) * 100 : 0,
      consumoGG: ggPresupuestado > 0 ? (ggReal / ggPresupuestado) * 100 : 0,
    };
  }, [filasTabla]);

  const composicion = useMemo(() => {
    const valores: Record<ClaveComposicion, number> = {
      materiales: datos.materiales,
      subcontratos: datos.subcontratos,
      equipos: datos.equipos,
      servicios: datos.servicios,
      mod: datos.mod,
      honorarios: datos.honorarios,
      staff: datos.staff,
      generales: datos.generales,
    };
    return COMPOSICION.map((c) => ({
      nombre: c.etiqueta,
      color: c.color,
      valor: valores[c.clave],
      porcentaje: datos.costoReal > 0 ? (valores[c.clave] / datos.costoReal) * 100 : 0,
    })).filter((c) => c.valor > 0);
  }, [datos]);

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
    { etiqueta: "Presupuesto Ofertado", valor: datos.ofertado },
    { etiqueta: "Costo Directo (Partidas)", valor: datos.presupuesto },
    { etiqueta: "GG Presupuestados", valor: datos.ggPresupuestado },
    { etiqueta: "Utilidad Prevista", valor: datos.utilidadPrevista },
    { etiqueta: "Ventas Cobradas", valor: datos.cobrado },
    { etiqueta: "Costo Real Total", valor: datos.costoReal },
    { etiqueta: "Utilidad Real", valor: datos.margen },
  ];

  function excel() {
    exportarExcel(`reporte-${global ? "global" : "proyecto"}`, [
      {
        nombre: "KPIs",
        filas: [
          { Indicador: "Costo Directo - Partidas (S/)", Valor: datos.presupuesto },
          { Indicador: "Presupuesto Contractual (S/)", Valor: datos.contractual },
          { Indicador: "Presupuestos Adicionales (S/)", Valor: datos.adicionales },
          { Indicador: "Gastos Generales Presupuestados (S/)", Valor: datos.ggPresupuestado },
          { Indicador: "Utilidad Prevista (S/)", Valor: datos.utilidadPrevista },
          { Indicador: "Presupuesto Ofertado (S/)", Valor: datos.ofertado },
          { Indicador: "Ventas Cobradas (S/)", Valor: datos.cobrado },
          { Indicador: "Ventas por Cobrar (S/)", Valor: datos.pendiente },
          { Indicador: "Efectividad de Cobranza (%)", Valor: Number(datos.cobranzaPct.toFixed(1)) },
          { Indicador: "Materiales (S/)", Valor: datos.materiales },
          { Indicador: "Subcontratos (S/)", Valor: datos.subcontratos },
          { Indicador: "Equipos y Maquinaria (S/)", Valor: datos.equipos },
          { Indicador: "Servicios de Terceros (S/)", Valor: datos.servicios },
          { Indicador: "Mano de Obra Directa (S/)", Valor: datos.mod },
          { Indicador: "Honorarios de obra (S/)", Valor: datos.honorarios },
          { Indicador: "Staff Tecnico - Indirecto (S/)", Valor: datos.staff },
          { Indicador: "Gastos Generales Ejecutados (S/)", Valor: datos.generales },
          { Indicador: "Costo Directo Real (S/)", Valor: datos.costoDirectoReal },
          { Indicador: "Gastos Generales Reales + Staff (S/)", Valor: datos.ggReal },
          { Indicador: "Costo Real Total (S/)", Valor: datos.costoReal },
          { Indicador: "Utilidad Real (S/)", Valor: datos.margen },
          { Indicador: "Margen sobre Ventas (%)", Valor: Number(datos.margenPct.toFixed(1)) },
          { Indicador: "Retorno sobre Costo (%)", Valor: Number(datos.roiPct.toFixed(1)) },
          { Indicador: "Variacion vs Utilidad Prevista (S/)", Valor: datos.variacionUtilidad },
        ],
      },
      {
        nombre: "Por Proyecto",
        filas: filasTabla.map((f) => ({
          Obra: f.nombre,
          "Costo Directo (S/)": f.presupuesto,
          "Contractual (S/)": f.contractual,
          "Adicionales (S/)": f.adicionales,
          "% GG": f.pctGG,
          "GG Presupuestados (S/)": f.ggPresupuestado,
          "% Utilidad": f.pctUtilidad,
          "Utilidad Prevista (S/)": f.utilidadPrevista,
          "Presupuesto Ofertado (S/)": f.ofertado,
          "Ventas Cobradas (S/)": f.cobrado,
          "Ventas por Cobrar (S/)": f.pendiente,
          "Materiales (S/)": f.materiales,
          "Subcontratos (S/)": f.subcontratos,
          "Equipos (S/)": f.equipos,
          "Servicios (S/)": f.servicios,
          "Mano de Obra Directa (S/)": f.mod,
          "Honorarios (S/)": f.honorarios,
          "Staff Tecnico (S/)": f.staff,
          "Gastos Generales Ejecutados (S/)": f.generales,
          "Costo Real Total (S/)": f.costoReal,
          "Utilidad Real (S/)": f.margen,
          "Margen (%)": Number(f.margenPct.toFixed(1)),
          "Retorno s/ Costo (%)": Number(f.roiPct.toFixed(1)),
          "Variacion vs Prevista (S/)": f.variacionUtilidad,
          "Cobranza (%)": Number(f.cobranzaPct.toFixed(1)),
          Condicion: salud(f).texto,
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

  async function pdf() {
    const elemento = document.getElementById("reporte-financiero");
    if (!elemento || exportandoPdf) return;
    setExportandoPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 5,
          filename: `dashboard-financiero-${global ? "global" : nombreVista.replace(/[^\w-]+/g, "_")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        } as never)
        .from(elemento)
        .save();
    } finally {
      setExportandoPdf(false);
    }
  }

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
              <Upload size={13} /> Exportar a Excel
            </Boton>
            <Boton onClick={pdf} disabled={exportandoPdf}>
              {exportandoPdf ? "Generando..." : "Exportar a PDF"}
            </Boton>
          </>
        }
      />

      <div id="reporte-financiero">
        {/* Nivel 1: KPIs ejecutivos */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          etiqueta="Presupuesto Ofertado"
          valor={datos.ofertado}
          lineas={[
            `Contractual ${soles(datos.contractual)} · Adicionales ${soles(datos.adicionales)}`,
            `GG ${soles(datos.ggPresupuestado)} · Utilidad ${soles(datos.utilidadPrevista)}`,
          ]}
        />
        <Kpi
          etiqueta="Ventas y Cobranza"
          valor={datos.cobrado}
          lineas={[
            `Por cobrar ${soles(datos.pendiente)}`,
            `Efectividad de cobranza ${pct(datos.cobranzaPct)}`,
          ]}
        />
        <Kpi
          etiqueta="Costo Real Consolidado"
          valor={datos.costoReal}
          lineas={[
            `Directos ${soles(datos.materiales + datos.subcontratos + datos.equipos + datos.servicios)} · MOD ${soles(
              datos.mod,
            )}`,
            `Honorarios ${soles(datos.honorarios)}`,
            `GG + Staff ${soles(datos.ggReal)}`,
          ]}
        />
        <Kpi
          etiqueta="Utilidad Real"
          valor={datos.margen}
          tono={datos.margen < 0 ? "bad" : "good"}
          lineas={[
            `Prevista ${soles(datos.utilidadPrevista)} · Variación ${soles(datos.variacionUtilidad)}`,
            `Margen ${pct(datos.margenPct)} s/ ventas · ${pct(datos.roiPct)} s/ costo`,
          ]}
        />
      </div>

      {/* Nivel 2: composición y termómetros */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Panel titulo="Composición del costo real" className="flex h-full flex-col">
            {composicion.length === 0 ? (
              <Vacio texto="Aún no hay costos registrados." />
            ) : (
              <div className="flex flex-1 flex-col items-center gap-4 px-5 py-4 sm:flex-row sm:items-center">
                <div className="relative h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={composicion}
                        dataKey="valor"
                        nameKey="nombre"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {composicion.map((c) => (
                          <Cell key={c.nombre} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => soles(Number(v))}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="label-mono text-[10px]">Margen</span>
                    <span
                      className={`font-mono text-lg font-bold ${datos.margen < 0 ? "text-bad" : "text-good"}`}
                    >
                      {pct(datos.margenPct)}
                    </span>
                  </div>
                </div>
                <ul className="my-auto flex min-w-0 flex-1 flex-col justify-center space-y-2 self-stretch">
                  {composicion.map((c) => (
                    <li key={c.nombre} className="flex items-center gap-2 text-[12px] leading-tight">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: c.color }}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block break-words">{c.nombre}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {soles(c.valor)} · {pct(c.porcentaje)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>


        <div className="lg:col-span-3">
          <Panel titulo="Indicadores de control" className="h-full">
            <div className="space-y-4 px-5 py-4">
              <Termometro
                etiqueta="Consumo de presupuesto (costo directo)"
                actual={datos.costoDirectoReal}
                meta={datos.presupuesto}
                invertido
              />
              <Termometro
                etiqueta="Consumo de gastos generales"
                actual={datos.ggReal}
                meta={datos.ggPresupuestado}
                invertido
              />
              <Termometro etiqueta="Efectividad de cobranza" actual={datos.cobrado} meta={datos.facturado} />
            </div>
          </Panel>
        </div>
      </div>

      {/* Tabla por obra con semáforos */}
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
                    <th className="label-mono px-4 py-2 text-right">Costo directo</th>
                    <th className="label-mono px-4 py-2 text-right">GG previsto</th>
                    <th className="label-mono px-4 py-2 text-right">Utilidad prevista</th>
                    <th className="label-mono px-4 py-2 text-right">Ofertado</th>
                    <th className="label-mono px-4 py-2 text-right">Cobrado</th>
                    <th className="label-mono px-4 py-2 text-right">Por cobrar</th>
                    <th className="label-mono px-4 py-2 text-right">Costo real</th>
                    <th className="label-mono px-4 py-2 text-right">Utilidad real</th>
                    <th className="label-mono px-4 py-2 text-right">Margen</th>
                    <th className="label-mono px-4 py-2">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filasTabla.map((f) => {
                    const s = salud(f);
                    return (
                      <tr key={f.id}>
                        <td className="px-4 py-2 font-medium">{f.nombre}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {soles(f.presupuesto)}
                          {f.adicionales !== 0 && (
                            <span className="block text-[11px] text-muted-foreground">
                              contr. {soles(f.contractual)} · adic. {soles(f.adicionales)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {soles(f.ggPresupuestado)}
                          <span className="ml-1 text-[11px] text-muted-foreground">({f.pctGG}%)</span>
                          <span className="block text-[11px] text-muted-foreground">
                            real {soles(f.ggReal)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {soles(f.utilidadPrevista)}
                          <span className="ml-1 text-[11px] text-muted-foreground">({f.pctUtilidad}%)</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{soles(f.ofertado)}</td>
                        <td className="px-4 py-2 text-right font-mono">{soles(f.cobrado)}</td>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                          {soles(f.pendiente)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-mono ${
                            f.costoDirectoReal > f.presupuesto && f.presupuesto > 0 ? "text-bad" : ""
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
                        <td className="px-4 py-2 text-right font-mono">
                          {pct(f.margenPct)}
                          <span className="block text-[11px] text-muted-foreground">{pct(f.roiPct)} s/ costo</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-2 text-[12px]">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                            {s.texto}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
                        <Barra etiqueta="Presupuesto Gastado" valor={b.gastado} clase={sobre ? "bg-bad" : "bg-good"} />
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
      </div>
    </>
  );
}

/** Semáforo de salud financiera de una obra. */
function salud(f: { margen: number; margenPct: number; cobranzaPct: number; costoDirectoReal: number; presupuesto: number }) {
  if (f.margen < 0 || (f.presupuesto > 0 && f.costoDirectoReal > f.presupuesto))
    return { color: "#DC2626", texto: "Déficit / Sobrecosto" };
  if (f.cobranzaPct < 70 || f.margenPct < 15) return { color: "#F59E0B", texto: "Alerta" };
  return { color: "#10B981", texto: "Saludable" };
}

function Kpi({
  etiqueta,
  valor,
  lineas,
  tono,
}: {
  etiqueta: string;
  valor: number;
  lineas: string[];
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
        {soles(valor)}
      </p>
      <div className="mt-1 space-y-0.5">
        {lineas.map((l) => (
          <p key={l} className="font-mono text-[11px] text-muted-foreground">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

function Termometro({
  etiqueta,
  actual,
  meta,
  invertido,
}: {
  etiqueta: string;
  actual: number;
  meta: number;
  invertido?: boolean;
}) {
  const porcentaje = meta > 0 ? (actual / meta) * 100 : 0;
  const color = invertido
    ? porcentaje > 100
      ? "#DC2626"
      : porcentaje > 85
        ? "#F59E0B"
        : "#10B981"
    : porcentaje >= 70
      ? "#10B981"
      : porcentaje >= 40
        ? "#F59E0B"
        : "#DC2626";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-mono">{etiqueta}</span>
        <span className="font-mono text-sm font-semibold" style={{ color }}>
          {pct(porcentaje)}
        </span>
      </div>
      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="growx h-full rounded-full"
          style={{ width: `${Math.min(porcentaje, 100)}%`, background: color }}
        />
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {soles(actual)} de {soles(meta)}
      </p>
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

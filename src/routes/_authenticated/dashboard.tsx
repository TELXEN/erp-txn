import { createFileRoute, Link } from "@tanstack/react-router";
import { estadoEmo, ultimoEmoPorTrabajador, useEmos } from "@/lib/emo";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, HandCoins, Receipt, TrendingUp, Upload } from "lucide-react";
import { Anillo, DonaLeyenda, FajoBilletes, FilaSemaforo, TarjetaKpi } from "@/components/dashboard/piezas";
import { Encabezado } from "@/components/AppShell";
import { Boton, Pestanas, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { MESES, pct, soles, solesPunto } from "@/lib/format";
import { SIN_ASIGNAR } from "@/lib/pagos-rrhh";
import { useCostoObras } from "@/lib/costo-obra";
import { GananciaPerdida } from "@/components/dashboard/GananciaPerdida";
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
  leerTodo,
} from "@/lib/datos";
import { exportarExcel, exportarPdf } from "@/lib/exportar";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";

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
const COLORES_GG = ["var(--chip-1)", "var(--chip-mat)", "var(--chip-margenes)", "var(--chip-eq)", "var(--chip-4)", "var(--chip-codificacion)", "var(--chip-3)", "var(--chip-2)"];

function Dashboard() {
  const [pestana, setPestana] = useState<"resumen" | "gp">("resumen");
  const { rol } = useAuth();
  const { data: emosDash = [] } = useEmos(puedeVerDinero(rol));
  const emoAlerta = (() => { let v = 0, p = 0; ultimoEmoPorTrabajador(emosDash).forEach((e) => { const s = estadoEmo(e.fecha_vencimiento); if (s === "vencido") v++; else if (s === "por_vencer") p++; }); return { v, p }; })();
  const { fuente } = useFuenteDocumento();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: tareos = [] } = useTareos();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: ventas = [] } = useVentas();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: cargos = [] } = useCargos();
  const [seleccion, setSeleccion] = useState("global");
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [detalle, setDetalle] = useState<"obras" | "indicadores" | "partidas">("obras");

  const global = seleccion === "global";
  const nombreVista = global ? "Consolidado Global" : (proyectos.find((p) => p.id === seleccion)?.nombre ?? "");

  /** Costo real único por obra (mismo origen que los demás paneles). */
  const { costoDe, personal } = useCostoObras();

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

        const { materiales, subcontratos, equipos, servicios, mod, staff, honorarios, generales } = costoDe(p.id);

        const resumen = resumenPresupuesto(
          partidas.filter((x) => x.proyecto_id === p.id),
          tiposPresupuesto,
        );

        const { costoDirectoReal, ggReal, costoReal } = costoDe(p.id);
        // Utilidad real = prevista + saldo sin ejecutar de CD y GG (ahorros suman, excesos restan).
        const cdPrevisto = oferta.costoDirecto;
        const desvCD = Math.max(0, costoDirectoReal - cdPrevisto);
        const desvGG = Math.max(0, ggReal - oferta.gastosGenerales);
        const margen = oferta.utilidad + (cdPrevisto - costoDirectoReal) + (oferta.gastosGenerales - ggReal);
        const saldoOperativo = cdPrevisto - costoDirectoReal + (oferta.gastosGenerales - ggReal);
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
          cdPrevisto,
          desvCD,
          desvGG,
          saldoOperativo,
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
          margenPct: oferta.ofertado > 0 ? (margen / oferta.ofertado) * 100 : 0,
          roiPct: costoReal > 0 ? (margen / costoReal) * 100 : 0,
          variacionUtilidad: margen - oferta.utilidad,
          cobranzaPct: facturado > 0 ? (cobrado / facturado) * 100 : 0,
          avanceFacturado: presupuesto > 0 ? (cobrado / presupuesto) * 100 : 0,
        };
      }),
    [proyectos, partidas, ventas, gastosD, gastosG, tiposPresupuesto, personal],
  );

  const filasTabla = useMemo(
    () => (global ? porProyecto : porProyecto.filter((f) => f.id === seleccion)),
    [global, seleccion, porProyecto],
  );

  const avisoPendientes = useMemo(
    () =>
      [...personal.pendientes.entries()]
        .sort()
        .map(([per, set]) => {
          const [a, m] = per.split("-");
          return `⚠ ${set.size} trabajador(es) sin boleta en ${MESES[Number(m) - 1]} ${a}: costo estimado con el tareo hasta emitirla`;
        }),
    [personal],
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
    const sa = global ? (personal.porProyecto.get(SIN_ASIGNAR) ?? { mod: 0, honorarios: 0, staff: 0 }) : { mod: 0, honorarios: 0, staff: 0 };
    const mod = sum((f) => f.mod) + sa.mod;
    const staff = sum((f) => f.staff) + sa.staff;
    const generales = sum((f) => f.generales);
    const honorarios = sum((f) => f.honorarios) + sa.honorarios;
    const contractual = sum((f) => f.contractual);
    const adicionales = sum((f) => f.adicionales);
    const costoDirectoReal = materiales + subcontratos + equipos + servicios + mod + honorarios;
    const ggReal = generales + staff;
    const costoReal = costoDirectoReal + ggReal;
    const facturado = cobrado + pendiente;
    const cdPrevisto = sum((f) => f.cdPrevisto);
    // Utilidad de cartera = suma de la utilidad real de cada obra, menos los costos sin asignar.
    const desvCD = sum((f) => f.desvCD) + sa.mod + sa.honorarios;
    const desvGG = sum((f) => f.desvGG) + sa.staff;
    const margen = sum((f) => f.margen) - sa.mod - sa.honorarios - sa.staff;
    const saldoOperativo = cdPrevisto - costoDirectoReal + (ggPresupuestado - ggReal);
    return {
      cdPrevisto,
      desvCD,
      desvGG,
      saldoOperativo,
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
      margenPct: ofertado > 0 ? (margen / ofertado) * 100 : 0,
      roiPct: costoReal > 0 ? (margen / costoReal) * 100 : 0,
      margenSobreOferta: ofertado > 0 ? (margen / ofertado) * 100 : 0,
      variacionUtilidad: margen - utilidadPrevista,
      cobranzaPct: facturado > 0 ? (cobrado / facturado) * 100 : 0,
      consumoPresupuesto: ofertado > 0 ? (costoReal / ofertado) * 100 : 0,
      consumoGG: ggPresupuestado > 0 ? (ggReal / ggPresupuestado) * 100 : 0,
    };
  }, [filasTabla, global, personal]);

  // Micro-indicadores de la tarjeta "Saldo Disponible por Ejecutar".
  const saldoCD = datos.cdPrevisto - datos.costoDirectoReal;
  const saldoGG = datos.ggPresupuestado - datos.ggReal;
  const consumoCD = datos.cdPrevisto > 0 ? (datos.costoDirectoReal / datos.cdPrevisto) * 100 : 0;
  const consumoGG = datos.ggPresupuestado > 0 ? (datos.ggReal / datos.ggPresupuestado) * 100 : 0;
  const desvGGTotal = datos.desvGG;

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

  const categoriasGG = useMemo(() => {
    const ids = new Set(filasTabla.map((f) => f.id));
    const totales = new Map<string, number>();
    gastosG.forEach((g) => {
      if (!g.proyecto_id || !ids.has(g.proyecto_id)) return;
      const nombre = g.categoria?.trim() || "Sin categoría";
      totales.set(nombre, (totales.get(nombre) ?? 0) + Number(g.monto_soles));
    });
    if (datos.staff > 0) {
      totales.set("Staff técnico / personal indirecto", (totales.get("Staff técnico / personal indirecto") ?? 0) + datos.staff);
    }
    const total = [...totales.values()].reduce((s, v) => s + v, 0);
    return [...totales.keys()].sort((a, b) => a.localeCompare(b, "es")).map((nombre, i) => ({
      nombre,
      valor: totales.get(nombre) ?? 0,
      color: COLORES_GG[i % COLORES_GG.length],
      porcentaje: total > 0 ? ((totales.get(nombre) ?? 0) / total) * 100 : 0,
    })).filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor);
  }, [gastosG, filasTabla, datos.staff]);

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
      // Ajuste solo durante la captura: la tabla amplia se adapta al ancho A4
      // con tipografía compacta para que nada se recorte ni parta. El diseño
      // en pantalla no cambia.
      const estiloCaptura = document.createElement("style");
      estiloCaptura.textContent =
        `#reporte-financiero{font-family:${fuente.css}!important}` +
        "#reporte-financiero .overflow-x-auto{overflow:visible!important}" +
        "#reporte-financiero table{width:100%!important;table-layout:fixed!important}" +
        "#reporte-financiero th,#reporte-financiero td{font-size:8px!important;padding:3px 4px!important;letter-spacing:normal!important}" +
        "#reporte-financiero th span,#reporte-financiero td span{white-space:nowrap!important;word-break:keep-all!important}";
      document.head.appendChild(estiloCaptura);
      // `pagebreak` existe en html2pdf.js pero no en los tipos antiguos del paquete.
      const opciones = {
        margin: 5,
        filename: `dashboard-financiero-${global ? "global" : nombreVista.replace(/[^\w-]+/g, "_")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      } as never;
      await html2pdf()
        .set(opciones)
        .from(elemento)
        .save();
      estiloCaptura.remove();
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
            {pestana === "resumen" && <div className="w-60">
              <Select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
                <option value="global">Consolidado Global</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </div>}
            <Boton variante="linea" onClick={excel}>
              <Upload size={13} /> Exportar a Excel
            </Boton>
            <Boton onClick={pdf} disabled={exportandoPdf}>
              {exportandoPdf ? "Generando..." : "Exportar a PDF"}
            </Boton>
          </>
        }
      />

      {(emoAlerta.v > 0 || emoAlerta.p > 0) && (
        <Link to="/personal" className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold ${emoAlerta.v > 0 ? "border-bad/40 bg-bad/10 text-bad" : "border-warn/40 bg-warn/10 text-warn"}`}>
          EMO: {emoAlerta.v > 0 && `${emoAlerta.v} vencido(s)`}{emoAlerta.v > 0 && emoAlerta.p > 0 && " · "}{emoAlerta.p > 0 && `${emoAlerta.p} por vencer en 30 días`} — ver en Gestión de Personal
        </Link>
      )}
      <div id="reporte-financiero" className="tablero-financiero">
        <div className="mb-4 flex gap-1 border-b border-line">
          {([["resumen", "Resumen"], ["gp", "Ganancia / Pérdida"]] as const).map(([k, t]) => (
            <button key={k} onClick={() => setPestana(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${pestana === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-line hover:text-ink"}`}>{t}</button>
          ))}
        </div>
        {pestana === "gp" ? (
          <>
            <GananciaPerdida />
          </>
        ) : (
        <>
        {/* Nivel 1: KPIs ejecutivos */}
        <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaKpi
            icono={<FajoBilletes size={18} />}
            tono="primary"
            etiqueta="Presupuesto ofertado"
            valor={soles(datos.ofertado)}
            lineas={[
              `Contractual ${soles(datos.contractual)} · Adicionales ${soles(datos.adicionales)}`,
              `GG ${soles(datos.ggPresupuestado)} · Utilidad ${soles(datos.utilidadPrevista)}`,
            ]}
          />
          <TarjetaKpi
            icono={<HandCoins size={16} />}
            tono={datos.facturado > 0 && datos.cobranzaPct < 70 ? "warn" : "good"}
            etiqueta="Ventas y cobranza"
            valor={soles(datos.cobrado)}
            lineas={[`Por cobrar ${soles(datos.pendiente)}`, `Efectividad de cobranza ${pct(datos.cobranzaPct)}`]}
          />
          <TarjetaKpi
            icono={<Receipt size={16} />}
            tono="warn"
            etiqueta="Costo real consolidado"
            valor={soles(datos.costoReal)}
            lineas={[
              `Directos ${soles(datos.materiales + datos.subcontratos + datos.equipos + datos.servicios)} · MOD ${soles(datos.mod)}`,
              `Honorarios ${soles(datos.honorarios)} · GG + Staff ${soles(datos.ggReal)}`,
              ...avisoPendientes,
            ]}
          />
          <TarjetaKpi
            icono={<TrendingUp size={16} />}
            tono={datos.margen < datos.utilidadPrevista - 0.005 ? "bad" : "good"}
            etiqueta="Utilidad real"
            valor={soles(datos.margen)}
            claseValor={datos.margen < datos.utilidadPrevista - 0.005 ? "text-bad" : "text-good"}
            insignia={datos.margen <= 0 && datos.utilidadPrevista > 0 ? <span className="rounded-full bg-bad/10 px-2 py-0.5 text-[10px] font-semibold text-bad">Crítico</span> : undefined}
            lineas={[
              `Prevista ${soles(datos.utilidadPrevista)} − Desv. CD ${soles(datos.desvCD)} − Desv. GG ${soles(datos.desvGG)}`,
              datos.margen <= 0 ? "⚠ Alerta crítica: utilidad agotada" : `Margen ${pct(datos.margenPct)} s/ ofertado`,
            ]}
          />
        </div>

        {/* Nivel 2: saldo y composición */}
        <div className="mb-3 grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="dash-tarjeta flex min-w-0 flex-col px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="dash-icono dash-icono-sm dash-icono-suave" data-tono="good"><FajoBilletes size={18} /></span>
              <p className="flex-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Saldo disponible por ejecutar</p>
              {(saldoCD < 0 || saldoGG < 0) && <span className="inline-flex items-center gap-1 rounded-full bg-bad/10 px-2 py-0.5 text-[10px] font-semibold text-bad"><AlertTriangle size={11} /> Sobregirado</span>}
            </div>
            <div className="mt-1 flex min-h-0 flex-1 items-center gap-3">
              <Anillo clase="h-28 w-28" valor={datos.cdPrevisto + datos.ggPresupuestado > 0 ? ((datos.costoDirectoReal + datos.ggReal) / (datos.cdPrevisto + datos.ggPresupuestado)) * 100 : 0} alerta={saldoCD < 0 || saldoGG < 0} rotulo="consumido" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">Saldo operativo</p>
                <p className={`font-mono text-xl font-semibold tabular-nums ${datos.saldoOperativo < 0 ? "text-bad" : "text-ink"}`}>{solesPunto(datos.saldoOperativo)}</p>
                <p className="text-[10px] text-muted-foreground">Cada presupuesto se controla por separado</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-2 gap-y-1">
              <span />
              <span className="pl-2 text-right text-[9px] uppercase tracking-wide text-muted-foreground">Real</span>
              <span className="pl-2 text-right text-[9px] uppercase tracking-wide text-muted-foreground">Presupuestado</span>
              <span className="pl-2 text-right text-[9px] uppercase tracking-wide text-muted-foreground">% usado</span>
              <FilaSemaforo etiqueta="Costo directo" real={datos.costoDirectoReal} base={datos.cdPrevisto} />
              <FilaSemaforo etiqueta="Gastos generales" real={datos.ggReal} base={datos.ggPresupuestado} />
            </div>
            <p className="mt-auto pt-2 text-[10px] leading-snug text-muted-foreground">
              {desvGGTotal > 0
                ? `El sobregiro de GG (${soles(desvGGTotal)}) ya se descuenta de la Utilidad Real.`
                : "Sin sobregiro de GG; la utilidad real mantiene su valor previsto."}
            </p>
          </div>
          <div className="dash-tarjeta flex min-w-0 flex-col px-3 py-2.5">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Composición del costo real</p>
            <DonaLeyenda datos={composicion} centro="Costo total" vacio="Aún no hay costos registrados." />
          </div>
          <div className="dash-tarjeta flex min-w-0 flex-col px-3 py-2.5">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gastos generales por categoría</p>
            <DonaLeyenda datos={categoriasGG} centro="Gastos generales" vacio="Sin gastos generales registrados." />
          </div>
        </div>

        {/* Nivel 3: detalle en pestañas */}
        <div className="dash-tarjeta min-w-0 px-3 py-2">
          <Pestanas
            etiqueta="Detalle financiero"
            opciones={[
              { id: "obras", texto: "Resumen por obra" },
              { id: "indicadores", texto: "Indicadores de control" },
              { id: "partidas", texto: "Rendimiento por partida" },
            ]}
            valor={detalle}
            onCambiar={setDetalle}
          />
          <div className="mt-2 max-h-[17rem] overflow-y-auto">
          {detalle === "indicadores" ? (
            <div className="grid gap-4 px-2 py-2 md:grid-cols-3">
              <Termometro etiqueta="Consumo del presupuesto ofertado" actual={datos.costoReal} meta={datos.ofertado} invertido />
              <Termometro etiqueta="Consumo de gastos generales" actual={datos.ggReal} meta={datos.ggPresupuestado} invertido />
              <Termometro etiqueta="Efectividad de cobranza" actual={datos.cobrado} meta={datos.facturado} />
            </div>
          ) : detalle === "obras" ? (
          filasTabla.length === 0 ? (
            <Vacio texto="No hay obras registradas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-(--line-60) text-left">
                    <th className="label-mono px-2 py-1.5">Obra</th>
                    <th className="label-mono px-2 py-1.5 text-right">Ofertado total</th>
                    <th className="label-mono px-2 py-1.5 text-right">C. directo previsto</th>
                    <th className="label-mono px-2 py-1.5 text-right">GG previsto</th>
                    <th className="label-mono px-2 py-1.5 text-right">Utilidad prevista</th>
                    <th className="label-mono px-2 py-1.5 text-right">C. directo real</th>
                    <th className="label-mono px-2 py-1.5 text-right">GG real</th>
                    <th className="label-mono px-2 py-1.5 text-right">Utilidad real</th>
                    <th className="label-mono px-2 py-1.5">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--line-60)">
                  {filasTabla.map((f) => {
                    const s = salud(f);
                    return (
                      <tr key={f.id}>
                        <td className="px-2 py-1.5 font-medium whitespace-nowrap">{f.nombre}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap">
                          {monto(f.ofertado)}
                          {f.adicionales !== 0 && <span className="block text-[10px] font-normal text-muted-foreground">incl. adic. {monto(f.adicionales)}</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">{monto(f.cdPrevisto)}</td>
                        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
                          {monto(f.ggPresupuestado)}<span className="ml-1 text-[10px] text-muted-foreground">({f.pctGG}%)</span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
                          {monto(f.utilidadPrevista)}<span className="ml-1 text-[10px] text-muted-foreground">({f.pctUtilidad}%)</span>
                        </td>
                        <td className={`px-2 py-1.5 text-right font-mono whitespace-nowrap ${f.desvCD > 0 ? "text-bad" : ""}`}>{monto(f.costoDirectoReal)}</td>
                        <td className={`px-2 py-1.5 text-right font-mono whitespace-nowrap ${f.desvGG > 0 ? "text-bad" : ""}`}>{monto(f.ggReal)}</td>
                        <td className={`px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap ${f.margen < f.utilidadPrevista - 0.005 ? "text-bad" : "text-good"}`}>{monto(f.margen)}</td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px]">
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
          )
          ) : global ? (
            <Vacio texto="Selecciona un proyecto específico para ver el rendimiento por partida." />
          ) : barras.length === 0 ? (
            <Vacio texto="Este proyecto aún no tiene partidas registradas." />
          ) : (
            <ul className="divide-y divide-(--line-60)">
              {barras.map((b) => {
                const sobre = b.gastado > b.avance;
                return (
                  <li key={b.partida} className="flex flex-wrap items-center gap-4 px-2 py-2">
                    <div className="min-w-64 flex-1">
                      <p className="text-xs font-semibold">{b.partida}</p>
                      <div className="mt-1 space-y-1">
                        <Barra etiqueta="Avance Físico" valor={b.avance} clase="bg-primary" />
                        <Barra etiqueta="Presupuesto Gastado" valor={b.gastado} clase={sobre ? "bg-bad" : "bg-good"} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="label-mono">Diferencia</p>
                      <p className={`font-mono text-sm font-semibold ${b.diferencia < 0 ? "text-bad" : "text-good"}`}>{soles(b.diferencia)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        </div>
        </>
        )}
      </div>
    </>
  );
}

/** Importe sin símbolo: el encabezado del panel ya indica que todo está en soles. */
const monto = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Semáforo de salud financiera de una obra. */
function salud(f: {
  margen: number;
  utilidadPrevista: number;
  margenPct: number;
  cobranzaPct: number;
  facturado: number;
  costoReal: number;
  ofertado: number;
}) {
  if (f.margen <= 0 && f.utilidadPrevista > 0) return { color: "#DC2626", texto: "Crítico · utilidad agotada" };
  if (f.margen < f.utilidadPrevista - 0.005) return { color: "#DC2626", texto: "Alerta crítica · pérdida de margen" };
  // La cobranza solo alarma cuando ya hay facturado sin cobrar; una obra que aún no factura no está en riesgo.
  const cobranzaEnRiesgo = f.facturado > 0 && f.cobranzaPct < 70;
  if (cobranzaEnRiesgo) return { color: "#F59E0B", texto: "Alerta" };
  return { color: "#10B981", texto: "Saludable" };
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
      ? "var(--bad)"
      : porcentaje > 85
        ? "var(--warn)"
        : "var(--good)"
    : porcentaje >= 70
      ? "var(--good)"
      : porcentaje >= 40
        ? "var(--warn)"
        : "var(--bad)";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-mono min-w-0">{etiqueta}</span>
        <span className="shrink-0 font-mono text-sm font-semibold" style={{ color }}>
          {pct(porcentaje)}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full max-w-80 overflow-hidden rounded-full bg-muted">
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

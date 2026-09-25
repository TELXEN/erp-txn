import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, Select, SinAcceso } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { MESES, pct, soles } from "@/lib/format";
import { useCajasChicas, useGastosDirectos, useGastosGenerales, useVentas } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

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

  const { data: ventas = [] } = useVentas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: cajas = [] } = useCajasChicas();

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
    const base = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      etiqueta: MESES_CORTOS[i] ?? MESES[i] ?? String(i + 1),
      metaIngreso: 0,
      metaCosto: 0,
      ingresoReal: 0,
      costoReal: 0,
    }));

    metas.forEach((m) => {
      const f = base[m.mes - 1];
      if (!f) return;
      f.metaIngreso = Number(m.meta_ingreso) || 0;
      f.metaCosto = Number(m.meta_costo) || 0;
    });

    ventas.forEach((v) => {
      const mes = mesDe(v.fecha_pago, anio);
      if (mes) base[mes - 1]!.ingresoReal += Number(v.monto_soles) || 0;
    });

    const cobrarEgreso = (fecha: string | null | undefined, monto: unknown) => {
      const mes = mesDe(fecha, anio);
      if (mes) base[mes - 1]!.costoReal += Number(monto) || 0;
    };

    gastosD.forEach((g) => {
      const r = g as unknown as { fecha_pago?: string | null; monto_soles: number; caja_chica_id: string | null };
      if (r.caja_chica_id) return; // ya salió del banco al entregar la Caja Chica
      cobrarEgreso(r.fecha_pago, r.monto_soles);
    });
    gastosG.forEach((g) => {
      const r = g as unknown as { fecha_pago?: string | null; monto_soles: number; caja_chica_id: string | null };
      if (r.caja_chica_id) return;
      cobrarEgreso(r.fecha_pago, r.monto_soles);
    });
    cajas.forEach((c) => cobrarEgreso(c.fecha_entrega, c.monto_entregado));

    let acumulado = 0;
    return base.map((f) => {
      const resultadoObjetivo = f.metaIngreso - f.metaCosto;
      const resultadoReal = f.ingresoReal - f.costoReal;
      acumulado += resultadoReal;
      return {
        ...f,
        resultadoObjetivo,
        resultadoReal,
        desvioIngreso: f.ingresoReal - f.metaIngreso,
        desvioCosto: f.metaCosto - f.costoReal,
        variacion: resultadoReal - resultadoObjetivo,
        cumplimiento: resultadoObjetivo !== 0 ? (resultadoReal / resultadoObjetivo) * 100 : 0,
        acumulado,
      };
    });
  }, [metas, ventas, gastosD, gastosG, cajas, anio]);

  const total = useMemo(
    () =>
      filas.reduce(
        (a, f) => ({
          metaIngreso: a.metaIngreso + f.metaIngreso,
          metaCosto: a.metaCosto + f.metaCosto,
          ingresoReal: a.ingresoReal + f.ingresoReal,
          costoReal: a.costoReal + f.costoReal,
        }),
        { metaIngreso: 0, metaCosto: 0, ingresoReal: 0, costoReal: 0 },
      ),
    [filas],
  );

  const resultadoObjetivoAnual = total.metaIngreso - total.metaCosto;
  const resultadoRealAnual = total.ingresoReal - total.costoReal;

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    return [actual - 2, actual - 1, actual, actual + 1];
  }, []);

  function exportar() {
    exportarExcel(`Flujo_de_Caja_${anio}`, [
      {
        nombre: "Flujo de Caja",
        filas: filas.map((f) => ({
          Mes: f.etiqueta,
          "Meta de ingreso": f.metaIngreso,
          "Ingreso realizado": f.ingresoReal,
          "Desvío ingreso": f.desvioIngreso,
          "Meta de costo": f.metaCosto,
          "Costo realizado": f.costoReal,
          "Desvío costo": f.desvioCosto,
          "Resultado objetivo": f.resultadoObjetivo,
          "Resultado realizado": f.resultadoReal,
          "Cumplimiento %": Number(f.cumplimiento.toFixed(1)),
          "Flujo acumulado": f.acumulado,
        })),
      },
    ]);
  }

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const kpis = [
    { etiqueta: "Meta de ingreso", valor: total.metaIngreso, extra: "" },
    {
      etiqueta: "Ingreso realizado",
      valor: total.ingresoReal,
      extra: total.metaIngreso ? pct((total.ingresoReal / total.metaIngreso) * 100) : "",
    },
    { etiqueta: "Meta de costo", valor: total.metaCosto, extra: "" },
    {
      etiqueta: "Costo realizado",
      valor: total.costoReal,
      extra: total.metaCosto ? pct((total.costoReal / total.metaCosto) * 100) : "",
    },
    { etiqueta: "Resultado objetivo", valor: resultadoObjetivoAnual, extra: "" },
    {
      etiqueta: "Resultado realizado",
      valor: resultadoRealAnual,
      extra: resultadoObjetivoAnual ? pct((resultadoRealAnual / resultadoObjetivoAnual) * 100) : "",
    },
  ];

  return (
    <>
      <Encabezado
        titulo="Flujo de Caja"
        subtitulo="Finanzas y Contabilidad · Consolidado global en Soles"
        acciones={
          <div className="flex items-center gap-2">
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

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.etiqueta} className="panel rise px-4 py-3">
            <p className="label-mono">{k.etiqueta}</p>
            <p className={`mt-1 text-xl font-semibold ${k.valor < 0 ? "text-bad" : ""}`}>{soles(k.valor)}</p>
            {k.extra && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{k.extra} del objetivo</p>}
          </div>
        ))}
      </div>

      <Panel titulo={`Comparativo mensual ${anio}`} className="mb-5">
        <div className="h-80 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filas}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v: number) => soles(v)} />
              <Tooltip formatter={(v) => soles(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="metaIngreso" name="Meta de ingreso" fill="#93C5FD" />
              <Bar dataKey="ingresoReal" name="Ingreso realizado" fill="#2563EB" />
              <Bar dataKey="metaCosto" name="Meta de costo" fill="#FCD34D" />
              <Bar dataKey="costoReal" name="Costo realizado" fill="#EA580C" />
              <Line dataKey="resultadoObjetivo" name="Resultado objetivo" stroke="#64748B" strokeWidth={2} dot={false} />
              <Line dataKey="resultadoReal" name="Resultado realizado" stroke="#10B981" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel titulo="Matriz anual" extra={<span className="label-mono">Las metas se editan directamente en la tabla</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-2 font-mono text-[11px] uppercase tracking-wide">Mes</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Meta ingreso</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Ingreso real</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Meta costo</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Costo real</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Result. objetivo</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Result. realizado</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Cumpl.</th>
                <th className="px-3 py-2 text-right font-mono text-[11px] uppercase">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const tono =
                  f.resultadoReal >= f.resultadoObjetivo
                    ? "text-good"
                    : f.resultadoReal >= f.resultadoObjetivo * 0.9
                      ? "text-warn"
                      : "text-bad";
                return (
                  <tr key={f.mes} className="border-b border-line/60">
                    <td className="px-4 py-1.5 font-medium">{f.etiqueta}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-32 text-right"
                        defaultValue={f.metaIngreso}
                        key={`i-${anio}-${f.mes}-${f.metaIngreso}`}
                        onBlur={(e) => {
                          const valor = Number(e.target.value) || 0;
                          if (valor !== f.metaIngreso)
                            guardar.mutate({ mes: f.mes, meta_ingreso: valor, meta_costo: f.metaCosto });
                        }}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{soles(f.ingresoReal)}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-32 text-right"
                        defaultValue={f.metaCosto}
                        key={`c-${anio}-${f.mes}-${f.metaCosto}`}
                        onBlur={(e) => {
                          const valor = Number(e.target.value) || 0;
                          if (valor !== f.metaCosto)
                            guardar.mutate({ mes: f.mes, meta_ingreso: f.metaIngreso, meta_costo: valor });
                        }}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{soles(f.costoReal)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{soles(f.resultadoObjetivo)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${tono}`}>
                      {soles(f.resultadoReal)}
                    </td>
                    <td className={`px-3 py-1.5 text-right font-mono ${tono}`}>
                      {f.resultadoObjetivo ? pct(f.cumplimiento) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{soles(f.acumulado)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="px-4 py-2">Total {anio}</td>
                <td className="px-3 py-2 text-right font-mono">{soles(total.metaIngreso)}</td>
                <td className="px-3 py-2 text-right font-mono">{soles(total.ingresoReal)}</td>
                <td className="px-3 py-2 text-right font-mono">{soles(total.metaCosto)}</td>
                <td className="px-3 py-2 text-right font-mono">{soles(total.costoReal)}</td>
                <td className="px-3 py-2 text-right font-mono">{soles(resultadoObjetivoAnual)}</td>
                <td className="px-3 py-2 text-right font-mono">{soles(resultadoRealAnual)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {resultadoObjetivoAnual ? pct((resultadoRealAnual / resultadoObjetivoAnual) * 100) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono">{soles(resultadoRealAnual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        El ingreso realizado suma las facturas cobradas en el mes. El costo realizado suma las compras y gastos pagados
        más las entregas de Caja Chica; los gastos rendidos con Caja Chica no se vuelven a contar.
      </p>
    </>
  );
}

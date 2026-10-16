import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  Bar,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGastosDirectos, useGastosGenerales, useVentas } from "@/lib/datos";
import { useTareoVehiculos } from "@/lib/vehiculos";
import { useBoletasCosto, useRecibosCosto } from "@/lib/costo-obra";
import { soles } from "@/lib/format";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const corto = (v: number) => `S/ ${Math.round(v).toLocaleString("es-PE")}`;

/** Ingresos (ventas por fecha de emisión) vs gastos reales por mes, consolidado. */
export function GananciaPerdida() {
  const { data: ventas = [] } = useVentas();
  const { data: gd = [] } = useGastosDirectos();
  const { data: gg = [] } = useGastosGenerales();
  const { data: tv = [] } = useTareoVehiculos();
  const { data: boletas = [] } = useBoletasCosto();
  const { data: recibos = [] } = useRecibosCosto();

  const porAnio = useMemo(() => {
    const m = new Map<number, { ing: number[]; gas: number[] }>();
    const get = (a: number) => {
      let r = m.get(a);
      if (!r) { r = { ing: Array(12).fill(0), gas: Array(12).fill(0) }; m.set(a, r); }
      return r;
    };
    const sumar = (a: number, mes: number, v: number, tipo: "ing" | "gas") => {
      if (a && mes >= 0 && mes < 12) { const arr = get(a)[tipo]; arr[mes] = (arr[mes] ?? 0) + v; }
    };
    const porFecha = (f: string | null | undefined, v: number, tipo: "ing" | "gas") => {
      if (!f) return;
      const a = Number(f.slice(0, 4)), mes = Number(f.slice(5, 7)) - 1;
      sumar(a, mes, v, tipo);
    };
    ventas.forEach((v) => {
      const x = v as typeof v & { fecha_emision?: string | null; created_at?: string };
      porFecha(x.fecha_emision ?? x.created_at, Number(v.monto_soles), "ing");
    });
    gd.forEach((g) => porFecha(g.fecha, Number(g.monto_soles), "gas"));
    gg.forEach((g) => porFecha(g.fecha, Number(g.monto_soles), "gas"));
    tv.forEach((t: { fecha: string; costo_soles: number }) => porFecha(t.fecha, Number(t.costo_soles), "gas"));
    boletas.forEach((b) => { if (b.planillas) sumar(b.planillas.anio, b.planillas.mes - 1, Number(b.total_ingresos) + Number(b.essalud), "gas"); });
    recibos.forEach((r) => { if (r.anio && r.mes) sumar(r.anio, r.mes - 1, Number(r.monto_bruto), "gas"); });
    return m;
  }, [ventas, gd, gg, tv, boletas, recibos]);

  const anioActual = new Date().getFullYear();
  const anios = useMemo(() => {
    const s = new Set([...porAnio.keys(), anioActual]);
    return [...s].sort((a, b) => b - a);
  }, [porAnio, anioActual]);
  const [anio, setAnio] = useState(anioActual);

  const datos = useMemo(() => {
    const r = porAnio.get(anio) ?? { ing: Array(12).fill(0), gas: Array(12).fill(0) };
    return MESES.map((mes, i) => ({ mes, ingresos: r.ing[i] ?? 0, gastos: r.gas[i] ?? 0, neto: (r.ing[i] ?? 0) - (r.gas[i] ?? 0) }));
  }, [porAnio, anio]);

  const ingTotal = datos.reduce((s, d) => s + d.ingresos, 0);
  const neto = datos.reduce((s, d) => s + d.neto, 0);
  const margen = ingTotal > 0 ? (neto / ingTotal) * 100 : neto < 0 ? -100 : 0;
  const positivo = neto >= 0;

  const insights = useMemo(() => {
    const con = datos.filter((d) => d.ingresos || d.gastos);
    if (con.length === 0) return ["No hay movimientos registrados en este año."];
    const mejor = con.reduce((a, b) => (b.neto > a.neto ? b : a));
    const peor = con.reduce((a, b) => (b.neto < a.neto ? b : a));
    const pos = con.filter((d) => d.neto > 0).length;
    const primero =
      mejor.neto > 0
        ? `El mes con mayor ganancia fue ${mejor.mes}, con un resultado de ${soles(mejor.neto)}`
        : mejor.neto < 0
          ? `Ningún mes registró ganancia. El mes con menor pérdida fue ${mejor.mes}, con un resultado de ${soles(mejor.neto)}`
          : "Ningún mes registró ganancia neta (resultado en equilibrio)";
    const segundo =
      peor.neto < 0
        ? `El mes con mayor pérdida fue ${peor.mes}, con un resultado de ${soles(peor.neto)}`
        : `El mes con menor ganancia fue ${peor.mes}, con un resultado de ${soles(peor.neto)}`;
    const tercero =
      pos === 0
        ? `Ninguno de los ${con.length} meses con movimiento cerró en positivo`
        : `${pos} de ${con.length} meses con movimiento cerraron en positivo`;
    return [primero, segundo, tercero];
  }, [datos]);

  return (
    <div className="mb-4 rounded-lg bg-card p-4">
      <div className="mb-4 flex w-full max-w-md text-sm">
        <span className="flex items-center gap-1.5 bg-ink px-3 py-1.5 font-semibold text-background">
          Selecciona un año <ArrowRight size={14} />
        </span>
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="flex-1 border-2 border-primary bg-background px-3 py-1.5 text-center text-sm outline-hidden"
        >
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="overflow-hidden border border-line">
            <div className="bg-ink px-4 py-3 text-base font-semibold text-background">Ganancia / Pérdida del año</div>
            <div className="py-8 text-center text-4xl font-bold">{soles(neto)}</div>
            <div className={`py-4 text-center text-3xl font-bold text-background ${positivo ? "bg-good" : "bg-bad"}`}>
              {margen.toFixed(1)}%
            </div>
          </div>
          <h3 className="mt-5 mb-2 px-1 text-sm font-semibold">Análisis</h3>
          <ol className="border border-line">
            {insights.map((t, i) => (
              <li key={i} className="flex border-b border-line last:border-b-0">
                <span className="grid w-14 shrink-0 place-items-center bg-ink py-3 text-sm font-semibold text-background">{i + 1}</span>
                <span className="min-w-0 px-3 py-2.5 text-sm font-semibold">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-base font-semibold">Ingresos vs Gastos</h3>
          <div className="h-[420px] border border-line p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datos} margin={{ top: 24, right: 16, left: 16, bottom: 8 }} barGap={0}>
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
                <YAxis hide />
                <ReferenceLine y={0} stroke="var(--line)" />
                <Tooltip formatter={(v: number) => soles(v)} />
                <Legend verticalAlign="top" height={32} iconType="rect" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--good)" maxBarSize={36}>
                  <LabelList dataKey="ingresos" position="top" formatter={corto} style={{ fontSize: 10 }} />
                </Bar>
                <Bar dataKey="gastos" name="Gastos" fill="var(--bad)" maxBarSize={36}>
                  <LabelList dataKey="gastos" position="top" formatter={corto} style={{ fontSize: 10 }} />
                </Bar>
                <Line type="monotone" dataKey="neto" name="Ganancia / Pérdida" stroke="var(--ink)" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

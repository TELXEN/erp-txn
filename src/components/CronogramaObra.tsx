import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Select, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, pct, soles } from "@/lib/format";
import {
  PERIODICIDADES,
  generarPeriodos,
  hoyISO,
  programadoCronograma,
  programadoPartida,
  useCronograma,
  usePartidas,
  useProyectos,
  type Periodicidad,
  type PeriodoCronograma,
} from "@/lib/datos";

export function CronogramaObra() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const verDinero = puedeVerDinero(rol);
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: cronTodo = [] } = useCronograma();
  const [obraId, setObraId] = useState("");
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const obra = proyectos.find((p) => p.id === obraId);
  const per: Periodicidad = obra?.periodicidad_cronograma ?? "mes";
  const cron = useMemo(() => cronTodo.filter((c) => (c.periodicidad ?? "mes") === per), [cronTodo, per]);
  const periodos = useMemo(() => (obra ? generarPeriodos(obra.fecha_inicio, obra.fecha_fin, per) : []), [obra, per]);
  const propias = useMemo(() => partidas.filter((p) => p.proyecto_id === obraId), [partidas, obraId]);
  const padres = useMemo(() => new Set(propias.map((p) => p.padre_id).filter(Boolean)), [propias]);
  const hojas = useMemo(
    () => propias.filter((p) => !padres.has(p.id)).sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true })),
    [propias, padres],
  );
  const hoy = hoyISO();
  const esActual = (m: PeriodoCronograma) => m.inicio <= hoy && hoy <= m.fin;
  const valor = (pid: string, m: PeriodoCronograma) =>
    Number(cron.find((c) => c.partida_id === pid && c.fecha_inicio === m.inicio)?.pct ?? 0);

  async function cambiarPeriodicidad(nueva: Periodicidad) {
    if (!obra || nueva === per) return;
    const ids = new Set(hojas.map((h) => h.id));
    if (cron.some((c) => ids.has(c.partida_id)) &&
      !confirm("Las metas cargadas con la periodicidad actual se guardan pero dejarán de usarse. ¿Continuar?")) return;
    setError("");
    const { error: err } = await supabase.from("proyectos").update({ periodicidad_cronograma: nueva }).eq("id", obra.id);
    if (err) return setError(err.message);
    setBorrador({});
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function guardar(pid: string, m: PeriodoCronograma) {
    const k = `${pid}|${m.inicio}`;
    const bruto = borrador[k];
    if (bruto === undefined) return;
    const nuevo = Math.min(100, Math.max(0, Number(bruto) || 0));
    const otros = periodos.reduce((s, x) => (x.inicio === m.inicio ? s : s + valor(pid, x)), 0);
    setError("");
    if (otros + nuevo > 100.001) {
      setError(`La suma de una partida no puede superar 100% (disponible ${pct(100 - otros)}).`);
      return;
    }
    const [y, mo] = m.inicio.split("-").map(Number);
    const { error: err } =
      nuevo === 0
        ? await supabase.from("cronograma_partidas").delete().eq("partida_id", pid).eq("periodicidad", per).eq("fecha_inicio", m.inicio)
        : await supabase
            .from("cronograma_partidas")
            .upsert(
              { partida_id: pid, periodicidad: per, fecha_inicio: m.inicio, anio: y!, mes: mo!, pct: nuevo },
              { onConflict: "partida_id,periodicidad,fecha_inicio" },
            );
    if (err) return setError(err.message);
    setBorrador((b) => {
      const c = { ...b };
      delete c[k];
      return c;
    });
    qc.invalidateQueries({ queryKey: ["cronograma_partidas"] });
  }

  const programadoObra = programadoCronograma(hojas, cron, hoy, per);
  const realObra = (() => {
    const base = hojas.reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
    return base > 0
      ? hojas.reduce((s, p) => s + Number(p.avance_pct) * Number(p.presupuesto_inicial), 0) / base
      : hojas.reduce((s, p) => s + Number(p.avance_pct), 0) / (hojas.length || 1);
  })();

  return (
    <Panel
      titulo="Calendario de avance de obra"
      extra={
        <div className="flex flex-wrap gap-2">
          <Select className="w-64" value={obraId} onChange={(e) => setObraId(e.target.value)}>
            <option value="">Selecciona una obra</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo ? `${p.codigo} · ` : ""}
                {p.nombre}
              </option>
            ))}
          </Select>
          {obra && (
            <Select
              className="w-40"
              aria-label="Periodicidad"
              value={per}
              onChange={(e) => cambiarPeriodicidad(e.target.value as Periodicidad)}
            >
              {PERIODICIDADES.map((x) => (
                <option key={x.valor} value={x.valor}>
                  Por {x.nombre.toLowerCase()}
                </option>
              ))}
            </Select>
          )}
        </div>
      }
    >
      {!obra ? (
        <Vacio texto="Selecciona una obra para programar el % de cada partida por periodo." />
      ) : hojas.length === 0 ? (
        <Vacio texto="La obra no tiene partidas." />
      ) : (
        <>
          {error && <p className="mx-5 mt-3 rounded-md bg-bad/10 px-3 py-2 font-mono text-xs text-bad">{error}</p>}
          <div className="flex flex-wrap gap-6 px-5 py-3 font-mono text-xs">
            <span>Programado a hoy: <b>{programadoObra == null ? "Sin cronograma" : pct(programadoObra)}</b></span>
            <span>Avance real: <b>{pct(realObra)}</b></span>
            {programadoObra != null && (
              <span className={realObra + 0.05 < programadoObra ? "font-semibold text-bad" : "font-semibold text-good"}>
                {realObra + 0.05 < programadoObra ? `Retraso ${pct(programadoObra - realObra)}` : "En plazo"}
              </span>
            )}
            <span className="text-muted-foreground">{periodos.length} periodos</span>
            {(!obra.fecha_inicio || !obra.fecha_fin) && (
              <span className="text-muted-foreground">Sin fechas completas de obra: se muestra un plazo referencial.</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-muted/60 text-left">
                  <th className="px-3 py-2 label-mono">Partida</th>
                  {periodos.map((m) => (
                    <th
                      key={m.inicio}
                      title={`${fecha(m.inicio)} – ${fecha(m.fin)}`}
                      className={`px-1 py-2 text-center label-mono ${esActual(m) ? "bg-accent/40" : ""}`}
                    >
                      {m.etiqueta}
                      <span className="block text-[9px] font-normal text-muted-foreground">{m.corta}</span>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right label-mono">Total</th>
                  <th className="px-2 py-2 text-right label-mono">Prog. hoy</th>
                  <th className="px-2 py-2 text-right label-mono">Real</th>
                  <th className="px-2 py-2 label-mono">Estado</th>
                </tr>
              </thead>
              <tbody>
                {hojas.map((p) => {
                  const total = periodos.reduce((s, m) => s + valor(p.id, m), 0);
                  const prog = programadoPartida(p.id, cron, hoy, per);
                  const real = Number(p.avance_pct);
                  const retraso = total > 0 && real + 0.05 < prog;
                  return (
                    <tr key={p.id} className="border-b border-line/60">
                      <td className="max-w-64 px-3 py-1.5">
                        <p className="truncate font-semibold" title={p.nombre}>
                          <span className="font-mono text-muted-foreground">{p.codigo} </span>
                          {p.nombre}
                        </p>
                        {verDinero && (
                          <p className="font-mono text-[10px] text-muted-foreground">{soles(Number(p.presupuesto_inicial))}</p>
                        )}
                      </td>
                      {periodos.map((m) => {
                        const k = `${p.id}|${m.inicio}`;
                        const v = valor(p.id, m);
                        return (
                          <td key={k} className={`px-0.5 py-1 text-center ${esActual(m) ? "bg-accent/20" : ""}`}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              aria-label={`${p.nombre} ${m.etiqueta}`}
                              className="w-14 rounded border border-line bg-background px-1 py-1 text-right font-mono text-xs"
                              value={borrador[k] ?? (v ? String(v) : "")}
                              placeholder="0"
                              onChange={(e) => setBorrador({ ...borrador, [k]: e.target.value })}
                              onBlur={() => guardar(p.id, m)}
                            />
                            {verDinero && v > 0 && (
                              <p className="font-mono text-[9px] text-muted-foreground">
                                {soles((Number(p.presupuesto_inicial) * v) / 100)}
                              </p>
                            )}
                          </td>
                        );
                      })}
                      <td className={`px-2 text-right font-mono ${Math.abs(total - 100) < 0.01 ? "text-good" : "text-muted-foreground"}`}>
                        {pct(total)}
                      </td>
                      <td className="px-2 text-right font-mono">{pct(prog)}</td>
                      <td className="px-2 text-right font-mono">{pct(real)}</td>
                      <td className="px-2 font-mono">
                        {total === 0 ? (
                          <span className="text-muted-foreground">Sin programar</span>
                        ) : retraso ? (
                          <span className="text-bad">● -{pct(prog - real)}</span>
                        ) : (
                          <span className="text-good">● En plazo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {verDinero && (
                <tfoot>
                  <tr className="bg-muted/60 font-mono">
                    <td className="px-3 py-2 label-mono">Valorizado programado</td>
                    {periodos.map((m) => (
                      <td key={`t${m.inicio}`} className="px-1 py-2 text-center text-[10px]">
                        {soles(hojas.reduce((s, p) => s + (Number(p.presupuesto_inicial) * valor(p.id, m)) / 100, 0))}
                      </td>
                    ))}
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

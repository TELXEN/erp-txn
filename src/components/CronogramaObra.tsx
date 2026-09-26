import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Select, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { MESES, pct, soles } from "@/lib/format";
import {
  claveMes,
  programadoCronograma,
  programadoPartida,
  useCronograma,
  usePartidas,
  useProyectos,
} from "@/lib/datos";

type Mes = { anio: number; mes: number };

function mesesEntre(inicio: string | null, fin: string | null): Mes[] {
  const hoy = new Date();
  const a = inicio ? new Date(inicio + "T00:00:00") : hoy;
  let b = fin ? new Date(fin + "T00:00:00") : new Date(a.getFullYear(), a.getMonth() + 5, 1);
  if (b < a) b = a;
  const lista: Mes[] = [];
  let y = a.getFullYear();
  let m = a.getMonth() + 1;
  while (claveMes(y, m) <= claveMes(b.getFullYear(), b.getMonth() + 1) && lista.length < 36) {
    lista.push({ anio: y, mes: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return lista;
}

export function CronogramaObra() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const verDinero = puedeVerDinero(rol);
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: cron = [] } = useCronograma();
  const [obraId, setObraId] = useState("");
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const obra = proyectos.find((p) => p.id === obraId);
  const meses = useMemo(() => (obra ? mesesEntre(obra.fecha_inicio, obra.fecha_fin) : []), [obra]);
  const propias = useMemo(() => partidas.filter((p) => p.proyecto_id === obraId), [partidas, obraId]);
  const padres = useMemo(() => new Set(propias.map((p) => p.padre_id).filter(Boolean)), [propias]);
  const hojas = useMemo(
    () => propias.filter((p) => !padres.has(p.id)).sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true })),
    [propias, padres],
  );
  const ahora = new Date();
  const claveHoy = claveMes(ahora.getFullYear(), ahora.getMonth() + 1);
  const valor = (pid: string, m: Mes) =>
    Number(cron.find((c) => c.partida_id === pid && c.anio === m.anio && c.mes === m.mes)?.pct ?? 0);

  async function guardar(pid: string, m: Mes) {
    const k = `${pid}|${m.anio}|${m.mes}`;
    const bruto = borrador[k];
    if (bruto === undefined) return;
    const nuevo = Math.min(100, Math.max(0, Number(bruto) || 0));
    const otros = meses.reduce((s, x) => (x.anio === m.anio && x.mes === m.mes ? s : s + valor(pid, x)), 0);
    setError("");
    if (otros + nuevo > 100.001) {
      setError(`La suma mensual de una partida no puede superar 100% (disponible ${pct(100 - otros)}).`);
      return;
    }
    const { error: err } =
      nuevo === 0
        ? await supabase.from("cronograma_partidas").delete().eq("partida_id", pid).eq("anio", m.anio).eq("mes", m.mes)
        : await supabase
            .from("cronograma_partidas")
            .upsert({ partida_id: pid, anio: m.anio, mes: m.mes, pct: nuevo }, { onConflict: "partida_id,anio,mes" });
    if (err) return setError(err.message);
    setBorrador((b) => {
      const c = { ...b };
      delete c[k];
      return c;
    });
    qc.invalidateQueries({ queryKey: ["cronograma_partidas"] });
  }

  const programadoObra = programadoCronograma(hojas, cron, claveHoy);
  const realObra = (() => {
    const base = hojas.reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
    return base > 0
      ? hojas.reduce((s, p) => s + Number(p.avance_pct) * Number(p.presupuesto_inicial), 0) / base
      : hojas.reduce((s, p) => s + Number(p.avance_pct), 0) / (hojas.length || 1);
  })();

  return (
    <Panel
      titulo="Calendario de avance de obra (cronograma mensual)"
      extra={
        <Select className="w-64" value={obraId} onChange={(e) => setObraId(e.target.value)}>
          <option value="">Selecciona una obra</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo ? `${p.codigo} · ` : ""}
              {p.nombre}
            </option>
          ))}
        </Select>
      }
    >
      {!obra ? (
        <Vacio texto="Selecciona una obra para programar el % mensual de cada partida." />
      ) : hojas.length === 0 ? (
        <Vacio texto="La obra no tiene partidas." />
      ) : (
        <>
          {error && <p className="mx-5 mt-3 rounded-md bg-bad/10 px-3 py-2 font-mono text-xs text-bad">{error}</p>}
          <div className="flex flex-wrap gap-6 px-5 py-3 font-mono text-xs">
            <span>Programado al mes actual: <b>{programadoObra == null ? "Sin cronograma" : pct(programadoObra)}</b></span>
            <span>Avance real: <b>{pct(realObra)}</b></span>
            {programadoObra != null && (
              <span className={realObra + 0.05 < programadoObra ? "font-semibold text-bad" : "font-semibold text-good"}>
                {realObra + 0.05 < programadoObra ? `Retraso ${pct(programadoObra - realObra)}` : "En plazo"}
              </span>
            )}
            {!obra.fecha_inicio && <span className="text-muted-foreground">Sin fechas de obra: se muestran 6 meses.</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-muted/60 text-left">
                  <th className="px-3 py-2 label-mono">Partida</th>
                  {meses.map((m) => (
                    <th
                      key={`${m.anio}-${m.mes}`}
                      className={`px-1 py-2 text-center label-mono ${claveMes(m.anio, m.mes) === claveHoy ? "bg-accent/40" : ""}`}
                    >
                      {MESES[m.mes - 1]!.slice(0, 3)} {String(m.anio).slice(2)}
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
                  const total = meses.reduce((s, m) => s + valor(p.id, m), 0);
                  const prog = programadoPartida(p.id, cron, claveHoy);
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
                      {meses.map((m) => {
                        const k = `${p.id}|${m.anio}|${m.mes}`;
                        const v = valor(p.id, m);
                        return (
                          <td key={k} className="px-0.5 py-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              aria-label={`${p.nombre} ${MESES[m.mes - 1]} ${m.anio}`}
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
                    {meses.map((m) => (
                      <td key={`t${m.anio}-${m.mes}`} className="px-1 py-2 text-center text-[10px]">
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

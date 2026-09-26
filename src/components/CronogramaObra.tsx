import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Celda = { fila: number; columna: number };
type Seleccion = { inicio: Celda; fin: Celda };

const normalizar = (seleccion: Seleccion) => ({
  filaInicio: Math.min(seleccion.inicio.fila, seleccion.fin.fila),
  filaFin: Math.max(seleccion.inicio.fila, seleccion.fin.fila),
  columnaInicio: Math.min(seleccion.inicio.columna, seleccion.fin.columna),
  columnaFin: Math.max(seleccion.inicio.columna, seleccion.fin.columna),
});

export function CronogramaObra() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const verDinero = puedeVerDinero(rol);
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: cronTodo = [] } = useCronograma();
  const [obraId, setObraId] = useState("");
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [arrastrando, setArrastrando] = useState<"seleccion" | "relleno" | null>(null);
  const [destinoRelleno, setDestinoRelleno] = useState<Celda | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const tablaRef = useRef<HTMLDivElement>(null);

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
  const clave = (fila: number, columna: number) => `${hojas[fila]?.id ?? ""}|${periodos[columna]?.inicio ?? ""}`;
  const valor = useCallback(
    (pid: string, m: PeriodoCronograma) => Number(cron.find((c) => c.partida_id === pid && c.fecha_inicio === m.inicio)?.pct ?? 0),
    [cron],
  );
  const valorCelda = useCallback(
    (fila: number, columna: number) => {
      const k = clave(fila, columna);
      const editado = borrador[k];
      return editado === undefined ? valor(hojas[fila]?.id ?? "", periodos[columna] as PeriodoCronograma) : Number(editado) || 0;
    },
    [borrador, hojas, periodos, valor],
  );

  async function cambiarPeriodicidad(nueva: Periodicidad) {
    if (!obra || nueva === per) return;
    const ids = new Set(hojas.map((h) => h.id));
    if (cron.some((c) => ids.has(c.partida_id)) &&
      !confirm("Las metas cargadas con la periodicidad actual se guardan pero dejarán de usarse. ¿Continuar?")) return;
    setError("");
    const { error: err } = await supabase.from("proyectos").update({ periodicidad_cronograma: nueva }).eq("id", obra.id);
    if (err) return setError(err.message);
    setBorrador({});
    setSeleccion(null);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  const guardarCambios = useCallback(async (cambios: Map<string, number>) => {
    if (cambios.size === 0) return true;
    const valoresFinales = new Map<string, number>();
    hojas.forEach((p, fila) => periodos.forEach((m, columna) => valoresFinales.set(clave(fila, columna), valor(p.id, m))));
    cambios.forEach((v, k) => valoresFinales.set(k, v));
    for (let fila = 0; fila < hojas.length; fila += 1) {
      const total = periodos.reduce((s, _m, columna) => s + (valoresFinales.get(clave(fila, columna)) ?? 0), 0);
      if (total > 100.001) {
        setError(`La suma de ${hojas[fila]?.codigo ?? "la partida"} no puede superar 100% (actual ${pct(total)}).`);
        return false;
      }
    }
    const registros = [...cambios.entries()].flatMap(([k, porcentaje]) => {
      const [partidaId, fechaInicio] = k.split("|");
      if (!partidaId || !fechaInicio) return [];
      const [anio, mes] = fechaInicio.split("-").map(Number);
      if (anio === undefined || mes === undefined) return [];
      return [{ partida_id: partidaId, periodicidad: per, fecha_inicio: fechaInicio, anio, mes, pct: porcentaje }];
    });
    if (registros.length === 0) return false;
    setGuardando(true);
    setError("");
    const { error: err } = await supabase
      .from("cronograma_partidas")
      .upsert(registros, { onConflict: "partida_id,periodicidad,fecha_inicio" });
    setGuardando(false);
    if (err) {
      setError(err.message);
      return false;
    }
    setBorrador((actual) => {
      const copia = { ...actual };
      cambios.forEach((_v, k) => delete copia[k]);
      return copia;
    });
    await qc.invalidateQueries({ queryKey: ["cronograma_partidas"] });
    return true;
  }, [hojas, periodos, per, qc, valor]);

  const guardarCelda = (fila: number, columna: number) => {
    const k = clave(fila, columna);
    if (borrador[k] === undefined) return;
    const numero = Math.min(100, Math.max(0, Number(borrador[k]) || 0));
    void guardarCambios(new Map([[k, numero]]));
  };

  const pegarTexto = useCallback((texto: string) => {
    if (!seleccion || !texto.trim()) return;
    const base = normalizar(seleccion);
    const matriz = texto.trim().split(/\r?\n/).map((fila) => fila.split("\t"));
    const cambios = new Map<string, number>();
    matriz.forEach((fila, dr) => fila.forEach((celda, dc) => {
      const r = base.filaInicio + dr;
      const c = base.columnaInicio + dc;
      if (r >= hojas.length || c >= periodos.length) return;
      const n = Number(celda.replace(",", ".").replace("%", "").trim());
      if (Number.isFinite(n)) cambios.set(clave(r, c), Math.min(100, Math.max(0, n)));
    }));
    if (cambios.size > 0) void guardarCambios(cambios);
  }, [guardarCambios, hojas.length, periodos.length, seleccion]);

  const copiarSeleccion = useCallback(async () => {
    if (!seleccion) return;
    const r = normalizar(seleccion);
    const texto = Array.from({ length: r.filaFin - r.filaInicio + 1 }, (_, dr) =>
      Array.from({ length: r.columnaFin - r.columnaInicio + 1 }, (_, dc) =>
        String(valorCelda(r.filaInicio + dr, r.columnaInicio + dc)),
      ).join("\t"),
    ).join("\n");
    await navigator.clipboard.writeText(texto);
  }, [seleccion, valorCelda]);

  const pegarPortapapeles = async () => pegarTexto(await navigator.clipboard.readText());

  const aplicarRelleno = useCallback(() => {
    if (!seleccion || !destinoRelleno) return;
    const origen = normalizar(seleccion);
    const destino: Seleccion = { inicio: { fila: origen.filaInicio, columna: origen.columnaInicio }, fin: destinoRelleno };
    const rango = normalizar(destino);
    const filasOrigen = origen.filaFin - origen.filaInicio + 1;
    const columnasOrigen = origen.columnaFin - origen.columnaInicio + 1;
    const cambios = new Map<string, number>();
    for (let fila = rango.filaInicio; fila <= rango.filaFin; fila += 1) {
      for (let columna = rango.columnaInicio; columna <= rango.columnaFin; columna += 1) {
        const fo = origen.filaInicio + ((fila - rango.filaInicio) % filasOrigen);
        const co = origen.columnaInicio + ((columna - rango.columnaInicio) % columnasOrigen);
        cambios.set(clave(fila, columna), valorCelda(fo, co));
      }
    }
    setSeleccion(destino);
    setDestinoRelleno(null);
    void guardarCambios(cambios);
  }, [destinoRelleno, guardarCambios, seleccion, valorCelda]);

  useEffect(() => {
    const terminar = () => {
      if (arrastrando === "relleno") aplicarRelleno();
      setArrastrando(null);
    };
    window.addEventListener("mouseup", terminar);
    return () => window.removeEventListener("mouseup", terminar);
  }, [aplicarRelleno, arrastrando]);

  const seleccionada = (fila: number, columna: number) => {
    if (!seleccion) return false;
    const r = normalizar(seleccion);
    return fila >= r.filaInicio && fila <= r.filaFin && columna >= r.columnaInicio && columna <= r.columnaFin;
  };

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
        <div className="flex flex-wrap items-center gap-2">
          {seleccion && <Boton variante="linea" onClick={() => void copiarSeleccion()} title="Copiar celdas"><ClipboardCopy size={14} /></Boton>}
          {seleccion && <Boton variante="linea" onClick={() => void pegarPortapapeles()} title="Pegar celdas"><ClipboardPaste size={14} /></Boton>}
          <Select className="w-64" value={obraId} onChange={(e) => { setObraId(e.target.value); setSeleccion(null); }}>
            <option value="">Selecciona una obra</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>)}
          </Select>
          {obra && (
            <Select className="w-40" aria-label="Periodicidad" value={per} onChange={(e) => cambiarPeriodicidad(e.target.value as Periodicidad)}>
              {PERIODICIDADES.map((x) => <option key={x.valor} value={x.valor}>Por {x.nombre.toLowerCase()}</option>)}
            </Select>
          )}
        </div>
      }
    >
      {!obra ? <Vacio texto="Selecciona una obra para programar el % de cada partida por periodo." /> : hojas.length === 0 ? <Vacio texto="La obra no tiene partidas." /> : (
        <>
          {error && <p className="mx-5 mt-3 rounded-md bg-bad/10 px-3 py-2 font-mono text-xs text-bad">{error}</p>}
          <div className="flex min-h-12 flex-wrap items-center gap-6 px-5 py-3 font-mono text-xs">
            <span>Programado a hoy: <b>{programadoObra == null ? "Sin cronograma" : pct(programadoObra)}</b></span>
            <span>Avance real: <b>{pct(realObra)}</b></span>
            {programadoObra != null && <span className={realObra + 0.05 < programadoObra ? "font-semibold text-bad" : "font-semibold text-good"}>{realObra + 0.05 < programadoObra ? `Retraso ${pct(programadoObra - realObra)}` : "En plazo"}</span>}
            <span className="text-muted-foreground">{guardando ? "Guardando…" : `${periodos.length} periodos`}</span>
          </div>
          <div
            ref={tablaRef}
            className="overflow-auto border-t border-line outline-none"
            tabIndex={0}
            onCopy={(e) => { if (seleccion) { e.preventDefault(); void copiarSeleccion(); } }}
            onPaste={(e) => { if (seleccion) { e.preventDefault(); pegarTexto(e.clipboardData.getData("text")); } }}
          >
            <table className="w-max min-w-full table-fixed select-none text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="h-14 border-b border-line bg-muted text-left">
                  <th className="sticky left-0 z-30 w-72 min-w-72 border-r border-line bg-muted px-3 py-2 label-mono">Partida</th>
                  {periodos.map((m) => <th key={m.inicio} title={`${fecha(m.inicio)} – ${fecha(m.fin)}`} className={`w-16 min-w-16 border-r border-line px-1 py-2 text-center align-middle label-mono ${esActual(m) ? "bg-accent/40" : ""}`}>{m.etiqueta}<span className="block text-[9px] font-normal text-muted-foreground">{m.corta}</span></th>)}
                  <th className="w-20 min-w-20 px-2 py-2 text-right label-mono">Total</th>
                  <th className="w-20 min-w-20 px-2 py-2 text-right label-mono">Prog. hoy</th>
                  <th className="w-16 min-w-16 px-2 py-2 text-right label-mono">Real</th>
                  <th className="w-28 min-w-28 px-2 py-2 label-mono">Estado</th>
                </tr>
              </thead>
              <tbody>
                {hojas.map((p, fila) => {
                  const total = periodos.reduce((s, _m, columna) => s + valorCelda(fila, columna), 0);
                  const prog = programadoPartida(p.id, cron, hoy, per);
                  const real = Number(p.avance_pct);
                  const retraso = total > 0 && real + 0.05 < prog;
                  return (
                    <tr key={p.id} className="h-14 border-b border-line/60 bg-card">
                      <td className="sticky left-0 z-10 h-14 w-72 min-w-72 border-r border-line bg-card px-3 py-1 align-middle">
                        <p className="truncate font-semibold" title={p.nombre}><span className="font-mono text-muted-foreground">{p.codigo} </span>{p.nombre}</p>
                        {verDinero && <p className="truncate font-mono text-[10px] leading-4 text-muted-foreground">{soles(Number(p.presupuesto_inicial))}</p>}
                      </td>
                      {periodos.map((m, columna) => {
                        const k = clave(fila, columna);
                        const v = valorCelda(fila, columna);
                        const activa = seleccionada(fila, columna);
                        const rangoRelleno = destinoRelleno && seleccion ? (() => { const r = normalizar({ inicio: seleccion.inicio, fin: destinoRelleno }); return fila >= r.filaInicio && fila <= r.filaFin && columna >= r.columnaInicio && columna <= r.columnaFin; })() : false;
                        const borde = seleccion && fila === normalizar(seleccion).filaFin && columna === normalizar(seleccion).columnaFin;
                        return (
                          <td
                            key={k}
                            className={`relative h-14 w-16 min-w-16 border-r border-line p-0.5 text-center align-middle ${esActual(m) ? "bg-accent/15" : ""} ${activa ? "bg-primary/10 ring-1 ring-inset ring-primary" : ""} ${rangoRelleno ? "bg-primary/5" : ""}`}
                            onMouseDown={() => { setSeleccion({ inicio: { fila, columna }, fin: { fila, columna } }); setArrastrando("seleccion"); tablaRef.current?.focus(); }}
                            onMouseEnter={() => { if (arrastrando === "seleccion" && seleccion) setSeleccion({ ...seleccion, fin: { fila, columna } }); if (arrastrando === "relleno") setDestinoRelleno({ fila, columna }); }}
                          >
                            <input
                              type="number" min="0" max="100" aria-label={`${p.nombre} ${m.etiqueta}`}
                              className="h-7 w-14 rounded-sm border border-line bg-background px-1 text-right font-mono text-xs focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={borrador[k] ?? (v ? String(v) : "")}
                              placeholder="0"
                              onFocus={() => setSeleccion({ inicio: { fila, columna }, fin: { fila, columna } })}
                              onChange={(e) => setBorrador((actual) => ({ ...actual, [k]: e.target.value }))}
                              onBlur={() => guardarCelda(fila, columna)}
                            />
                            {verDinero && <p className="h-3 truncate font-mono text-[8px] leading-3 text-muted-foreground">{v > 0 ? soles((Number(p.presupuesto_inicial) * v) / 100) : ""}</p>}
                            {borde && <span className="absolute -bottom-1 -right-1 z-20 h-2.5 w-2.5 cursor-crosshair border border-card bg-primary" title="Arrastrar para rellenar" onMouseDown={(e) => { e.stopPropagation(); setArrastrando("relleno"); setDestinoRelleno({ fila, columna }); }} />}
                          </td>
                        );
                      })}
                      <td className={`h-14 px-2 text-right align-middle font-mono ${Math.abs(total - 100) < 0.01 ? "text-good" : "text-muted-foreground"}`}>{pct(total)}</td>
                      <td className="h-14 px-2 text-right align-middle font-mono">{pct(prog)}</td>
                      <td className="h-14 px-2 text-right align-middle font-mono">{pct(real)}</td>
                      <td className="h-14 px-2 align-middle font-mono">{total === 0 ? <span className="text-muted-foreground">Sin programar</span> : retraso ? <span className="text-bad">● -{pct(prog - real)}</span> : <span className="text-good">● En plazo</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
              {verDinero && <tfoot><tr className="h-12 bg-muted font-mono"><td className="sticky left-0 z-10 border-r border-line bg-muted px-3 py-2 label-mono">Valorizado programado</td>{periodos.map((m, columna) => <td key={`t${m.inicio}`} className="w-16 border-r border-line px-1 py-2 text-center text-[9px]">{soles(hojas.reduce((s, p, fila) => s + (Number(p.presupuesto_inicial) * valorCelda(fila, columna)) / 100, 0))}</td>)}<td colSpan={4} /></tr></tfoot>}
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
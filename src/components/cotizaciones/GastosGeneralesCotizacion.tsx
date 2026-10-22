import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronDown, Printer, ChevronRight, FolderPlus, ListPlus, Rows3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BotonIcono, VentanaFlotante } from "@/components/ui-kit";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { useUnidadesMedida } from "@/lib/unidades";
import { cn } from "@/lib/utils";
import {
  ESTRUCTURA_GG, finBloqueGG, moverGG, numerarGG, parcialGG, pctGG, resumenPresupuesto, subtotalGG, totalGG, totalesGG,
  type FilaGG, type NivelGG, type TipoGG,
} from "@/lib/gastos-generales-cotizacion";

const db = supabase as unknown as { from: (t: string) => any };
const TABLA = "cotizacion_gastos_generales";

export function GastosGeneralesCotizacion({ abierta, onCerrar, cotizacionId, costoDirecto, pctActual, moneda, soloLectura,
  pctUtilidad, aplicaIgv, duracionMeses }: {
  abierta: boolean; onCerrar: () => void; cotizacionId: string; costoDirecto: number; pctActual: number;
  moneda: string; soloLectura: boolean; pctUtilidad: number; aplicaIgv: boolean; duracionMeses: number;
}) {
  const [duracion, setDuracion] = useState(duracionMeses || 1);
  const [util, setUtil] = useState(pctUtilidad);
  useEffect(() => { setDuracion(duracionMeses || 1); setUtil(pctUtilidad); }, [abierta, duracionMeses, pctUtilidad]);
  const qc = useQueryClient();
  const { data: unidades = [] } = useUnidadesMedida();
  const [filas, setFilas] = useState<FilaGG[]>([]);
  const [cargando, setCargando] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const tablaRef = useRef<HTMLElement>(null);
  const enfocarFila = (id: string | null) => {
    if (!id) return;
    const campo = Array.from(tablaRef.current?.querySelectorAll<HTMLInputElement>("input[data-fila-gg]") ?? []).find((input) => input.dataset["filaGg"] === id);
    campo?.focus();
    campo?.select();
  };
  const sim = moneda === "USD" ? "US$" : "S/";
  const fmt = (n: number) => `${sim} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function cargar() {
    setCargando(true);
    const { data, error: e } = await db.from(TABLA).select("*").eq("cotizacion_id", cotizacionId).order("orden");
    if (e) { setError(e.message); setCargando(false); return; }
    let rows = (data ?? []) as FilaGG[];
    if (!rows.length && !soloLectura) rows = await sembrar();
    setFilas(rows);
    setCargando(false);
  }
  async function sembrar(): Promise<FilaGG[]> {
    const { data: ins, error: e2 } = await db.from(TABLA)
      .insert(ESTRUCTURA_GG.map((x, i) => ({
        cotizacion_id: cotizacionId, orden: i, nivel: x.nivel, descripcion: x.descripcion, unidad: x.unidad ?? "GLB",
        tipo: x.tipo, cantidad: x.cantidad ?? 0, tiempo: x.tipo === "variable" ? duracion : 1,
      })))
      .select("*");
    if (e2) setError(e2.message);
    return ((ins ?? []) as FilaGG[]).sort((a, b) => a.orden - b.orden);
  }

  async function cargarEstandar() {
    if (!confirm("¿Reemplazar la hoja de gastos generales por la estructura estándar (Fijos y Variables)? Se perderán las filas actuales.")) return;
    const { error: e } = await db.from(TABLA).delete().eq("cotizacion_id", cotizacionId);
    if (e) return setError(e.message);
    const nuevas = await sembrar();
    setFilas(nuevas);
    setSel(null);
    await sincronizarPct(nuevas);
  }

  async function guardarCot(cambios: Record<string, unknown>) {
    const { error: e } = await supabase.from("cotizaciones").update(cambios as never).eq("id", cotizacionId);
    if (e) return setError(e.message);
    await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
  }

  async function cambiarDuracion(v: number) {
    if (!(v > 0) || v === duracionMeses) return;
    await guardarCot({ duracion_meses: v });
    const afectadas = filas.filter((f) => f.nivel === "item" && f.tipo !== "fijo" && !f.tiempo_manual);
    if (!afectadas.length) return;
    const { error: e } = await db.from(TABLA).update({ tiempo: v }).in("id", afectadas.map((f) => f.id));
    if (e) return setError(e.message);
    const nuevas = filas.map((f) => (afectadas.includes(f) ? { ...f, tiempo: v } : f));
    setFilas(nuevas);
    await sincronizarPct(nuevas);
  }

  /** Tipo del bloque que contiene la posición idx. */
  const tipoEn = (lista: FilaGG[], idx: number): TipoGG => {
    for (let j = Math.min(idx, lista.length - 1); j >= 0; j--) if (lista[j]!.nivel === "bloque") return lista[j]!.tipo ?? "variable";
    return "variable";
  };

  async function agregarFila(tipo: TipoGG) {
    const idx = sel ? filas.findIndex((f) => f.id === sel) : -1;
    const ultimo = filas.reduce((u, f, i) => ((f.tipo ?? "variable") === tipo ? i : u), -1);
    const pos = idx >= 0 && (filas[idx]!.tipo ?? "variable") === tipo ? (filas[idx]!.nivel === "item" ? idx + 1 : finBloqueGG(filas, idx)) : ultimo + 1;
    const { data, error: e } = await db.from(TABLA)
      .insert({ cotizacion_id: cotizacionId, orden: pos, nivel: "item", descripcion: "Nuevo ítem", tipo,
        unidad: tipo === "fijo" ? "GLB" : "mes", cantidad: 1, tiempo: tipo === "fijo" ? 1 : duracion })
      .select("*").single();
    if (e) return setError(e.message);
    await reordenar([...filas.slice(0, pos), data as FilaGG, ...filas.slice(pos)]);
    setSel((data as FilaGG).id);
    setCerrados(new Set());
    requestAnimationFrame(() => enfocarFila((data as FilaGG).id));
  }

  useEffect(() => { if (abierta) void cargar(); }, [abierta, cotizacionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = totalGG(filas);
  const pct = pctGG(total, costoDirecto);
  const { fijos, variables } = totalesGG(filas);
  const res = resumenPresupuesto(costoDirecto, fijos, variables, util, aplicaIgv ? 18 : 0);
  const numeros = useMemo(() => numerarGG(filas), [filas]);

  async function sincronizarPct(nuevas: FilaGG[]) {
    if (soloLectura) return;
    const t = totalGG(nuevas);
    if (t <= 0) return; // hoja vacía: se mantiene el % manual
    // Costo directo fresco desde la base (el prop puede llegar en 0 si la hoja aún carga)
    const { data: its, error: e0 } = await supabase.from("cotizacion_items").select("metrado, precio_unitario, tipo").eq("cotizacion_id", cotizacionId);
    if (e0) return setError(e0.message);
    const cd = (its ?? []).filter((i) => i.tipo !== "grupo").reduce((s, i) => s + Number(i.metrado || 0) * Number(i.precio_unitario || 0), 0);
    const p = pctGG(t, cd);
    const { error: e } = await supabase.from("cotizaciones").update({ pct_gastos_generales: p }).eq("id", cotizacionId);
    if (e) return setError(e.message);
    await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    await qc.invalidateQueries({ queryKey: ["cotizacion_items"] });
  }

  async function reordenar(nuevas: FilaGG[]) {
    const conOrden = nuevas.map((f, i) => ({ ...f, orden: i }));
    setFilas(conOrden);
    await Promise.all(conOrden.filter((f, i) => filas[i]?.id !== f.id || filas[i]?.orden !== i)
      .map((f) => db.from(TABLA).update({ orden: f.orden }).eq("id", f.id)));
  }

  async function editar(id: string, cambios: Partial<FilaGG>) {
    const nuevas = filas.map((f) => (f.id === id ? { ...f, ...cambios } : f));
    setFilas(nuevas);
    const { error: e } = await db.from(TABLA).update(cambios).eq("id", id);
    if (e) return setError(e.message);
    await sincronizarPct(nuevas);
  }

  async function agregar(nivel: NivelGG) {
    const idx = sel ? filas.findIndex((f) => f.id === sel) : -1;
    const seleccionada = filas[idx];
    const pos = !seleccionada ? filas.length : nivel === "item" && seleccionada.nivel === "item" ? idx + 1 : finBloqueGG(filas, idx);
    const insertar = seleccionada?.nivel === "bloque" && nivel === "grupo" ? finBloqueGG(filas, idx) : pos;
    const { data, error: e } = await db.from(TABLA)
      .insert({ cotizacion_id: cotizacionId, orden: insertar, nivel, tipo: nivel === "bloque" ? "variable" : tipoEn(filas, insertar - 1), tiempo: duracion, descripcion: nivel === "item" ? "Nuevo ítem" : nivel === "grupo" ? "Nuevo grupo" : "NUEVO BLOQUE", unidad: "und-mes" })
      .select("*").single();
    if (e) return setError(e.message);
    await reordenar([...filas.slice(0, insertar), data as FilaGG, ...filas.slice(insertar)]);
    setSel((data as FilaGG).id);
    setCerrados(new Set());
    requestAnimationFrame(() => enfocarFila((data as FilaGG).id));
  }

  async function copiar() {
    const idx = filas.findIndex((f) => f.id === sel);
    if (idx < 0) return;
    const fin = finBloqueGG(filas, idx);
    const bloque = filas.slice(idx, fin);
    const { data, error: e } = await db.from(TABLA)
      .insert(bloque.map(({ id: _i, ...r }, k) => ({ ...r, orden: fin + k, descripcion: k === 0 ? `${r.descripcion} (copia)` : r.descripcion })))
      .select("*");
    if (e) return setError(e.message);
    const copias = ((data ?? []) as FilaGG[]).sort((a, b) => a.orden - b.orden);
    const nuevas = [...filas.slice(0, fin), ...copias, ...filas.slice(fin)];
    await reordenar(nuevas);
    await sincronizarPct(nuevas);
  }

  async function eliminar() {
    const idx = filas.findIndex((f) => f.id === sel);
    if (idx < 0) return;
    const fin = finBloqueGG(filas, idx);
    const n = fin - idx - 1;
    const seleccionada = filas[idx];
    if (!seleccionada || !confirm(n ? `¿Eliminar «${seleccionada.descripcion}» y sus ${n} fila(s)?` : `¿Eliminar «${seleccionada.descripcion}»?`)) return;
    const ids = filas.slice(idx, fin).map((f) => f.id);
    const { error: e } = await db.from(TABLA).delete().in("id", ids);
    if (e) return setError(e.message);
    const nuevas = filas.filter((f) => !ids.includes(f.id));
    setSel(null);
    await reordenar(nuevas);
    await sincronizarPct(nuevas);
  }

  async function mover(dir: -1 | 1) {
    const idx = filas.findIndex((f) => f.id === sel);
    if (idx < 0) return;
    const r = moverGG(filas, idx, dir);
    if (r) await reordenar(r);
  }

  // Visibilidad por colapso
  const visibles: { f: FilaGG; i: number }[] = [];
  let ocultoHasta = -1;
  filas.forEach((f, i) => {
    if (i < ocultoHasta) return;
    visibles.push({ f, i });
    if (f.nivel !== "item" && cerrados.has(f.id)) ocultoHasta = finBloqueGG(filas, i);
  });

  const celda = "h-6 w-full rounded border border-transparent bg-transparent px-1 text-xs tabular-nums hover:border-line focus:border-primary focus:outline-none disabled:hover:border-transparent";

  return (
    <VentanaFlotante titulo="Gastos generales" subtitulo="Desagregado de gastos generales de la cotización" abierta={abierta} onCerrar={onCerrar} ancho="max-w-[calc(100vw-1rem)]" ocultarBarra pantallaCompleta>
      <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="grid shrink-0 grid-cols-3 gap-3">
        {[
          ["Costo directo", fmt(costoDirecto), ""],
          ["Total gastos generales", fmt(total), ""],
          ["% Gastos generales", `${pct.toFixed(2)} %`, "text-primary"],
        ].map(([t, v, c]) => (
          <div key={t} className="rounded-md border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t}</div>
            <div className={cn("mt-1 text-xl font-semibold tabular-nums", c)}>{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5">Duración del proyecto (meses)
          <input key={"d" + duracionMeses} type="number" min={0.5} step="0.5" defaultValue={duracion} disabled={soloLectura}
            className="h-6 w-20 rounded border px-1 text-right tabular-nums"
            onBlur={(e) => { const v = Number(e.target.value || 0); setDuracion(v); void cambiarDuracion(v); }} />
        </label>
        <label className="flex items-center gap-1.5">% Utilidad
          <input key={"u" + pctUtilidad} type="number" min={0} step="0.01" defaultValue={util} disabled={soloLectura}
            className="h-6 w-20 rounded border px-1 text-right tabular-nums"
            onBlur={(e) => { const v = Math.round(Number(e.target.value || 0) * 100) / 100; setUtil(v); if (v !== pctUtilidad) void guardarCot({ pct_utilidad: v }); }} />
        </label>
        <label className="flex items-center gap-1.5">% IGV
          <select value={aplicaIgv ? "18" : "0"} disabled={soloLectura} className="h-6 rounded border px-1"
            onChange={(e) => void guardarCot({ aplica_igv: e.target.value === "18" })}>
            <option value="18">18.00</option><option value="0">0.00</option>
          </select>
        </label>
        <div className="ml-auto flex items-center gap-3">
          {!soloLectura && <button type="button" onClick={() => void cargarEstandar()} className="font-medium text-muted-foreground hover:text-foreground hover:underline">Cargar estructura estándar</button>}
          <Link to="/gg-vista" search={{ id: cotizacionId }} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Printer size={13} /> Generar reporte / Imprimir
          </Link>
        </div>
      </div>
      {total <= 0 && <p className="mt-2 text-xs text-muted-foreground">Mientras el total sea cero, la cotización conserva su % manual ({Number(pctActual).toFixed(2)} %).</p>}
      {soloLectura && <p className="mt-2 text-xs text-muted-foreground">Revisión histórica: solo lectura.</p>}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}

      <div className="mt-3 flex min-h-0 flex-1 gap-2">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div ref={tablaRef as unknown as React.RefObject<HTMLDivElement>}>
            <table className="w-full text-xs">
              <colgroup><col className="w-16" /><col /><col className="w-24" /><col className="w-20" /><col className="w-20" /><col className="w-28" /><col className="w-28" /></colgroup>
              <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase text-muted-foreground">
                  <tr><th className="px-2 py-1.5 text-left">Ítem</th><th className="px-1 text-left">Descripción</th><th className="px-1 text-left">Unidad</th><th className="px-1 text-right">Cantidad</th><th className="px-1 text-right">Tiempo (meses)</th><th className="px-1 text-right">Costo unitario</th><th className="px-2 text-right">Total</th></tr>
                </thead>
              <tbody>
              {(["fijo", "variable"] as const).map((tipo) => (
                <React.Fragment key={tipo}>
                  <tr className="border-t bg-card"><td colSpan={7} className="px-2 py-1.5"><div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide">{tipo === "fijo" ? "Tabla 1 · Gastos generales fijos (no relacionados con el tiempo)" : "Tabla 2 · Gastos generales variables (relacionados con la duración)"}</span>
                    {!soloLectura && <button type="button" onClick={() => void agregarFila(tipo)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><ListPlus size={13} /> Agregar fila</button>}
                  </div></td></tr>

                  {tipo === "fijo" && cargando && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Cargando…</td></tr>}
                  {visibles.filter(({ f }) => (f.tipo ?? "variable") === tipo).map(({ f, i }) => {
                    const enc = f.nivel !== "item";
                    const abierto = !cerrados.has(f.id);
                    return (
                      <tr key={f.id} onClick={() => setSel(f.id)} onDoubleClick={() => !soloLectura && enfocarFila(f.id)}
                        className={cn("h-[29px] border-t", f.nivel === "bloque" && "bg-muted/60 font-bold", f.nivel === "grupo" && "bg-muted/25 font-semibold", sel === f.id && "bg-primary/10")}>
                        <td className="px-2 font-mono">
                          <span className="inline-flex items-center gap-0.5">
                            {enc && (
                              <button type="button" className="text-muted-foreground" onClick={(e) => { e.stopPropagation(); setCerrados((s) => { const n = new Set(s); abierto ? n.add(f.id) : n.delete(f.id); return n; }); }}>
                                {abierto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              </button>
                            )}
                            {numeros.get(f.id)}
                          </span>
                        </td>
                        <td className="px-1">
                          <input data-fila-gg={f.id} aria-label={`Descripción ${numeros.get(f.id)}`} key={f.id + f.descripcion} defaultValue={f.descripcion} disabled={soloLectura}
                            className={cn(celda, f.nivel === "item" && "pl-3")}
                            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.descripcion) void editar(f.id, { descripcion: f.nivel === "bloque" ? v.toUpperCase() : v }); }} />
                        </td>
                        {enc ? (
                          <><td colSpan={4} /><td className="px-2 text-right tabular-nums">{fmt(subtotalGG(filas, i))}</td></>
                        ) : (
                          <>
                            <td className="px-1">
                              <select value={f.unidad} disabled={soloLectura} className={celda} onChange={(e) => void editar(f.id, { unidad: e.target.value })}>
                                {!unidades.some((u) => u.simbolo === f.unidad) && <option value={f.unidad}>{f.unidad}</option>}
                                {unidades.filter((u) => u.activo).map((u) => <option key={u.id} value={u.simbolo}>{u.simbolo}</option>)}
                              </select>
                            </td>
                            {(["cantidad", "tiempo", "precio_unitario"] as const).map((k) => k === "tiempo" && f.tipo === "fijo" ? (
                              <td key={k} className="px-1 text-right text-muted-foreground">N/A</td>
                            ) : (
                              <td key={k} className="px-1">
                                <input key={f.id + k + f[k]} type="number" step="0.0001" min={0} defaultValue={Number(f[k])} disabled={soloLectura}
                                  className={cn(celda, "text-right")}
                                  onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== Number(f[k])) void editar(f.id, k === "tiempo" ? { tiempo: v, tiempo_manual: true } : { [k]: v }); }} />
                              </td>
                            ))}
                            <td className="px-2 text-right tabular-nums">{fmt(parcialGG(f))}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                
                  <tr className="bg-muted font-bold"><td colSpan={6} className="px-2 py-1.5 text-right">TOTAL GASTOS GENERALES {tipo === "fijo" ? "FIJOS" : "VARIABLES"}</td><td className="px-2 text-right tabular-nums">{fmt(tipo === "fijo" ? fijos : variables)}</td></tr>
                </React.Fragment>
              ))}
              </tbody>
            </table>
          </div>
        </div>
        {!soloLectura && (
          <div className="sticky top-0 self-start"><BarraIconosHoja objeto="fila de gastos generales" haySeleccion={Boolean(sel)} onEditar={() => enfocarFila(sel)} onCopiar={copiar} onEliminar={eliminar}
            extras={<>
              <BotonIcono etiqueta="Agregar ítem" tono="primario" onClick={() => void agregar("item")}><ListPlus size={15} /></BotonIcono>
              <BotonIcono etiqueta="Agregar grupo" onClick={() => void agregar("grupo")}><FolderPlus size={15} /></BotonIcono>
              <BotonIcono etiqueta="Agregar bloque" onClick={() => void agregar("bloque")}><Rows3 size={15} /></BotonIcono>
              <div className="my-1 border-t border-line" />
              <BotonIcono etiqueta="Subir" disabled={!sel || !moverGG(filas, filas.findIndex((f) => f.id === sel), -1)} onClick={() => void mover(-1)}><ArrowUp size={15} /></BotonIcono>
              <BotonIcono etiqueta="Bajar" disabled={!sel || !moverGG(filas, filas.findIndex((f) => f.id === sel), 1)} onClick={() => void mover(1)}><ArrowDown size={15} /></BotonIcono>
            </>} /></div>
        )}
      </div>
      <div className="ml-auto mt-3 grid w-full max-w-4xl shrink-0 grid-cols-2 rounded-md border text-xs">
        {([
          ["Costo directo total", costoDirecto, ""],
          ["(+) Total gastos generales fijos", fijos, ""],
          ["(+) Total gastos generales variables", variables, ""],
          ["(=) Subtotal valor referencial del proyecto", res.subtotal, "font-semibold bg-muted/40"],
          [`(+) Margen de utilidad (${util.toFixed(2)} %)`, res.utilidad, ""],
          ["(=) Valor venta neto total", res.venta, "font-semibold bg-muted/40"],
          [`(+) IGV (${aplicaIgv ? "18.00" : "0.00"} %)`, res.igv, ""],
          ["(=) PRESUPUESTO FINAL TOTAL", res.total, "font-bold bg-muted text-primary"],
        ] as const).map(([t, v, c]) => (
          <div key={t} className={cn("flex justify-between border-b px-3 py-1", c)}><span>{t}</span><span className="tabular-nums">{fmt(v)}</span></div>
        ))}
      </div>
      </div>
    </VentanaFlotante>
  );
}

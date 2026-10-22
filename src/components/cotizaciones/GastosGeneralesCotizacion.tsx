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
  ESTRUCTURA_GG, finBloqueGG, moverGG, numerarGG, parcialGG, pctGG, subtotalGG, totalGG,
  type FilaGG, type NivelGG,
} from "@/lib/gastos-generales-cotizacion";

const db = supabase as unknown as { from: (t: string) => any };
const TABLA = "cotizacion_gastos_generales";

export function GastosGeneralesCotizacion({ abierta, onCerrar, cotizacionId, costoDirecto, pctActual, moneda, soloLectura }: {
  abierta: boolean; onCerrar: () => void; cotizacionId: string; costoDirecto: number; pctActual: number;
  moneda: string; soloLectura: boolean;
}) {
  const qc = useQueryClient();
  const { data: unidades = [] } = useUnidadesMedida();
  const [filas, setFilas] = useState<FilaGG[]>([]);
  const [cargando, setCargando] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const tablaRef = useRef<HTMLTableElement>(null);
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
    if (!rows.length && !soloLectura) {
      const { data: ins, error: e2 } = await db.from(TABLA)
        .insert(ESTRUCTURA_GG.map((x, i) => ({ cotizacion_id: cotizacionId, orden: i, nivel: x.nivel, descripcion: x.descripcion, unidad: x.unidad ?? "und-mes" })))
        .select("*");
      if (e2) setError(e2.message);
      rows = ((ins ?? []) as FilaGG[]).sort((a, b) => a.orden - b.orden);
    }
    setFilas(rows);
    setCargando(false);
  }
  useEffect(() => { if (abierta) void cargar(); }, [abierta, cotizacionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = totalGG(filas);
  const pct = pctGG(total, costoDirecto);
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
      .insert({ cotizacion_id: cotizacionId, orden: insertar, nivel, descripcion: nivel === "item" ? "Nuevo ítem" : nivel === "grupo" ? "Nuevo grupo" : "NUEVO BLOQUE", unidad: "und-mes" })
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
    <VentanaFlotante titulo="Gastos generales" subtitulo="Desagregado de gastos generales de la cotización" abierta={abierta} onCerrar={onCerrar} ancho="max-w-7xl">
      <div className="grid grid-cols-3 gap-3">
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
      <div className="mt-2 flex justify-end">
        <Link to="/gg-vista" search={{ id: cotizacionId }} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Printer size={13} /> Hoja impresa A4
        </Link>
      </div>
      {total <= 0 && <p className="mt-2 text-xs text-muted-foreground">Mientras el total sea cero, la cotización conserva su % manual ({Number(pctActual).toFixed(2)} %).</p>}
      {soloLectura && <p className="mt-2 text-xs text-muted-foreground">Revisión histórica: solo lectura.</p>}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}

      <div className="mt-3 flex gap-2">
        <div className="max-h-[60vh] min-w-0 flex-1 overflow-auto rounded-md border">
          <table ref={tablaRef} className="w-full text-xs">
            <colgroup><col className="w-16" /><col /><col className="w-24" /><col className="w-20" /><col className="w-20" /><col className="w-28" /><col className="w-28" /></colgroup>
            <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-1.5 text-left">Ítem</th><th className="px-1 text-left">Descripción</th><th className="px-1 text-left">Unidad</th><th className="px-1 text-right">Cantidad</th><th className="px-1 text-right">Tiempo</th><th className="px-1 text-right">P. unitario</th><th className="px-2 text-right">Parcial</th></tr>
            </thead>
            <tbody>
              {cargando && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Cargando…</td></tr>}
              {visibles.map(({ f, i }) => {
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
                        {(["cantidad", "tiempo", "precio_unitario"] as const).map((k) => (
                          <td key={k} className="px-1">
                            <input key={f.id + k + f[k]} type="number" step="0.0001" min={0} defaultValue={Number(f[k])} disabled={soloLectura}
                              className={cn(celda, "text-right")}
                              onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== Number(f[k])) void editar(f.id, { [k]: v }); }} />
                          </td>
                        ))}
                        <td className="px-2 text-right tabular-nums">{fmt(parcialGG(f))}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-muted font-bold">
              <tr><td colSpan={6} className="px-2 py-1.5 text-right">TOTAL GASTOS GENERALES</td><td className="px-2 text-right tabular-nums">{fmt(total)}</td></tr>
            </tfoot>
          </table>
        </div>
        {!soloLectura && (
          <BarraIconosHoja objeto="fila de gastos generales" haySeleccion={Boolean(sel)} onEditar={() => enfocarFila(sel)} onCopiar={copiar} onEliminar={eliminar}
            extras={<>
              <BotonIcono etiqueta="Agregar ítem" tono="primario" onClick={() => void agregar("item")}><ListPlus size={15} /></BotonIcono>
              <BotonIcono etiqueta="Agregar grupo" onClick={() => void agregar("grupo")}><FolderPlus size={15} /></BotonIcono>
              <BotonIcono etiqueta="Agregar bloque" onClick={() => void agregar("bloque")}><Rows3 size={15} /></BotonIcono>
              <div className="my-1 border-t border-line" />
              <BotonIcono etiqueta="Subir" disabled={!sel || !moverGG(filas, filas.findIndex((f) => f.id === sel), -1)} onClick={() => void mover(-1)}><ArrowUp size={15} /></BotonIcono>
              <BotonIcono etiqueta="Bajar" disabled={!sel || !moverGG(filas, filas.findIndex((f) => f.id === sel), 1)} onClick={() => void mover(1)}><ArrowDown size={15} /></BotonIcono>
            </>} />
        )}
      </div>
    </VentanaFlotante>
  );
}

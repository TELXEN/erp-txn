import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { Boton, Campo, Input, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Resaltar } from "@/components/Buscador";
import { MenuContextualApu, type AccionApu, type EstadoMenuApu } from "@/components/MenuContextualApu";
import { BANCOS_RECURSO, costoReceta, dbBanco, renumerarApu, useBancoTabla, useRecursosApu, type FilaCalculo, type RecursosApu } from "@/lib/banco-apu";
import { r2, sumar2 } from "@/lib/decimal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Cotizacion, CotizacionItem } from "@/lib/cotizaciones";

export const GRUPOS_RECURSO: [string, string][] = [
  ["MO", "MANO DE OBRA"],
  ["MAT", "MATERIALES"],
  ["EQ", "EQUIPO"],
  ["SC", "SUBCONTRATOS"],
];

type Pestana = "acu" | "esp";

const num = (n: number, d = 2) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Celda numérica editable al estilo de la grilla del Banco APU (Enter o salir guarda). */
function CeldaNum({ valor, dec, onGuardar, sufijo, deshabilitado }: {
  valor: number; dec: number; onGuardar?: (v: number) => void; sufijo?: string; deshabilitado?: boolean;
}) {
  if (deshabilitado || !onGuardar)
    return (
      <div className="flex h-6 items-center justify-end font-mono text-[11px] text-muted-foreground">
        {valor.toFixed(dec)}{sufijo ? <span className="ml-0.5 w-6 shrink-0">{sufijo}</span> : null}
      </div>
    );
  return (
    <div className="flex items-center">
      <input key={valor.toFixed(dec)} type="number" step="any" defaultValue={valor.toFixed(dec)}
        className="h-6 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-0.5 text-right font-mono text-[11px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none hover:border-line focus:border-primary focus:bg-background"
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== Number(valor.toFixed(dec))) onGuardar(v); }} />
      {sufijo ? <span className="ml-0.5 w-6 shrink-0 text-muted-foreground">{sufijo}</span> : null}
    </div>
  );
}

/** Panel derecho: APU propio de la partida de la cotización (copia fija, independiente del banco). Misma grilla que el Banco APU. */
export function PanelApuCotizacion({ cot, item }: { cot: Cotizacion; item: CotizacionItem | null }) {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const recursos = useRecursosApu();
  const { data: detalle = [] } = useBancoTabla("cotizacion_apu_detalle");
  const [pestana, setPestana] = useState<Pestana>("acu");
  const [aviso, setAviso] = useState("");
  const [rendLocal, setRendLocal] = useState<number | null>(null);
  const [editJornada, setEditJornada] = useState(false);
  const [jornadaLocal, setJornadaLocal] = useState<number | null>(null);
  const [pctHt, setPctHt] = useState(5);
  const [menu, setMenu] = useState<(EstadoMenuApu & { t: string; f: FilaCalculo | undefined }) | null>(null);
  const [agregar, setAgregar] = useState<{ t: string; orden: number } | null>(null);
  const cerrarMenu = useCallback(() => setMenu(null), []);
  const sim = cot.moneda === "USD" ? "US$" : "S/";
  const factor = cot.moneda === "USD" ? 1 / (Number(cot.tipo_cambio) || 1) : 1;

  const propias = useMemo(() => (item ? detalle.filter((d) => d.cotizacion_item_id === item.id) : []), [detalle, item]);
  const rend = rendLocal ?? (Number(item?.rendimiento ?? 1) || 1);
  const jornada = editJornada ? (jornadaLocal ?? (Number(item?.jornada ?? 8) || 8)) : 8;
  const calc = costoReceta(propias, recursos, rend, jornada);
  const totalMo = sumar2(calc.filas.filter((f) => f.tipo === "MO").map((f) => f.parcial));
  // Herramientas manuales: % editable sobre la mano de obra (defecto 5 %); solo si hay MO.
  const htVisible = totalMo > 0;
  const htTotal = htVisible ? r2((totalMo * pctHt) / 100) : 0;

  useEffect(() => {
    setAviso("");
    setRendLocal(null);
    setJornadaLocal(null);
    setEditJornada(false);
    setPctHt(Number((item as { pct_herramientas?: number } | null)?.pct_herramientas ?? 5));
  }, [item?.id, (item as { pct_herramientas?: number } | null)?.pct_herramientas]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item)
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Selecciona una partida de la hoja para ver su análisis de precio unitario.
      </div>
    );

  const it = item;
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", "cotizacion_apu_detalle"] });
  const refrescarItem = () => qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });

  /** Recalcula el P.U. local (incluye herramientas manuales) y lo guarda en la partida de la cotización. */
  async function aplicarPu(filas: unknown[], r = rend, j = jornada, pct = pctHt) {
    const c = costoReceta(filas, recursos, r, j);
    const mo = sumar2(c.filas.filter((f) => f.tipo === "MO").map((f) => f.parcial));
    const pu = Math.round((c.total + r2((mo * pct) / 100)) * 10000) / 10000;
    await dbBanco.from("cotizacion_items").update({ precio_unitario: pu }).eq("id", it.id);
    await refrescarItem();
  }

  async function guardarRend(v: number) {
    if (!(v > 0)) return setRendLocal(null);
    setRendLocal(v);
    await dbBanco.from("cotizacion_items").update({ rendimiento: v }).eq("id", it.id);
    await aplicarPu(propias, v);
  }

  async function guardarJornada(v: number) {
    if (!(v > 0 && v <= 24)) return;
    setJornadaLocal(v);
    await dbBanco.from("cotizacion_items").update({ jornada: v }).eq("id", it.id);
    await aplicarPu(propias, rend, v);
  }

  async function guardarPctHt(v: number) {
    if (!(v >= 0)) return;
    setPctHt(v);
    await dbBanco.from("cotizacion_items").update({ pct_herramientas: v }).eq("id", it.id);
    await aplicarPu(propias, rend, jornada, v);
  }

  async function actualizar(f: FilaCalculo, campo: "cantidad_o_cuadrilla" | "precio_unitario", v: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cambios: any = { [campo]: v };
    // Al editar, la fila queda con copia fija aunque viniera del banco.
    if (f.d.precio_unitario === null || f.d.precio_unitario === undefined) {
      cambios.descripcion = f.nombre;
      cambios.unidad = f.und;
      cambios.tipo_recurso = f.tipo;
      if (campo !== "precio_unitario") cambios.precio_unitario = f.esPctMo ? f.cu : Math.round(f.cu * 10000) / 10000;
    }
    const { error } = await dbBanco.from("cotizacion_apu_detalle").update(cambios).eq("id", f.d.id);
    if (error) return setAviso(error.message);
    await aplicarPu(propias.map((d) => (d.id === f.d.id ? { ...d, ...cambios } : d)));
    await refrescar();
  }

  async function quitar(id: string) {
    await dbBanco.from("cotizacion_apu_detalle").delete().eq("id", id);
    await aplicarPu(propias.filter((d) => d.id !== id));
    await refrescar();
  }

  function abrirMenu(e: React.MouseEvent, t: string, f: FilaCalculo | undefined, habilitadas: EstadoMenuApu["habilitadas"]) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, t, f, habilitadas });
  }
  async function accionMenu(a: AccionApu, m: NonNullable<typeof menu>) {
    const { t, f } = m;
    if (a === "eliminar") return f && quitar(f.d.id as string);
    if (a === "final" || a === "encima" || a === "debajo") {
      const mapa = await renumerarApu("cotizacion_apu_detalle", propias as { id: string; orden?: number }[]);
      const filasG = calc.filas.filter((x) => x.tipo === t);
      let orden = 10;
      if (a === "final" && filasG.length) orden = (mapa.get(filasG[filasG.length - 1]!.d.id as string) ?? filasG.length * 10) + 10;
      else if (f) orden = (mapa.get(f.d.id as string) ?? 0) + (a === "encima" ? -5 : 5);
      setAgregar({ t, orden });
      return;
    }
    if (!f) return;
    const mapa = await renumerarApu("cotizacion_apu_detalle", propias as { id: string; orden?: number }[]);
    const base = mapa.get(f.d.id as string) ?? 0;
    const filasG = calc.filas.filter((x) => x.tipo === t);
    const i = filasG.findIndex((x) => x.d.id === f.d.id);
    const v = filasG[a === "subir" ? i - 1 : i + 1];
    if (v) {
      const ov = mapa.get(v.d.id as string) ?? 0;
      await Promise.all([
        dbBanco.from("cotizacion_apu_detalle").update({ orden: ov }).eq("id", f.d.id),
        dbBanco.from("cotizacion_apu_detalle").update({ orden: base }).eq("id", v.d.id),
      ]);
    }
    await refrescar();
  }

  async function exportar() {
    if (!propias.length) return setAviso("La partida no tiene recursos para exportar.");
    const filasBanco = propias.map((d) => {
      const horaria = d.mano_obra_id || (d.equipo_id && d.unidad === "H-M");
      return {
        material_id: d.material_id, mano_obra_id: d.mano_obra_id, equipo_id: d.equipo_id, subcontrato_id: d.subcontrato_id,
        cantidad_o_cuadrilla: Number(d.cantidad_o_cuadrilla) || 0,
        _horaria: horaria,
      };
    });
    const actualizarOrigen = Boolean((it as { partida_apu_id?: string | null }).partida_apu_id) && window.confirm(
      "¿Actualizar la receta original del Banco APU con las cantidades de esta cotización?\n\nAceptar: actualiza la receta original (los precios del banco no cambian).\nCancelar: te ofrecerá guardarla como partida maestra nueva.",
    );
    let destino = actualizarOrigen ? ((it as { partida_apu_id?: string | null }).partida_apu_id as string) : null;
    if (!destino) {
      if (!window.confirm(`¿Guardar «${it.nombre}» como nueva partida maestra en el Banco APU?`)) return;
      const { data, error } = await dbBanco.from("partidas_apu").insert({
        codigo_jerarquico: it.codigo ?? "", descripcion: it.nombre, unidad: it.unidad, rendimiento_diario: rend,
        especialidad: it.especialidad ?? "", estado: "activo",
      }).select("id").single();
      if (error) return setAviso(error.message);
      destino = data.id as string;
      await dbBanco.from("cotizacion_items").update({ partida_apu_id: destino }).eq("id", it.id);
    } else {
      const { error } = await dbBanco.from("partida_detalle").delete().eq("partida_padre_id", destino);
      if (error) return setAviso(error.message);
    }
    const { error: e2 } = await dbBanco.from("partida_detalle").insert(
      filasBanco.map(({ _horaria, ...f }, i) => ({ ...f, partida_padre_id: destino, orden: (i + 1) * 10 })),
    );
    if (e2) return setAviso(e2.message);
    qc.invalidateQueries({ queryKey: ["banco_apu"] });
    qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
    setAviso(actualizarOrigen ? "Receta del banco actualizada." : "Guardada como nueva partida maestra.");
  }

  const puedeExportar = rol === "gerente" || rol === "administrador";
  const th = "h-[30px] !py-0 border-r border-line px-1 text-[10px] font-semibold uppercase text-foreground/80 whitespace-nowrap last:border-r-0";
  const td = "h-[26px] !py-0 leading-none border-r border-line/70 px-1 align-middle text-[11px] whitespace-nowrap";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {menu && <MenuContextualApu menu={menu} onCerrar={cerrarMenu} onAccion={(a) => void accionMenu(a, menu)} />}
      {agregar && (
        <DialogoAgregarInsumoCot tipo={agregar.t} orden={agregar.orden} itemId={it.id} nombrePartida={it.nombre}
          recursos={recursos} existentes={propias}
          onCerrar={() => setAgregar(null)}
          onGuardado={async (nuevas) => { setAgregar(null); await aplicarPu(nuevas); await refrescar(); }} />
      )}
      <div className="border-b border-line px-3 py-2">
        <p className="truncate text-xs font-semibold text-ink" title={it.nombre}>{it.codigo} · {it.nombre}</p>
      </div>

      {pestana === "acu" && (
        <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-line bg-muted/50 px-4 py-2 text-[13px] shadow-sm">
          <label className="flex items-center gap-2"><span className="font-bold text-foreground/80">Rend. diario</span>
            <input key={`${it.id}:${rend}`} type="number" step="0.01" defaultValue={rend.toFixed(2)}
              className="h-7 w-24 rounded border border-line bg-warn/20 px-2 text-right font-mono outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              onBlur={(e) => { const v = Number(e.target.value); if (v !== rend) void guardarRend(v); }} />
            <span className="text-muted-foreground">{it.unidad}/día</span></label>
          <label className="flex items-center gap-2"><span className="font-bold text-foreground/80">Jornada</span>
            <input key={`jor:${it.id}:${jornada}`} type="number" step="0.5" min="1" max="24" defaultValue={jornada.toFixed(2)} readOnly={!editJornada} disabled={!editJornada}
              className={`h-7 w-16 rounded border border-line px-2 text-right font-mono outline-none ${editJornada ? "bg-warn/20 focus:border-primary" : "bg-muted text-muted-foreground"}`}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v <= 24 && v !== jornada) void guardarJornada(v); }} />
            <span className="text-muted-foreground">h/día</span>
            <input type="checkbox" checked={editJornada} onChange={(e) => setEditJornada(e.target.checked)} title="Editar jornada"
              className="h-4 w-4 cursor-pointer accent-primary" /></label>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">Metrado: {num(Number(it.metrado))} {it.unidad}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {pestana === "acu" && (
          <>
            <table className="w-full table-fixed border-collapse">
              <colgroup><col style={{ width: 74 }} /><col /><col style={{ width: 34 }} /><col style={{ width: 52 }} /><col style={{ width: 78 }} /><col style={{ width: 50 }} /><col style={{ width: 62 }} /></colgroup>
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-line">
                  <th className={`${th} text-left`}>Código</th><th className={`${th} text-left`}>Descripción</th><th className={`${th} text-center`}>Unid.</th>
                  <th className={`${th} text-right`}>Recurso</th><th className={`${th} text-right`}>Cantidad</th>
                  <th className={`${th} text-right`}>Precio</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {GRUPOS_RECURSO.map(([t, titulo]) => {
                  const filas = calc.filas.filter((f) => f.tipo === t);
                  const sub = sumar2(filas.map((f) => f.parcial)) + (t === "EQ" ? htTotal : 0);
                  return [
                    <tr key={t} className="border-b border-line bg-muted/60"
                      onContextMenu={(e) => abrirMenu(e, t, undefined, { final: true })}>
                       <td colSpan={6} className={`${td} font-bold text-foreground/80`}>▾ {titulo}</td>
                      <td className={`${td} text-right font-mono font-bold`}>{num(sub)}</td>
                    </tr>,
                    ...filas.map((f, i) => {
                      const horaria = f.tipo === "MO" || (f.tipo === "EQ" && f.und === "H-M");
                      const hh = horaria ? (f.cantidad * jornada) / rend : f.cantidad;
                      return (
                        <tr key={f.d.id} className="border-b border-line/70 hover:bg-primary/5"
                          onContextMenu={(e) => abrirMenu(e, t, f, { encima: true, debajo: true, final: true, subir: i > 0, bajar: i < filas.length - 1, eliminar: true })}>
                          <td className={`${td} font-mono text-[11px] text-muted-foreground`}><span className="block truncate" title={f.d.codigo ?? ""}>{f.d.codigo || "—"}</span></td>
                          <td className={td}><span className="block min-w-0 truncate" title={f.nombre}>{f.nombre}</span></td>
                          <td className={`${td} text-center text-muted-foreground`}>{f.esPctMo ? "%…" : f.und}</td>
                          <td className={td}>{f.esPctMo ? null : <CeldaNum valor={f.cantidad} dec={2} deshabilitado={!horaria} onGuardar={(v) => void actualizar(f, "cantidad_o_cuadrilla", v)} />}</td>
                          <td className={td}>
                            {f.esPctMo
                              ? <CeldaNum valor={f.cu} dec={2} sufijo="%mo" onGuardar={(v) => void actualizar(f, "precio_unitario", v)} />
                              : horaria
                                ? <CeldaNum valor={hh} dec={4} sufijo={f.und.toLowerCase()} deshabilitado />
                                : <CeldaNum valor={f.cantidad} dec={4} sufijo={f.und.toLowerCase()} onGuardar={(v) => void actualizar(f, "cantidad_o_cuadrilla", v)} />}
                          </td>
                          <td className={td}>
                            {f.esPctMo
                              ? <div className="flex h-6 items-center justify-end font-mono text-[11px] text-muted-foreground">{num(totalMo)}</div>
                              : <CeldaNum valor={f.cu} dec={4} onGuardar={(v) => void actualizar(f, "precio_unitario", v)} />}
                          </td>
                          <td className={`${td} text-right font-mono`}>{num(f.parcial)}</td>
                        </tr>
                      );
                    }),
                    ...(t === "EQ" && htVisible ? [
                      <tr key="ht" className="border-b border-line/70 bg-warn/5">
                        <td className={`${td} font-mono text-[11px] text-muted-foreground`}>HT</td>
                        <td className={td}><span className="block min-w-0 truncate italic text-foreground/80" title="Herramientas manuales">Herramientas manuales</span></td>
                        <td className={`${td} text-center text-muted-foreground`}>%…</td>
                        <td className={td}></td>
                        <td className={td}><CeldaNum valor={pctHt} dec={2} sufijo="%mo" onGuardar={(v) => void guardarPctHt(v)} /></td>
                        <td className={`${td} text-right font-mono`}>{num(totalMo)}</td>
                        <td className={`${td} text-right font-mono`}>{num(htTotal)}</td>
                      </tr>,
                    ] : []),
                  ];
                })}
              </tbody>
            </table>
            {!propias.length && <p className="px-3 py-4 text-xs text-muted-foreground">Esta partida aún no tiene APU. Haz clic derecho sobre un grupo (Mano de Obra, Materiales…) para agregar insumos.</p>}
          </>
        )}
        {pestana === "esp" && <Especificaciones item={it} />}
      </div>

      {pestana === "acu" && (
        <div className="flex shrink-0 items-center justify-end gap-4 border-t border-line bg-muted/30 px-4 py-2">
          <span className="text-[15px] font-bold">Costo total del APU</span>
          <span className="font-mono text-[15px] font-bold text-primary">{sim} {num(calc.total + htTotal)}</span>
        </div>
      )}
      {aviso && <p className="border-t border-line px-3 py-1 text-[11px] text-muted-foreground">{aviso}</p>}
      {puedeExportar && pestana === "acu" && (
        <div className="flex justify-end border-t border-line px-2 py-1.5">
          <Boton variante="linea" onClick={() => void exportar()}><Upload size={12} /> Exportar al Banco Maestro</Boton>
        </div>
      )}
      <div className="flex border-t border-line bg-muted/40 text-[11px]">
        {([["acu", "Análisis de costo unitario"], ["esp", "Especificaciones técnicas"]] as [Pestana, string][]).map(([p, t]) => (
          <button key={p} type="button" onClick={() => setPestana(p)}
            className={`flex-1 truncate border-t-2 px-2 py-1.5 ${pestana === p ? "border-primary bg-card font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-primary"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Especificaciones({ item }: { item: CotizacionItem }) {
  const qc = useQueryClient();
  const inicial = (item as { especificaciones?: string }).especificaciones ?? "";
  return (
    <textarea data-formato="oracion" key={item.id} defaultValue={inicial} placeholder="Especificaciones técnicas de la partida…"
      className="h-full min-h-60 w-full resize-none bg-transparent p-3 text-xs outline-none"
      onBlur={async (e) => {
        if (e.target.value === inicial) return;
        await dbBanco.from("cotizacion_items").update({ especificaciones: e.target.value }).eq("id", item.id);
        qc.invalidateQueries({ queryKey: ["cotizacion_items", item.cotizacion_id] });
      }} />
  );
}


/** Pie: incidencia por tipo de recurso y resumen de costos de toda la cotización. */
export function ResumenCotizacion({ cot, items }: { cot: Cotizacion; items: CotizacionItem[] }) {
  const qc = useQueryClient();
  const recursos = useRecursosApu();
  const { data: detalle = [] } = useBancoTabla("cotizacion_apu_detalle");
  const sim = cot.moneda === "USD" ? "US$" : "S/";

  async function cambiarPct(campo: "pct_gastos_generales" | "pct_utilidad", valor: number, actual: number) {
    if (valor === actual) return;
    await supabase.from("cotizaciones").update({ [campo]: valor } as never).eq("id", cot.id);
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    qc.invalidateQueries({ queryKey: ["cotizacion"] });
  }
  const hojas = items.filter((i) => i.tipo !== "grupo" && !items.some((h) => h.padre_id === i.id));
  const porTipo: { [k: string]: number; OTROS: number } = { MO: 0, MAT: 0, EQ: 0, SC: 0, OTROS: 0 };
  let cd = 0;
  for (const i of hojas) {
    const m = Number(i.metrado || 0);
    const parcial = m * Number(i.precio_unitario || 0);
    cd += parcial;
    const propias = detalle.filter((d) => d.cotizacion_item_id === i.id);
    if (!propias.length) { porTipo.OTROS += parcial; continue; }
    const c = costoReceta(propias, recursos, Number(i.rendimiento ?? 1), Number(i.jornada ?? 8));
    for (const f of c.filas) porTipo[f.tipo in porTipo ? f.tipo : "OTROS"]! += f.parcial * m;
    porTipo.OTROS += parcial - c.total * m;
  }
  const gg = (cd * Number(cot.pct_gastos_generales || 0)) / 100;
  const ut = (cd * Number(cot.pct_utilidad || 0)) / 100;
  const parcialT = cd + gg + ut;
  const igv = cot.aplica_igv === false ? 0 : parcialT * 0.18;
  const filasInc = [...GRUPOS_RECURSO, ["OTROS", "SIN APU"] as [string, string]].filter(([t]) => t !== "OTROS" || Math.abs(porTipo.OTROS) > 0.005);
  return (
    <div className="grid gap-2 border-t border-line bg-card p-2 font-mono text-[11px] md:grid-cols-2">
      <table className="w-full">
        <thead><tr className="text-left text-[10px] uppercase text-muted-foreground"><th className="px-2 font-medium">Tipo de costo</th><th className="px-2 text-right font-medium">% Partic.</th><th className="px-2 text-right font-medium">Subtotal</th></tr></thead>
        <tbody>
          {filasInc.map(([t, n]) => (
            <tr key={t} className="border-b border-line/40">
              <td className="px-2 py-0.5">{n}</td>
              <td className="px-2 py-0.5 text-right">{cd ? num((porTipo[t]! / cd) * 100) : "0.00"}%</td>
              <td className="px-2 py-0.5 text-right">{sim} {num(porTipo[t]!)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full">
        <tbody>
          <tr className="border-b border-line/40"><td className="px-2 py-0.5">Costo directo</td><td className="px-2 py-0.5 text-right">{sim} {num(cd)}</td></tr>
          {([
            ["Gastos generales", "pct_gastos_generales", gg],
            ["Utilidad", "pct_utilidad", ut],
          ] as [string, "pct_gastos_generales" | "pct_utilidad", number][]).map(([n, campo, v]) => (
            <tr key={campo} className="border-b border-line/40">
              <td className="px-2 py-0.5">
                <span className="inline-flex items-center gap-1">
                  {n}
                  <input
                    key={`${cot.id}-${campo}-${cot[campo]}`}
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={Number(cot[campo])}
                    title={`% de ${n.toLowerCase()} aplicado sobre el costo directo`}
                    onBlur={(e) => void cambiarPct(campo, Number(e.target.value || 0), Number(cot[campo]))}
                    className="w-12 rounded border border-line bg-background px-1 py-0 text-right outline-none focus:border-primary"
                  />
                  %
                </span>
              </td>
              <td className="px-2 py-0.5 text-right">{sim} {num(v)}</td>
            </tr>
          ))}
          <tr className="border-b border-line/40"><td className="px-2 py-0.5">Monto parcial</td><td className="px-2 py-0.5 text-right">{sim} {num(parcialT)}</td></tr>
          <tr className="border-b border-line/40"><td className="px-2 py-0.5">IGV {cot.aplica_igv === false ? 0 : 18}%</td><td className="px-2 py-0.5 text-right">{sim} {num(igv)}</td></tr>
          <tr className="font-semibold text-primary"><td className="px-2 py-1">TOTAL</td><td className="px-2 py-1 text-right">{sim} {num(parcialT + igv)}</td></tr>
          {cot.moneda === "USD" && Number(cot.tipo_cambio) > 0 && (
            <tr className="text-muted-foreground"><td className="px-2 py-0.5">Equivalente en soles</td><td className="px-2 py-0.5 text-right">S/ {num((parcialT + igv) * Number(cot.tipo_cambio))}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Buscador de insumos del banco para agregar al APU de la cotización (menú contextual). */
function DialogoAgregarInsumoCot({ tipo, orden, itemId, nombrePartida, recursos, existentes, onCerrar, onGuardado }: {
  tipo: string; orden: number; itemId: string; nombrePartida: string; recursos: RecursosApu;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existentes: any[]; onCerrar: () => void; onGuardado: (nuevas: any[]) => void | Promise<void>;
}) {
  const found = BANCOS_RECURSO.find((b) => b[3] === tipo);
  const [col, tabla, titulo] = found ?? ["material_id", "materiales", "Materiales"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opciones = ((recursos[tabla as keyof RecursosApu] ?? []) as any[]).filter((x) => x.estado !== "inactivo");
  const [q, setQ] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [elegido, setElegido] = useState<any | null>(null);
  const [cant, setCant] = useState("");
  const [error, setError] = useState("");
  const lista = opciones
    .filter((o) => `${o.codigo ?? ""} ${o.descripcion ?? ""} ${o.marca ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 50);

  async function guardar() {
    if (!elegido) return setError("Elige un insumo.");
    const n = Number(cant);
    if (!(n > 0)) return setError("Ingresa la cantidad / cuadrilla (mayor que 0).");
    const ya = existentes.find((d) => d[col] === elegido.id);
    if (ya) {
      if (!window.confirm(`«${elegido.descripcion}» ya está en el APU. ¿Sumar ${n} a su cantidad actual (${ya.cantidad_o_cuadrilla})?`)) return;
      const { error: e } = await dbBanco.from("cotizacion_apu_detalle").update({ cantidad_o_cuadrilla: Number(ya.cantidad_o_cuadrilla) + n }).eq("id", ya.id);
      if (e) return setError(e.message);
      await onGuardado(existentes.map((d) => (d.id === ya.id ? { ...d, cantidad_o_cuadrilla: Number(ya.cantidad_o_cuadrilla) + n } : d)));
      return;
    }
    const fila = { cotizacion_item_id: itemId, [col]: elegido.id, cantidad_o_cuadrilla: n, orden };
    const { error: e } = await dbBanco.from("cotizacion_apu_detalle").insert(fila);
    if (e) return setError(e.message);
    await onGuardado([...existentes, fila]);
  }

  return (
    <VentanaFlotante abierta onCerrar={onCerrar} ancho="max-w-xl" titulo={`Agregar — ${titulo}`} subtitulo={nombrePartida}>
      {!elegido ? (
        <div className="p-5">
          <Input autoFocus placeholder="Busca por código, descripción o marca…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-line">
            {lista.length === 0 && <Vacio texto="Sin coincidencias." />}
            {lista.map((o) => (
              <button key={o.id} type="button" onClick={() => setElegido(o)}
                className="flex w-full items-center gap-2 border-b border-line/60 px-3 py-1.5 text-left text-xs hover:bg-primary/10">
                <span className="w-24 shrink-0 font-mono text-muted-foreground">{o.codigo ?? ""}</span>
                <span className="min-w-0 flex-1 truncate"><Resaltar texto={o.descripcion ?? ""} termino={q} /></span>
                {o.marca && <span className="shrink-0 text-muted-foreground">{o.marca}</span>}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-bad">{error}</p>}
        </div>
      ) : (
        <form className="space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{elegido.codigo ?? ""} · {elegido.descripcion}{elegido.marca ? ` · ${elegido.marca}` : ""}</span>
            <Boton type="button" variante="linea" className="py-1" onClick={() => setElegido(null)}>Cambiar</Boton>
          </div>
          <Campo etiqueta="Cantidad / Cuadrilla">
            <Input autoFocus type="number" step="any" value={cant} onChange={(e) => setCant(e.target.value)} />
          </Campo>
          {error && <p className="text-xs text-bad">{error}</p>}
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="linea" onClick={onCerrar}>Cerrar</Boton>
            <Boton type="submit"><Plus size={13} /> Agregar</Boton>
          </div>
        </form>
      )}
    </VentanaFlotante>
  );
}

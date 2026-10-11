import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import { Boton, Select } from "@/components/ui-kit";
import { BANCOS_RECURSO, costoReceta, dbBanco, useBancoTabla, useRecursosApu, type FilaCalculo } from "@/lib/banco-apu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Cotizacion, CotizacionItem } from "@/lib/cotizaciones";

export const GRUPOS_RECURSO: [string, string][] = [
  ["MO", "MANO DE OBRA"],
  ["MAT", "MATERIALES"],
  ["EQ", "EQUIPO"],
  ["SC", "SUBCONTRATOS"],
];

type Pestana = "acu" | "esp" | "metrado" | "consolidado";
type LineaMetrado = { desc: string; veces: number; largo: number; ancho: number; alto: number };

const num = (n: number, d = 2) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Panel derecho: APU propio de la partida de la cotización (copia fija, independiente del banco). */
export function PanelApuCotizacion({ cot, item }: { cot: Cotizacion; item: CotizacionItem | null }) {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const recursos = useRecursosApu();
  const { data: detalle = [] } = useBancoTabla("cotizacion_apu_detalle");
  const [pestana, setPestana] = useState<Pestana>("acu");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [banco, setBanco] = useState(0);
  const [elegido, setElegido] = useState("");
  const [aviso, setAviso] = useState("");
  const sim = cot.moneda === "USD" ? "US$" : "S/";
  const factor = cot.moneda === "USD" ? 1 / (Number(cot.tipo_cambio) || 1) : 1;

  const propias = useMemo(() => (item ? detalle.filter((d) => d.cotizacion_item_id === item.id) : []), [detalle, item]);
  const rend = Number(item?.rendimiento ?? 1) || 1;
  const jornada = Number(item?.jornada ?? 8) || 8;
  const calc = costoReceta(propias, recursos, rend, jornada);

  useEffect(() => setAviso(""), [item?.id]);

  if (!item)
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Selecciona una partida de la hoja para ver su análisis de precio unitario.
      </div>
    );

  const it = item;
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", "cotizacion_apu_detalle"] });

  /** Recalcula el P.U. local y lo guarda en la partida de la cotización. */
  async function aplicarPu(filas: unknown[]) {
    const pu = Math.round(costoReceta(filas, recursos, rend, jornada).total * 10000) / 10000;
    await dbBanco.from("cotizacion_items").update({ precio_unitario: pu }).eq("id", it.id);
    await qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
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

  const [col, tabla, etiqueta, tipo] = BANCOS_RECURSO[banco]!;
  const opciones = (recursos[tabla as keyof typeof recursos] ?? []).filter((x) => x.estado === "activo");

  async function agregar() {
    const r = opciones.find((o) => o.id === elegido);
    if (!r) return;
    const pct = tabla === "equipos_herramientas" && r.unidad === "%";
    const base = tabla === "mano_obra" ? Number(r.costo_hora) : pct ? Number(r.costo_hora) : Number(r.costo_unitario);
    const fila = {
      cotizacion_item_id: it.id, [col]: r.id, cantidad_o_cuadrilla: 1,
      codigo: r.codigo ?? "", descripcion: r.descripcion ?? "", marca: r.marca ?? "", unidad: r.unidad ?? "", tipo_recurso: tipo,
      precio_unitario: pct ? base : Math.round(base * factor * 10000) / 10000,
    };
    const { data, error } = await dbBanco.from("cotizacion_apu_detalle").insert(fila).select("*").single();
    if (error) return setAviso(error.message);
    setElegido("");
    await aplicarPu([...propias, data]);
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
      const { error } = await dbBanco.from("partida_detalle").delete().eq("partida_padre_id", destino).is("subpartida_hijo_id", null);
      if (error) return setAviso(error.message);
    }
    const { error: e2 } = await dbBanco.from("partida_detalle").insert(
      filasBanco.map(({ _horaria, ...f }) => ({ ...f, partida_padre_id: destino })),
    );
    if (e2) return setAviso(e2.message);
    qc.invalidateQueries({ queryKey: ["banco_apu"] });
    qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
    setAviso(actualizarOrigen ? "Receta del banco actualizada." : "Guardada como nueva partida maestra.");
  }

  const puedeExportar = rol === "gerente" || rol === "administrador";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-3 py-2">
        <p className="truncate text-xs font-semibold text-ink" title={it.nombre}>{it.codigo} · {it.nombre}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
          <span>Rend.: {num(rend)} {it.unidad}/día</span>
          <span>Metrado: {num(Number(it.metrado))} {it.unidad}</span>
          <span className="ml-auto font-semibold text-primary">P.U. {sim} {num(calc.total)}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {pestana === "acu" && (
          <>
            <table className="w-full table-fixed font-mono text-[11px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="w-[13%] px-2 py-1.5 font-medium">Cod.</th>
                  <th className="w-[33%] px-1 py-1.5 font-medium">Descripción</th>
                  <th className="w-[8%] px-1 py-1.5 font-medium">Und.</th>
                  <th className="w-[11%] px-1 py-1.5 text-right font-medium">Recurso</th>
                  <th className="w-[12%] px-1 py-1.5 text-right font-medium">Cantidad</th>
                  <th className="w-[11%] px-1 py-1.5 text-right font-medium">Precio</th>
                  <th className="w-[12%] px-2 py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              {GRUPOS_RECURSO.map(([t, titulo]) => {
                const filas = calc.filas.filter((f) => f.tipo === t);
                if (!filas.length) return null;
                const sub = filas.reduce((s, f) => s + f.parcial, 0);
                const cerrado = cerrados.has(t);
                return (
                  <tbody key={t}>
                    <tr className="cursor-pointer bg-muted/60" onClick={() => setCerrados((p) => { const n = new Set(p); if (n.has(t)) n.delete(t); else n.add(t); return n; })}>
                      <td colSpan={6} className="px-2 py-1 font-semibold text-ink">
                        <span className="inline-flex items-center gap-1">{cerrado ? <ChevronRight size={11} /> : <ChevronDown size={11} />}{titulo}</span>
                      </td>
                      <td className="px-2 py-1 text-right font-semibold text-ink">{num(sub)}</td>
                    </tr>
                    {!cerrado && filas.map((f) => {
                      const horaria = f.tipo === "MO" || (f.tipo === "EQ" && f.und === "H-M");
                      const recurso = horaria ? (f.cantidad * jornada) / rend : f.cantidad;
                      return (
                        <tr key={f.d.id} className="group border-b border-line/40">
                          <td className="truncate px-2 py-1 text-muted-foreground">{f.d.codigo || "—"}</td>
                          <td className="truncate px-1 py-1 text-ink" title={f.nombre}>{f.nombre}</td>
                          <td className="px-1 py-1 text-muted-foreground">{f.und}</td>
                          <td className="px-1 py-1 text-right">{horaria ? num(f.cantidad) : ""}</td>
                          <td className="px-1 py-0.5">
                            <input key={`${f.d.id}-q-${f.cantidad}`} type="number" step="0.0001" defaultValue={Number(recurso.toFixed(4))}
                              className="w-full rounded border border-transparent bg-transparent px-1 text-right hover:border-line focus:border-primary focus:outline-none"
                              onBlur={(e) => {
                                const v = Number(e.target.value || 0);
                                const q = horaria ? (v * rend) / jornada : v;
                                if (Math.abs(q - f.cantidad) > 1e-9) void actualizar(f, "cantidad_o_cuadrilla", q);
                              }} />
                          </td>
                          <td className="px-1 py-0.5">
                            <input key={`${f.d.id}-p-${f.cu}`} type="number" step="0.01" defaultValue={Number(f.cu.toFixed(4))}
                              title={f.esPctMo ? "% sobre la mano de obra" : "Precio local de esta cotización"}
                              className="w-full rounded border border-transparent bg-transparent px-1 text-right hover:border-line focus:border-primary focus:outline-none"
                              onBlur={(e) => {
                                const v = Number(e.target.value || 0);
                                if (Math.abs(v - f.cu) > 1e-9) void actualizar(f, "precio_unitario", v);
                              }} />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <span className="group-hover:hidden">{num(f.parcial)}</span>
                            <button type="button" title="Quitar" onClick={() => void quitar(f.d.id)} className="hidden text-muted-foreground hover:text-bad group-hover:inline"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
            {!propias.length && <p className="px-3 py-4 text-xs text-muted-foreground">Esta partida aún no tiene APU. Elige la partida desde el banco en la hoja o agrega recursos abajo.</p>}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-2 py-2">
              <Select value={banco} onChange={(e) => { setBanco(Number(e.target.value)); setElegido(""); }} className="w-36 py-1 text-[11px]">
                {BANCOS_RECURSO.map(([, , t], i) => <option key={t} value={i}>{t}</option>)}
              </Select>
              <Select value={elegido} onChange={(e) => setElegido(e.target.value)} className="min-w-0 flex-1 py-1 text-[11px]">
                <option value="">{etiqueta}…</option>
                {opciones.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.descripcion}</option>)}
              </Select>
              <Boton onClick={() => void agregar()} disabled={!elegido}><Plus size={12} /> Agregar</Boton>
            </div>
          </>
        )}
        {pestana === "esp" && <Especificaciones item={it} />}
        {pestana === "metrado" && <Metrado item={it} cotId={cot.id} />}
        {pestana === "consolidado" && (
          <table className="w-full font-mono text-xs">
            <tbody>
              {GRUPOS_RECURSO.map(([t, titulo]) => {
                const sub = calc.filas.filter((f) => f.tipo === t).reduce((s, f) => s + f.parcial, 0);
                return (
                  <tr key={t} className="border-b border-line/50">
                    <td className="px-3 py-1.5">{titulo}</td>
                    <td className="px-3 py-1.5 text-right">{calc.total ? num((sub / calc.total) * 100) : "0.00"}%</td>
                    <td className="px-3 py-1.5 text-right">{sim} {num(sub)}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{sim} {num(sub * Number(it.metrado))}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td className="px-3 py-1.5">Costo unitario / Parcial</td>
                <td />
                <td className="px-3 py-1.5 text-right">{sim} {num(calc.total)}</td>
                <td className="px-3 py-1.5 text-right">{sim} {num(calc.total * Number(it.metrado))}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {aviso && <p className="border-t border-line px-3 py-1 text-[11px] text-muted-foreground">{aviso}</p>}
      {puedeExportar && pestana === "acu" && (
        <div className="flex justify-end border-t border-line px-2 py-1.5">
          <Boton variante="linea" onClick={() => void exportar()}><Upload size={12} /> Exportar al Banco Maestro</Boton>
        </div>
      )}
      <div className="flex border-t border-line bg-muted/40 text-[11px]">
        {([["acu", "Análisis de costo unitario"], ["esp", "Especificaciones técnicas"], ["metrado", "Metrado"], ["consolidado", "Consolidado de partida"]] as [Pestana, string][]).map(([p, t]) => (
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
    <textarea key={item.id} defaultValue={inicial} placeholder="Especificaciones técnicas de la partida…"
      className="h-full min-h-60 w-full resize-none bg-transparent p-3 text-xs outline-none"
      onBlur={async (e) => {
        if (e.target.value === inicial) return;
        await dbBanco.from("cotizacion_items").update({ especificaciones: e.target.value }).eq("id", item.id);
        qc.invalidateQueries({ queryKey: ["cotizacion_items", item.cotizacion_id] });
      }} />
  );
}

function Metrado({ item, cotId }: { item: CotizacionItem; cotId: string }) {
  const qc = useQueryClient();
  const guardado = ((item as { metrado_detalle?: LineaMetrado[] }).metrado_detalle ?? []) as LineaMetrado[];
  const [lineas, setLineas] = useState<LineaMetrado[]>(guardado);
  useEffect(() => setLineas(guardado), [item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const parcial = (l: LineaMetrado) => (l.veces || 0) * (l.largo || 1) * (l.ancho || 1) * (l.alto || 1);
  const total = lineas.reduce((s, l) => s + parcial(l), 0);
  const set = (i: number, k: keyof LineaMetrado, v: string) =>
    setLineas((p) => p.map((l, j) => (j === i ? { ...l, [k]: k === "desc" ? v : Number(v || 0) } : l)));
  async function guardar(aplicar: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cambios: any = { metrado_detalle: lineas };
    if (aplicar) cambios.metrado = Math.round(total * 10000) / 10000;
    await dbBanco.from("cotizacion_items").update(cambios).eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["cotizacion_items", cotId] });
  }
  return (
    <div className="p-2">
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-left text-[10px] uppercase text-muted-foreground">
            <th className="px-1 py-1 font-medium">Descripción</th>
            {["Veces", "Largo", "Ancho", "Alto", "Parcial"].map((h) => <th key={h} className="w-14 px-1 py-1 text-right font-medium">{h}</th>)}
            <th className="w-5" />
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i} className="border-b border-line/40">
              <td><input value={l.desc} onChange={(e) => set(i, "desc", e.target.value)} className="w-full bg-transparent px-1 outline-none" /></td>
              {(["veces", "largo", "ancho", "alto"] as const).map((k) => (
                <td key={k}><input type="number" value={l[k] || ""} onChange={(e) => set(i, k, e.target.value)} className="w-full bg-transparent px-1 text-right outline-none" /></td>
              ))}
              <td className="px-1 text-right">{num(parcial(l))}</td>
              <td><button type="button" onClick={() => setLineas((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-bad"><Trash2 size={11} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Boton variante="linea" onClick={() => setLineas((p) => [...p, { desc: "", veces: 1, largo: 0, ancho: 0, alto: 0 }])}><Plus size={12} /> Línea</Boton>
        <span className="ml-auto font-mono text-xs">Total: {num(total, 4)} {item.unidad}</span>
        <Boton variante="linea" onClick={() => void guardar(false)}>Guardar</Boton>
        <Boton onClick={() => void guardar(true)}>Aplicar al metrado</Boton>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Las medidas vacías cuentan como 1.</p>
    </div>
  );
}

/** Pie: incidencia por tipo de recurso y resumen de costos de toda la cotización. */
export function ResumenCotizacion({ cot, items }: { cot: Cotizacion; items: CotizacionItem[] }) {
  const qc = useQueryClient();
  const recursos = useRecursosApu();
  const { data: detalle = [] } = useBancoTabla("cotizacion_apu_detalle");
  const sim = cot.moneda === "USD" ? "US$" : "S/";
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

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Input, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { HojaOrdenCompra, imprimirOrdenCompra } from "@/components/HojaOrdenCompra";
import { useEmpresa } from "@/lib/empresa";
import { usePartidas, useTrabajadores } from "@/lib/datos";
import { num } from "@/lib/logistica";
import { soles } from "@/lib/format";

type Vale = { id: string; codigo: string; proyecto_id: string; trabajador_id: string; partida_id: string | null; fecha: string; observacion: string };
type ItemVale = { id: string; vale_id: string; descripcion: string; unidad: string; cantidad: number; costo_unitario: number };
type FilaStock = { proyecto_id: string | null; insumo_id: string | null; descripcion: string; unidad: string; stock: number };

const hoy = () => new Date().toISOString().slice(0, 10);
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: unknown) => any };

export function ValesSalida({ obras, nombreProy, stock, puedeEmitir }: {
  obras: string[]; nombreProy: (id: string | null) => string; stock: FilaStock[]; puedeEmitir: (pid: string) => boolean;
}) {
  const qc = useQueryClient();
  const { data: empresa } = useEmpresa();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: partidas = [] } = usePartidas();
  const { data: vales = [] } = useQuery({ queryKey: ["vales_salida"], queryFn: async () => ((await db.from("vales_salida").select("*").order("created_at", { ascending: false })).data ?? []) as Vale[] });
  const { data: items = [] } = useQuery({ queryKey: ["vales_salida_items"], queryFn: async () => ((await db.from("vales_salida_items").select("*")).data ?? []) as ItemVale[] });
  const [f, setF] = useState({ obra: "", trabajador: "", fecha: "" });
  const [nuevo, setNuevo] = useState<{ obra: string; trabajador: string; busq: string; partida: string; obs: string; lineas: { insumo_id: string; cantidad: string }[]; error: string } | null>(null);
  const [vista, setVista] = useState<Vale | null>(null);
  const hoja = useRef<HTMLDivElement>(null);

  const activos = trabajadores.filter((t) => t.activo);
  const trab = (id: string) => trabajadores.find((t) => t.id === id);
  const partidasObra = (pid: string) => partidas.filter((p) => p.proyecto_id === pid && !partidas.some((h) => h.padre_id === p.id));
  const nomPartida = (id: string | null) => { const p = partidas.find((x) => x.id === id); return p ? `${p.codigo ?? ""} ${p.nombre}`.trim() : "—"; };
  const visibles = vales.filter((v) => (!f.obra || v.proyecto_id === f.obra) && (!f.trabajador || v.trabajador_id === f.trabajador) && (!f.fecha || v.fecha === f.fecha));
  const stockObra = useMemo(() => (nuevo ? stock.filter((s) => s.proyecto_id === nuevo.obra && s.insumo_id && s.stock > 0.0001) : []), [nuevo, stock]);

  async function emitir(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo) return;
    if (!nuevo.obra) return setNuevo({ ...nuevo, error: "Elige el almacén de obra." });
    if (!nuevo.trabajador) return setNuevo({ ...nuevo, error: "Elige al trabajador que recibe." });
    const lineas = nuevo.lineas.filter((l) => l.insumo_id && Number(l.cantidad) > 0);
    if (!lineas.length) return setNuevo({ ...nuevo, error: "Agrega al menos un insumo con cantidad." });
    for (const l of lineas) {
      const s = stockObra.find((x) => x.insumo_id === l.insumo_id);
      if (Number(l.cantidad) > (s?.stock ?? 0) + 0.0001) return setNuevo({ ...nuevo, error: `Stock insuficiente de ${s?.descripcion}: disponible ${num(s?.stock ?? 0)}.` });
    }
    const { data, error } = await db.rpc("registrar_vale_salida", {
      _proyecto: nuevo.obra, _trabajador: nuevo.trabajador, _partida: nuevo.partida || null, _fecha: hoy(), _obs: nuevo.obs.trim(),
      _items: lineas.map((l) => ({ insumo_id: l.insumo_id, cantidad: Number(l.cantidad) })),
    });
    if (error) return setNuevo({ ...nuevo, error: error.message });
    setNuevo(null);
    await Promise.all(["vales_salida", "vales_salida_items", "movimientos_almacen", "epp_entregas"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    const v = (await db.from("vales_salida").select("*").eq("id", data.id).single()).data as Vale | null;
    if (v) setVista(v);
  }

  const trabFiltrados = nuevo ? activos.filter((t) => !nuevo.busq || `${t.nombre} ${t.dni}`.toLowerCase().includes(nuevo.busq.toLowerCase())) : [];
  const itsVista = vista ? items.filter((i) => i.vale_id === vista.id) : [];

  return (
    <>
      <Panel titulo={`Vales de salida (${visibles.length})`} extra={
        <div className="flex flex-wrap items-center gap-2">
          <Select className="h-7 py-0 text-xs" value={f.obra} onChange={(e) => setF({ ...f, obra: e.target.value })}>
            <option value="">Todas las obras</option>{obras.map((o) => <option key={o} value={o}>{nombreProy(o)}</option>)}
          </Select>
          <Select className="h-7 py-0 text-xs" value={f.trabajador} onChange={(e) => setF({ ...f, trabajador: e.target.value })}>
            <option value="">Todos los trabajadores</option>{trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </Select>
          <Input className="h-7 w-36 py-0 text-xs" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
          <Boton onClick={() => setNuevo({ obra: f.obra || obras.find(puedeEmitir) || "", trabajador: "", busq: "", partida: "", obs: "", lineas: [{ insumo_id: "", cantidad: "" }], error: "" })}><Plus size={14} className="mr-1 inline" /> Nuevo vale</Boton>
        </div>}>
        {visibles.length === 0 ? <Vacio texto="Todavía no hay vales de salida." /> : (
          <table className="w-full font-mono text-xs">
            <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-5 py-2 font-medium">Código</th><th className="px-3 py-2 font-medium">Fecha</th><th className="px-3 py-2 font-medium">Obra</th>
              <th className="px-3 py-2 font-medium">Trabajador</th><th className="px-3 py-2 font-medium">Ítems</th><th className="px-3 py-2 font-medium">Partida</th><th className="px-3 py-2" />
            </tr></thead>
            <tbody>{visibles.map((v) => (
              <tr key={v.id} className="border-b border-line/40">
                <td className="px-5 py-2 text-primary">{v.codigo}</td><td className="px-3 py-2">{v.fecha}</td><td className="px-3 py-2 text-ink">{nombreProy(v.proyecto_id)}</td>
                <td className="px-3 py-2">{trab(v.trabajador_id)?.nombre ?? "—"} <span className="text-muted-foreground">{trab(v.trabajador_id)?.dni}</span></td>
                <td className="px-3 py-2">{items.filter((i) => i.vale_id === v.id).map((i) => `${i.descripcion} (${num(Number(i.cantidad))} ${i.unidad})`).join(", ")}</td>
                <td className="px-3 py-2 text-muted-foreground">{nomPartida(v.partida_id)}</td>
                <td className="px-3 py-1 text-right"><BotonIcono etiqueta="Ver e imprimir vale" tono="primario" onClick={() => setVista(v)}><Printer size={13} /></BotonIcono></td>
              </tr>))}</tbody>
          </table>
        )}
      </Panel>

      <VentanaFlotante abierta={!!nuevo} onCerrar={() => setNuevo(null)} titulo="Nuevo vale de salida" subtitulo="Entrega de EPP y herramientas a un trabajador" ancho="max-w-2xl">
        {nuevo && (
          <form onSubmit={emitir} className="space-y-3 p-5 text-xs" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Almacén de obra">
                <Select value={nuevo.obra} onChange={(e) => setNuevo({ ...nuevo, obra: e.target.value, partida: "", lineas: [{ insumo_id: "", cantidad: "" }], error: "" })}>
                  <option value="">Seleccionar…</option>{obras.filter(puedeEmitir).map((o) => <option key={o} value={o}>{nombreProy(o)}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Partida (opcional)">
                <Select value={nuevo.partida} onChange={(e) => setNuevo({ ...nuevo, partida: e.target.value })}>
                  <option value="">Sin partida</option>{partidasObra(nuevo.obra).map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Buscar trabajador (nombre o DNI)">
                <Input value={nuevo.busq} onChange={(e) => setNuevo({ ...nuevo, busq: e.target.value })} />
              </Campo>
              <Campo etiqueta="Trabajador">
                <Select value={nuevo.trabajador} onChange={(e) => setNuevo({ ...nuevo, trabajador: e.target.value, error: "" })}>
                  <option value="">Seleccionar…</option>{trabFiltrados.map((t) => <option key={t.id} value={t.id}>{t.nombre} · {t.dni}</option>)}
                </Select>
              </Campo>
            </div>
            <div className="space-y-2">
              {nuevo.lineas.map((l, i) => {
                const s = stockObra.find((x) => x.insumo_id === l.insumo_id);
                const set = (c: Partial<typeof l>) => setNuevo({ ...nuevo, lineas: nuevo.lineas.map((x, j) => (j === i ? { ...x, ...c } : x)), error: "" });
                return (
                  <div key={i} className="grid grid-cols-[1fr_9rem_1.5rem] items-end gap-2">
                    <Campo etiqueta={i === 0 ? "Insumo" : ""}>
                      <Select value={l.insumo_id} onChange={(e) => set({ insumo_id: e.target.value })}>
                        <option value="">{stockObra.length ? "Seleccionar…" : "Sin stock en esta obra"}</option>
                        {stockObra.map((x) => <option key={x.insumo_id!} value={x.insumo_id!}>{x.descripcion} ({x.unidad})</option>)}
                      </Select>
                    </Campo>
                    <Campo etiqueta={s ? `Cant. · stock ${num(s.stock)}` : i === 0 ? "Cantidad" : ""}>
                      <Input type="number" step="0.0001" min="0" value={l.cantidad} onChange={(e) => set({ cantidad: e.target.value })} />
                    </Campo>
                    <button type="button" className="mb-2 text-bad" aria-label="Quitar ítem" onClick={() => setNuevo({ ...nuevo, lineas: nuevo.lineas.length > 1 ? nuevo.lineas.filter((_, j) => j !== i) : nuevo.lineas })}>×</button>
                  </div>
                );
              })}
              <Boton type="button" variante="linea" onClick={() => setNuevo({ ...nuevo, lineas: [...nuevo.lineas, { insumo_id: "", cantidad: "" }] })}><Plus size={13} className="mr-1 inline" /> Agregar ítem</Boton>
            </div>
            <Campo etiqueta="Observación"><Input value={nuevo.obs} onChange={(e) => setNuevo({ ...nuevo, obs: e.target.value })} /></Campo>
            {nuevo.error && <p className="font-mono text-bad">{nuevo.error}</p>}
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="linea" onClick={() => setNuevo(null)}>Cancelar</Boton>
              <Boton type="submit">Emitir vale</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>

      <VentanaFlotante abierta={!!vista} onCerrar={() => setVista(null)} titulo="Vale de salida" subtitulo={vista?.codigo ?? ""} ancho="max-w-5xl">
        {vista && (
          <div className="flex gap-3 p-4">
            <div ref={hoja} className="min-w-0 flex-1">
              <HojaOrdenCompra empresa={empresa ?? null} codigo={vista.codigo} estado="Entregado" titulo="VALE DE SALIDA">
                <div className="oc-data">
                  <div><h3>TRABAJADOR</h3><p><b>{trab(vista.trabajador_id)?.nombre ?? "—"}</b></p><p>DNI: {trab(vista.trabajador_id)?.dni || "—"}</p><p>{trab(vista.trabajador_id)?.cargo || ""}</p></div>
                  <div><h3>DATOS DEL VALE</h3><p><b>Fecha:</b> {vista.fecha}</p><p><b>Obra:</b> {nombreProy(vista.proyecto_id)}</p><p><b>Partida:</b> {nomPartida(vista.partida_id)}</p></div>
                </div>
                <table>
                  <thead><tr><th style={{ width: 32 }}>N°</th><th>DESCRIPCIÓN</th><th style={{ width: 60 }}>UND.</th><th className="oc-number" style={{ width: 90 }}>CANTIDAD</th><th className="oc-number" style={{ width: 90 }}>C. UNIT.</th><th className="oc-number" style={{ width: 90 }}>IMPORTE</th></tr></thead>
                  <tbody>{itsVista.map((it, i) => <tr key={it.id}><td>{i + 1}</td><td>{it.descripcion}</td><td>{it.unidad}</td><td className="oc-number">{num(Number(it.cantidad))}</td><td className="oc-number">{soles(Number(it.costo_unitario))}</td><td className="oc-number">{soles(Number(it.cantidad) * Number(it.costo_unitario))}</td></tr>)}</tbody>
                </table>
                {vista.observacion && <div className="oc-conditions"><h3>OBSERVACIÓN</h3>{vista.observacion}</div>}
                <div className="oc-conditions"><h3>CARGO DE ENTREGA</h3>Declaro haber recibido los bienes detallados en buen estado y me comprometo a su cuidado y devolución cuando corresponda.</div>
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: 56, textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid currentColor", width: 200, paddingTop: 4 }}>Entregado por (almacén)</div>
                  <div style={{ borderTop: "1px solid currentColor", width: 200, paddingTop: 4 }}>Recibido por · DNI {trab(vista.trabajador_id)?.dni}</div>
                </div>
              </HojaOrdenCompra>
            </div>
            <div className="flex flex-col gap-1">
              <BotonIcono etiqueta="Imprimir o guardar en PDF" tono="primario" onClick={() => imprimirOrdenCompra(hoja.current, vista.codigo)}><Printer size={15} /></BotonIcono>
            </div>
          </div>
        )}
      </VentanaFlotante>
    </>
  );
}

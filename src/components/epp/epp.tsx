import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Etiqueta, FilasCargando, Input, Panel, Select, TarjetaResumen, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { CATEGORIAS_EPP, fechaCorta, CRITICIDADES, MOTIVOS_ENTREGA, estadoEntrega, sumarDias } from "@/lib/epp";

export type Epp = {
  id: string; codigo: string; nombre: string; categoria: string; marca: string; norma: string;
  tallas: string; criticidad: string; vida_util_dias: number; costo_unitario: number; stock: number; activo: boolean;
};
export type Entrega = {
  id: string; trabajador_id: string; epp_id: string; fecha_entrega: string; cantidad: number; talla: string;
  motivo: string; fecha_renovacion: string | null; fecha_devolucion: string | null; observaciones: string;
};
type Trab = { id: string; nombre: string; dni: string; cargo: string; activo: boolean };

const db = supabase as unknown as { from: (t: string) => any };

export function useEpps() {
  return useQuery({
    queryKey: ["epp_catalogo"],
    queryFn: async () => {
      const { data, error } = await db.from("epp_catalogo").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as Epp[];
    },
  });
}
export function useEntregas() {
  return useQuery({
    queryKey: ["epp_entregas"],
    queryFn: async () => {
      const { data, error } = await db.from("epp_entregas").select("*").order("fecha_entrega", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entrega[];
    },
  });
}
function useTrabajadores() {
  return useQuery({
    queryKey: ["epp_trabajadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajadores").select("id,nombre,dni,cargo,activo").order("nombre");
      if (error) throw error;
      return (data ?? []) as Trab[];
    },
  });
}

const tonoCriticidad = (c: string) => (c === "Alta" ? "bad" : c === "Media" ? "warn" : "neutro") as "bad" | "warn" | "neutro";
const th = "px-3 py-2 text-left label-mono text-muted-foreground";
const td = "px-3 py-1.5 text-xs";

/* ---------------- Banco de datos ---------------- */
const vacioEpp: Omit<Epp, "id"> = { codigo: "", nombre: "", categoria: "Cabeza", marca: "", norma: "", tallas: "", criticidad: "Media", vida_util_dias: 180, costo_unitario: 0, stock: 0, activo: true };

export function BancoEpp() {
  const qc = useQueryClient();
  const { data: epps, isLoading } = useEpps();
  const [buscar, setBuscar] = useState("");
  const [edit, setEdit] = useState<(Omit<Epp, "id"> & { id?: string }) | null>(null);
  const guardar = useMutation({
    mutationFn: async (e: Omit<Epp, "id"> & { id?: string }) => {
      if (!e.nombre.trim()) throw new Error("Ingresa el nombre del EPP");
      const { id, ...datos } = e;
      const r = id ? await db.from("epp_catalogo").update(datos).eq("id", id) : await db.from("epp_catalogo").insert(datos);
      if (r.error) throw r.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["epp_catalogo"] }); toast.success("EPP guardado"); setEdit(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const r = await db.from("epp_catalogo").delete().eq("id", id);
      if (r.error) {
        const r2 = await db.from("epp_catalogo").update({ activo: false }).eq("id", id);
        if (r2.error) throw r2.error;
        return "inactivado";
      }
      return "eliminado";
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["epp_catalogo"] }); toast.success(r === "inactivado" ? "Tiene entregas: se marcó como inactivo" : "EPP eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const lista = (epps ?? []).filter((e) => `${e.codigo} ${e.nombre} ${e.categoria} ${e.marca}`.toLowerCase().includes(buscar.toLowerCase()));
  const altas = (epps ?? []).filter((e) => e.criticidad === "Alta" && e.activo).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TarjetaResumen etiqueta="EPP registrados" valor={String(epps?.length ?? 0)} />
        <TarjetaResumen etiqueta="Criticidad alta" valor={String(altas)} alerta={altas ? "warn" : undefined} />
        <TarjetaResumen etiqueta="Categorías" valor={String(new Set((epps ?? []).map((e) => e.categoria)).size)} />
        <TarjetaResumen etiqueta="Stock bajo (≤5)" valor={String((epps ?? []).filter((e) => e.activo && e.stock <= 5).length)} />
      </div>
      <Panel titulo="Banco de Datos de EPP" extra={
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} className="h-8 w-56 py-1" />
          <Boton onClick={() => setEdit({ ...vacioEpp })}><Plus size={14} /> Nuevo EPP</Boton>
        </div>}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line"><tr>
              <th className={th}>Código</th><th className={th}>EPP</th><th className={th}>Categoría</th><th className={th}>Marca / Norma</th>
              <th className={th}>Tallas</th><th className={th}>Criticidad</th><th className={th}>Vida útil</th><th className={`${th} text-right`}>Stock</th><th className={th}></th>
            </tr></thead>
            <tbody>
              {isLoading ? <FilasCargando columnas={9} /> : lista.map((e) => (
                <tr key={e.id} className={`border-b border-line/60 ${e.activo ? "" : "opacity-50"}`}>
                  <td className={`${td} font-mono`}>{e.codigo || "—"}</td>
                  <td className={td}>{e.nombre}</td>
                  <td className={td}>{e.categoria}</td>
                  <td className={td}>{[e.marca, e.norma].filter(Boolean).join(" · ") || "—"}</td>
                  <td className={td}>{e.tallas || "Única"}</td>
                  <td className={td}><Etiqueta tono={tonoCriticidad(e.criticidad)}>{e.criticidad}</Etiqueta></td>
                  <td className={td}>{e.vida_util_dias} días</td>
                  <td className={`${td} text-right font-mono`}>{e.stock}</td>
                  <td className={td}><div className="flex justify-end gap-1">
                    <BotonIcono etiqueta="Editar" onClick={() => setEdit({ ...e })} className="size-6"><Pencil size={12} /></BotonIcono>
                    <BotonIcono etiqueta="Eliminar" tono="peligro" className="size-6" onClick={() => confirm(`¿Eliminar ${e.nombre}?`) && eliminar.mutate(e.id)}><Trash2 size={12} /></BotonIcono>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !lista.length && <Vacio texto="Aún no hay EPP registrados." />}
        </div>
      </Panel>
      <VentanaFlotante titulo={edit?.id ? "Editar EPP" : "Nuevo EPP"} abierta={!!edit} onCerrar={() => setEdit(null)} ancho="max-w-3xl">
        {edit && (
          <form className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3" onSubmit={(ev) => { ev.preventDefault(); guardar.mutate(edit); }}>
            <Campo etiqueta="Código"><Input value={edit.codigo} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} /></Campo>
            <div className="col-span-2"><Campo etiqueta="Nombre"><Input autoFocus value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} placeholder="Casco de seguridad tipo I" /></Campo></div>
            <Campo etiqueta="Categoría"><Select value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })}>{CATEGORIAS_EPP.map((c) => <option key={c}>{c}</option>)}</Select></Campo>
            <Campo etiqueta="Marca"><Input value={edit.marca} onChange={(e) => setEdit({ ...edit, marca: e.target.value })} /></Campo>
            <Campo etiqueta="Norma técnica"><Input value={edit.norma} onChange={(e) => setEdit({ ...edit, norma: e.target.value })} placeholder="ANSI Z89.1" /></Campo>
            <Campo etiqueta="Tallas (separadas por coma)"><Input value={edit.tallas} onChange={(e) => setEdit({ ...edit, tallas: e.target.value })} placeholder="S, M, L, XL" /></Campo>
            <Campo etiqueta="Criticidad"><Select value={edit.criticidad} onChange={(e) => setEdit({ ...edit, criticidad: e.target.value })}>{CRITICIDADES.map((c) => <option key={c}>{c}</option>)}</Select></Campo>
            <Campo etiqueta="Vida útil (días)"><Input type="number" min={1} value={edit.vida_util_dias} onChange={(e) => setEdit({ ...edit, vida_util_dias: Number(e.target.value) })} /></Campo>
            <Campo etiqueta="Costo unitario (S/)"><Input type="number" step="0.01" min={0} value={edit.costo_unitario} onChange={(e) => setEdit({ ...edit, costo_unitario: Number(e.target.value) })} /></Campo>
            <Campo etiqueta="Stock"><Input type="number" min={0} value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></Campo>
            <label className="flex items-end gap-2 pb-2 text-xs"><input type="checkbox" checked={edit.activo} onChange={(e) => setEdit({ ...edit, activo: e.target.checked })} /> Activo</label>
            <div className="col-span-full flex justify-end gap-2 border-t border-line pt-3">
              <Boton type="button" variante="linea" onClick={() => setEdit(null)}>Cancelar</Boton>
              <Boton type="submit" disabled={guardar.isPending}>Guardar</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
    </div>
  );
}

/* ---------------- Asignación y entrega ---------------- */
export function EntregasEpp() {
  const qc = useQueryClient();
  const { data: epps } = useEpps();
  const { data: entregas, isLoading } = useEntregas();
  const { data: trabs } = useTrabajadores();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const [form, setForm] = useState<{ trabajador_id: string; epp_id: string; fecha_entrega: string; cantidad: number; talla: string; motivo: string; observaciones: string } | null>(null);
  const mapaEpp = useMemo(() => new Map((epps ?? []).map((e) => [e.id, e])), [epps]);
  const mapaTrab = useMemo(() => new Map((trabs ?? []).map((t) => [t.id, t])), [trabs]);

  const registrar = useMutation({
    mutationFn: async (f: NonNullable<typeof form>) => {
      if (!f.trabajador_id || !f.epp_id) throw new Error("Selecciona trabajador y EPP");
      const epp = mapaEpp.get(f.epp_id)!;
      const r = await db.from("epp_entregas").insert({ ...f, fecha_renovacion: sumarDias(f.fecha_entrega, epp.vida_util_dias) });
      if (r.error) throw r.error;
      await db.from("epp_catalogo").update({ stock: Math.max(0, epp.stock - f.cantidad) }).eq("id", epp.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["epp_entregas"] }); qc.invalidateQueries({ queryKey: ["epp_catalogo"] }); toast.success("Entrega registrada"); setForm((f) => f && { ...f, epp_id: "", talla: "", observaciones: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const devolver = useMutation({
    mutationFn: async (id: string) => { const r = await db.from("epp_entregas").update({ fecha_devolucion: hoy }).eq("id", id); if (r.error) throw r.error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["epp_entregas"] }); toast.success("Devolución registrada"); },
  });
  const eliminar = useMutation({
    mutationFn: async (id: string) => { const r = await db.from("epp_entregas").delete().eq("id", id); if (r.error) throw r.error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["epp_entregas"] }); toast.success("Entrega eliminada"); },
  });

  const lista = entregas ?? [];
  const vencidas = lista.filter((e) => estadoEntrega(e, hoy) === "Vencido").length;
  const porVencer = lista.filter((e) => estadoEntrega(e, hoy) === "Por renovar").length;
  const eppSel = form ? mapaEpp.get(form.epp_id) : undefined;
  const tallas = eppSel?.tallas.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TarjetaResumen etiqueta="Entregas registradas" valor={String(lista.length)} />
        <TarjetaResumen etiqueta="Del mes" valor={String(lista.filter((e) => e.fecha_entrega.slice(0, 7) === hoy.slice(0, 7)).length)} />
        <TarjetaResumen etiqueta="Por renovar (30 días)" valor={String(porVencer)} alerta={porVencer ? "warn" : undefined} />
        <TarjetaResumen etiqueta="Vencidos" valor={String(vencidas)} alerta={vencidas ? "bad" : undefined} />
      </div>
      <Panel titulo="Asignación y Entrega" extra={<Boton onClick={() => setForm({ trabajador_id: "", epp_id: "", fecha_entrega: hoy, cantidad: 1, talla: "", motivo: MOTIVOS_ENTREGA[0] ?? "Dotación inicial", observaciones: "" })}><Plus size={14} /> Registrar entrega</Boton>}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-line"><tr>
              <th className={th}>Fecha</th><th className={th}>Trabajador</th><th className={th}>EPP</th><th className={th}>Talla</th><th className={`${th} text-right`}>Cant.</th>
              <th className={th}>Motivo</th><th className={th}>Renovación</th><th className={th}>Estado</th><th className={th}></th>
            </tr></thead>
            <tbody>
              {isLoading ? <FilasCargando columnas={9} /> : lista.map((e) => {
                const est = estadoEntrega(e, hoy);
                return (
                  <tr key={e.id} className="border-b border-line/60">
                    <td className={`${td} font-mono`}>{fechaCorta(e.fecha_entrega)}</td>
                    <td className={td}>{mapaTrab.get(e.trabajador_id)?.nombre ?? "—"}</td>
                    <td className={td}>{mapaEpp.get(e.epp_id)?.nombre ?? "—"}</td>
                    <td className={td}>{e.talla || "—"}</td>
                    <td className={`${td} text-right font-mono`}>{e.cantidad}</td>
                    <td className={td}>{e.motivo}</td>
                    <td className={`${td} font-mono`}>{fechaCorta(e.fecha_renovacion)}</td>
                    <td className={td}><Etiqueta tono={est === "Vencido" ? "bad" : est === "Por renovar" ? "warn" : est === "Vigente" ? "good" : "neutro"}>{est}</Etiqueta></td>
                    <td className={td}><div className="flex justify-end gap-1">
                      {!e.fecha_devolucion && <Boton variante="linea" className="h-6 px-2 py-0 text-[11px]" onClick={() => devolver.mutate(e.id)}>Devolver</Boton>}
                      <BotonIcono etiqueta="Eliminar" tono="peligro" className="size-6" onClick={() => confirm("¿Eliminar esta entrega?") && eliminar.mutate(e.id)}><Trash2 size={12} /></BotonIcono>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && !lista.length && <Vacio texto="Aún no hay entregas registradas." />}
        </div>
      </Panel>
      <VentanaFlotante titulo="Registrar entrega de EPP" subtitulo="Puedes registrar varias entregas seguidas para el mismo trabajador." abierta={!!form} onCerrar={() => setForm(null)} ancho="max-w-3xl">
        {form && (
          <form className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3" onSubmit={(ev) => { ev.preventDefault(); registrar.mutate(form); }}>
            <div className="col-span-2"><Campo etiqueta="Trabajador"><Select value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })}>
              <option value="">Seleccionar…</option>{(trabs ?? []).filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombre} · {t.dni}</option>)}
            </Select></Campo></div>
            <Campo etiqueta="Fecha de entrega"><Input type="date" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} /></Campo>
            <div className="col-span-2"><Campo etiqueta="EPP"><Select value={form.epp_id} onChange={(e) => setForm({ ...form, epp_id: e.target.value, talla: "" })}>
              <option value="">Seleccionar…</option>{(epps ?? []).filter((e) => e.activo).map((e) => <option key={e.id} value={e.id}>{e.nombre} ({e.categoria}) · stock {e.stock}</option>)}
            </Select></Campo></div>
            <Campo etiqueta="Talla">{tallas.length ? <Select value={form.talla} onChange={(e) => setForm({ ...form, talla: e.target.value })}><option value="">—</option>{tallas.map((t) => <option key={t}>{t}</option>)}</Select> : <Input value={form.talla} onChange={(e) => setForm({ ...form, talla: e.target.value })} placeholder="Única" />}</Campo>
            <Campo etiqueta="Cantidad"><Input type="number" min={1} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} /></Campo>
            <Campo etiqueta="Motivo"><Select value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}>{MOTIVOS_ENTREGA.map((m) => <option key={m}>{m}</option>)}</Select></Campo>
            <Campo etiqueta="Renovación estimada"><Input disabled value={eppSel ? fechaCorta(sumarDias(form.fecha_entrega, eppSel.vida_util_dias)) : "—"} /></Campo>
            <div className="col-span-full"><Campo etiqueta="Observaciones"><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Campo></div>
            <div className="col-span-full flex justify-end gap-2 border-t border-line pt-3">
              <Boton type="button" variante="linea" onClick={() => setForm(null)}>Cerrar</Boton>
              <Boton type="submit" disabled={registrar.isPending}>Registrar entrega</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
    </div>
  );
}

/* ---------------- Historial por empleado ---------------- */
export function HistorialEpp() {
  const { data: epps } = useEpps();
  const { data: entregas } = useEntregas();
  const { data: trabs } = useTrabajadores();
  const [sel, setSel] = useState("");
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const mapaEpp = new Map((epps ?? []).map((e) => [e.id, e]));
  const trab = (trabs ?? []).find((t) => t.id === sel);
  const filas = (entregas ?? []).filter((e) => e.trabajador_id === sel).sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega));

  return (
    <Panel titulo="Ficha de control de dotación de EPP" extra={
      <div className="no-print flex items-center gap-2">
        <Select value={sel} onChange={(e) => setSel(e.target.value)} className="h-8 w-72 py-1">
          <option value="">Seleccionar trabajador…</option>{(trabs ?? []).map((t) => <option key={t.id} value={t.id}>{t.nombre}{t.activo ? "" : " (cesado)"}</option>)}
        </Select>
        <Boton variante="linea" disabled={!trab} onClick={() => window.print()}><Printer size={14} /> Imprimir</Boton>
      </div>}>
      {!trab ? <Vacio texto="Elige un trabajador para ver su ficha de dotación." /> : (
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 rounded-md border border-line p-3 text-xs md:grid-cols-4">
            <div><p className="label-mono text-muted-foreground">Trabajador</p><p className="font-semibold">{trab.nombre}</p></div>
            <div><p className="label-mono text-muted-foreground">DNI</p><p className="font-mono">{trab.dni}</p></div>
            <div><p className="label-mono text-muted-foreground">Cargo</p><p>{trab.cargo || "—"}</p></div>
            <div><p className="label-mono text-muted-foreground">Entregas</p><p className="font-mono">{filas.length}</p></div>
          </div>
          <table className="w-full border border-line">
            <thead className="border-b border-line bg-muted/40"><tr>
              <th className={th}>N°</th><th className={th}>Fecha</th><th className={th}>EPP</th><th className={th}>Talla</th><th className={`${th} text-right`}>Cant.</th>
              <th className={th}>Motivo</th><th className={th}>Renovación</th><th className={th}>Devolución</th><th className={th}>Estado</th><th className={th}>Firma</th>
            </tr></thead>
            <tbody>
              {filas.map((e, i) => (
                <tr key={e.id} className="border-b border-line/60">
                  <td className={`${td} font-mono`}>{i + 1}</td>
                  <td className={`${td} font-mono`}>{fechaCorta(e.fecha_entrega)}</td>
                  <td className={td}>{mapaEpp.get(e.epp_id)?.nombre ?? "—"}</td>
                  <td className={td}>{e.talla || "—"}</td>
                  <td className={`${td} text-right font-mono`}>{e.cantidad}</td>
                  <td className={td}>{e.motivo}</td>
                  <td className={`${td} font-mono`}>{fechaCorta(e.fecha_renovacion)}</td>
                  <td className={`${td} font-mono`}>{fechaCorta(e.fecha_devolucion)}</td>
                  <td className={td}>{estadoEntrega(e, hoy)}</td>
                  <td className={`${td} w-28`}></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filas.length && <Vacio texto="Este trabajador aún no tiene entregas de EPP." />}
          <p className="text-[11px] text-muted-foreground">Registro de entrega de equipos de protección personal conforme a la Ley N.° 29783 de Seguridad y Salud en el Trabajo y su reglamento (D.S. 005-2012-TR).</p>
        </div>
      )}
    </Panel>
  );
}

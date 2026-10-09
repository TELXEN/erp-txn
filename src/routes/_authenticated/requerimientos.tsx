import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2, Upload, Zap } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { soles } from "@/lib/format";
import { usePartidas, useProyectos } from "@/lib/datos";
import { TIPOS_INSUMO, apuDb, cantidadComponente, nombreTipo, useInsumos, type ComponenteApu, type TipoInsumo } from "@/lib/apu";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/requerimientos")({
  head: () => ({
    meta: [
      { title: "Requerimientos — ERP TELXEN SAC" },
      { name: "description", content: "Explosión de insumos por obra y requerimientos de materiales, equipos y servicios." },
      { property: "og:title", content: "Requerimientos — ERP TELXEN SAC" },
      { property: "og:description", content: "Explosión de insumos desde el análisis de precios y requerimientos por obra." },
    ],
  }),
  component: RequerimientosPage,
});

type Requerimiento = {
  id: string;
  proyecto_id: string;
  codigo: string;
  fecha: string;
  estado: string;
  observacion: string;
  creado_por: string | null;
};
type ItemReq = {
  id: string;
  requerimiento_id: string;
  insumo_id: string | null;
  tipo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_referencial: number;
};

const ESTADOS = ["Pendiente", "Aprobado", "Atendido", "Rechazado"];
const num = (n: number, d = 2) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });

function RequerimientosPage() {
  const { rol } = useAuth();
  const gestiona = puedeVerDinero(rol);
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: insumos = [] } = useInsumos();
  const [origen, setOrigen] = useState<"obra" | "cotizacion">("cotizacion");
  const [cotizacionId, setCotizacionId] = useState("");
  const [vista, setVista] = useState<"tipo" | "consolidada">("tipo");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [proyectoSel, setProyectoSel] = useState("");
  const [tipos, setTipos] = useState<TipoInsumo[]>(["MAT", "EQ", "SC"]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const { data: cotizaciones = [] } = useQuery({
    queryKey: ["cotizaciones_aprobadas"],
    queryFn: async () => {
      const { data, error } = await apuDb
        .from("cotizaciones")
        .select("id, codigo, nombre, cliente, proyecto_id")
        .eq("estado", "Aprobada")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; codigo: string; nombre: string; cliente: string; proyecto_id: string | null }[];
    },
  });
  const cotizacion = cotizaciones.find((c) => c.id === cotizacionId);
  const proyectoId = origen === "obra" ? proyectoSel : (cotizacion?.proyecto_id ?? "");

  const { data: itemsCot = [] } = useQuery({
    queryKey: ["cotizacion_items_req", cotizacionId],
    enabled: origen === "cotizacion" && !!cotizacionId,
    queryFn: async () => {
      const { data, error } = await apuDb
        .from("cotizacion_items")
        .select("id, codigo, nombre, metrado, rendimiento, jornada, padre_id, orden")
        .eq("cotizacion_id", cotizacionId)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; codigo: string; nombre: string; metrado: number; rendimiento: number; jornada: number; padre_id: string | null }>;
    },
  });

  const proyecto = proyectos.find((p) => p.id === proyectoId);
  /** Partidas hoja (sin títulos) del origen elegido. */
  const hojas = useMemo(() => {
    const base: Array<{ id: string; codigo: string; nombre: string; metrado: number; rendimiento: number; jornada: number; padre_id: string | null }> =
      origen === "obra"
        ? partidas
            .filter((p) => p.proyecto_id === proyectoSel)
            .map((p) => ({ id: p.id, codigo: (p as { codigo?: string }).codigo ?? "", nombre: (p as { nombre?: string }).nombre ?? "", metrado: Number(p.metrado ?? 0), rendimiento: Number(p.rendimiento ?? 1), jornada: Number(p.jornada ?? 8), padre_id: p.padre_id ?? null }))
        : itemsCot.map((i) => ({ ...i, metrado: Number(i.metrado ?? 0), rendimiento: Number(i.rendimiento ?? 1), jornada: Number(i.jornada ?? 8) }));
    return base.filter((p) => !base.some((h) => h.padre_id === p.id));
  }, [origen, partidas, proyectoSel, itemsCot]);
  const columnaApu = origen === "obra" ? "partida_id" : "cotizacion_item_id";

  const { data: comps = [] } = useQuery({
    queryKey: ["apu_req", origen, hojas.map((h) => h.id).join(",")],
    enabled: hojas.length > 0,
    queryFn: async () => {
      const { data, error } = await apuDb
        .from("apu_componentes")
        .select("*")
        .in(columnaApu, hojas.map((h) => h.id));
      if (error) throw error;
      return (data ?? []) as (ComponenteApu & { partida_id: string | null; cotizacion_item_id: string | null })[];
    },
  });
  const { data: origenesReq = [] } = useQuery({
    queryKey: ["requerimiento_item_origenes"],
    queryFn: async () => {
      const { data, error } = await apuDb.from("requerimiento_item_origenes").select("*");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; requerimiento_item_id: string; partida_codigo: string; partida_nombre: string; metrado: number; cantidad_unitaria: number; cantidad: number }>;
    },
  });

  const { data: reqs = [] } = useQuery({
    queryKey: ["requerimientos"],
    queryFn: async () => {
      const { data, error } = await apuDb.from("requerimientos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Requerimiento[];
    },
  });
  const { data: reqItems = [] } = useQuery({
    queryKey: ["requerimiento_items"],
    queryFn: async () => {
      const { data, error } = await apuDb.from("requerimiento_items").select("*");
      if (error) throw error;
      return (data ?? []) as ItemReq[];
    },
  });

  /** Explosión: Σ metrado × cantidad unitaria del APU, por insumo. */
  const explosion = useMemo(() => {
    const mapa = new Map<string, { insumoId: string; total: number; partidas: number }>();
    for (const c of comps) {
      const p = hojas.find((h) => h.id === c.partida_id);
      if (!p) continue;
      const q = Number(p.metrado ?? 0) * cantidadComponente(c, Number(p.rendimiento ?? 1), Number(p.jornada ?? 8));
      const act = mapa.get(c.insumo_id) ?? { insumoId: c.insumo_id, total: 0, partidas: 0 };
      act.total += q;
      act.partidas += 1;
      mapa.set(c.insumo_id, act);
    }
    const reqsObra = new Set(reqs.filter((r) => r.proyecto_id === proyectoId && r.estado !== "Rechazado").map((r) => r.id));
    return [...mapa.values()]
      .map((e) => {
        const ins = insumos.find((i) => i.id === e.insumoId);
        const requerido = reqItems
          .filter((it) => reqsObra.has(it.requerimiento_id) && it.insumo_id === e.insumoId)
          .reduce((s, it) => s + Number(it.cantidad), 0);
        return { ...e, ins, requerido, saldo: Math.max(0, e.total - requerido) };
      })
      .filter((e) => e.ins)
      .sort((a, b) => a.ins!.nombre.localeCompare(b.ins!.nombre));
  }, [comps, hojas, insumos, reqs, reqItems, proyectoId]);

  const sinApu = hojas.filter((h) => !comps.some((c) => c.partida_id === h.id)).length;
  const nombreProy = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const reqsVisibles = reqs.filter((r) => (!proyectoId || r.proyecto_id === proyectoId) && coincide(busqueda, r.codigo, nombreProy(r.proyecto_id), r.observacion));

  async function generar() {
    setError("");
    setAviso("");
    const filas = explosion.filter((e) => tipos.includes(e.ins!.tipo) && e.saldo > 0.0001);
    if (!filas.length) return setError("No hay saldo por requerir para los tipos seleccionados.");
    const n = reqs.filter((r) => r.proyecto_id === proyectoId).length + 1;
    const codigo = `REQ-${proyecto?.codigo || "OBRA"}-${String(n).padStart(3, "0")}`;
    const { data: req, error: e1 } = await apuDb
      .from("requerimientos")
      .insert({ proyecto_id: proyectoId, codigo, observacion: "Generado por explosión de insumos" })
      .select("id")
      .single();
    if (e1) return setError(e1.message);
    const { error: e2 } = await apuDb.from("requerimiento_items").insert(
      filas.map((e) => ({
        requerimiento_id: req.id,
        insumo_id: e.insumoId,
        tipo: e.ins!.tipo,
        descripcion: e.ins!.nombre,
        unidad: e.ins!.unidad,
        cantidad: Math.round(e.saldo * 10000) / 10000,
        precio_referencial: Number(e.ins!.precio),
      })),
    );
    if (e2) return setError(e2.message);
    setAviso(`Requerimiento ${codigo} generado con ${filas.length} insumos.`);
    setAbierto(req.id);
    qc.invalidateQueries({ queryKey: ["requerimientos"] });
    qc.invalidateQueries({ queryKey: ["requerimiento_items"] });
  }

  async function cambiarEstado(id: string, estado: string) {
    const { error: err } = await apuDb.from("requerimientos").update({ estado }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["requerimientos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este requerimiento?")) return;
    const { error: err } = await apuDb.from("requerimientos").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["requerimientos"] });
    qc.invalidateQueries({ queryKey: ["requerimiento_items"] });
  }

  function exportar() {
    exportarExcel(`explosion-insumos-${proyecto?.codigo || "obra"}`, [
      {
        nombre: "Explosión de insumos",
        filas: explosion.map((e) => ({
          Tipo: nombreTipo(e.ins!.tipo),
          Insumo: e.ins!.nombre,
          Unidad: e.ins!.unidad,
          "Cantidad total": Number(e.total.toFixed(4)),
          "Ya requerido": Number(e.requerido.toFixed(4)),
          "Saldo por requerir": Number(e.saldo.toFixed(4)),
          ...(gestiona
            ? { "Precio (S/)": Number(e.ins!.precio), "Parcial (S/)": Math.round(e.total * Number(e.ins!.precio) * 100) / 100 }
            : {}),
        })),
      },
    ]);
  }

  return (
    <>
      <Encabezado
        titulo="Requerimientos"
        subtitulo="Logística"
        acciones={
          proyectoId && explosion.length > 0 ? (
            <Boton variante="linea" onClick={exportar}>
              <Upload size={14} className="mr-1 inline" /> Exportar a Excel
            </Boton>
          ) : null
        }
      />

      <Panel titulo="Explosión de insumos por obra" className="mb-5">
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3 font-mono text-xs">
          <label className="min-w-64 flex-1">
            <span className="label-mono">Obra</span>
            <Select className="mt-1" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              <option value="">Seleccionar obra…</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre}</option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {TIPOS_INSUMO.map(([k, t]) => (
              <label key={k} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--color-primary)]"
                  checked={tipos.includes(k)}
                  onChange={(e) => setTipos(e.target.checked ? [...tipos, k] : tipos.filter((x) => x !== k))}
                />
                {t}
              </label>
            ))}
          </div>
          {proyectoId && (
            <Boton onClick={() => void generar()}>
              <Zap size={14} className="mr-1 inline" /> Generar requerimiento
            </Boton>
          )}
        </div>
        {error && <p className="px-5 pt-3 font-mono text-xs text-bad">{error}</p>}
        {aviso && <p className="px-5 pt-3 font-mono text-xs text-primary">{aviso}</p>}

        {!proyectoId ? (
          <Vacio texto="Selecciona una obra para calcular sus insumos a partir del análisis de precios de cada partida." />
        ) : explosion.length === 0 ? (
          <Vacio texto="Las partidas de esta obra todavía no tienen análisis de precios unitarios." />
        ) : (
          <>
            {sinApu > 0 && (
              <p className="px-5 pt-3 font-mono text-[11px] text-muted-foreground">
                {sinApu} de {hojas.length} partidas no tienen análisis de precios y no se incluyen en el cálculo.
              </p>
            )}
            <table className="mt-2 w-full table-fixed font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="w-[34%] px-5 py-2 font-medium">Insumo</th>
                  <th className="w-[7%] px-2 py-2 font-medium">Und.</th>
                  <th className="w-[12%] px-2 py-2 text-right font-medium">Cantidad total</th>
                  <th className="w-[12%] px-2 py-2 text-right font-medium">Ya requerido</th>
                  <th className="w-[12%] px-2 py-2 text-right font-medium">Saldo</th>
                  {gestiona && <th className="w-[10%] px-2 py-2 text-right font-medium">Precio</th>}
                  {gestiona && <th className="w-[13%] px-5 py-2 text-right font-medium">Parcial</th>}
                </tr>
              </thead>
              <tbody>
                {TIPOS_INSUMO.map(([k, t]) => {
                  const filas = explosion.filter((e) => e.ins!.tipo === k);
                  if (!filas.length) return null;
                  const incluido = tipos.includes(k);
                  return (
                    <React.Fragment key={k}>
                      <tr className="bg-muted/40">
                        <td colSpan={gestiona ? 6 : 5} className="px-5 py-1.5 font-semibold text-primary">
                          {t} {!incluido && <span className="ml-1 text-[10px] font-normal text-muted-foreground">(no se incluye en el requerimiento)</span>}
                        </td>
                        {gestiona && (
                          <td className="px-5 py-1.5 text-right font-semibold">
                            {soles(filas.reduce((s, e) => s + e.total * Number(e.ins!.precio), 0))}
                          </td>
                        )}
                      </tr>
                      {filas.map((e) => (
                        <tr key={e.insumoId} className={`border-b border-line/40 ${incluido ? "" : "opacity-60"}`}>
                          <td className="truncate px-5 py-1.5 text-ink">{e.ins!.nombre}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{e.ins!.unidad}</td>
                          <td className="px-2 py-1.5 text-right">{num(e.total)}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{num(e.requerido)}</td>
                          <td className={`px-2 py-1.5 text-right font-semibold ${e.saldo > 0 ? "text-ink" : "text-muted-foreground"}`}>{num(e.saldo)}</td>
                          {gestiona && <td className="px-2 py-1.5 text-right">{num(Number(e.ins!.precio))}</td>}
                          {gestiona && <td className="px-5 py-1.5 text-right">{soles(e.total * Number(e.ins!.precio))}</td>}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </Panel>

      <Panel titulo="Requerimientos registrados" extra={<Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código, obra u observación..." total={reqsVisibles.length} />}>
        {reqsVisibles.length === 0 ? (
          busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Todavía no hay requerimientos." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Obra</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 text-right font-medium">Ítems</th>
                {gestiona && <th className="px-3 py-2 text-right font-medium">Referencial</th>}
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {reqsVisibles.map((r) => {
                const its = reqItems.filter((i) => i.requerimiento_id === r.id);
                const ver = abierto === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-b border-line/40">
                      <td className="px-5 py-2">
                        <button type="button" onClick={() => setAbierto(ver ? null : r.id)} className="inline-flex items-center gap-1 text-primary">
                          {ver ? <ChevronDown size={13} /> : <ChevronRight size={13} />} <Resaltar texto={r.codigo} termino={busqueda} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-ink"><Resaltar texto={nombreProy(r.proyecto_id)} termino={busqueda} /></td>
                      <td className="px-3 py-2">{r.fecha}</td>
                      <td className="px-3 py-2 text-right">{its.length}</td>
                      {gestiona && (
                        <td className="px-3 py-2 text-right">
                          {soles(its.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_referencial), 0))}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        {gestiona ? (
                          <Select className="py-0.5 text-xs" value={r.estado} onChange={(e) => void cambiarEstado(r.id, e.target.value)}>
                            {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                          </Select>
                        ) : (
                          r.estado
                        )}
                      </td>
                      <td className="px-5 py-2 text-right">
                        {(gestiona || r.estado === "Pendiente") && (
                          <button type="button" onClick={() => void eliminar(r.id)} title="Eliminar" className="text-muted-foreground hover:text-bad">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {ver &&
                      its.map((i) => (
                        <tr key={i.id} className="border-b border-line/30 bg-muted/10">
                          <td className="px-5 py-1.5 pl-10 text-[10px] text-muted-foreground">{nombreTipo(i.tipo)}</td>
                          <td className="px-3 py-1.5">{i.descripcion}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{i.unidad}</td>
                          <td className="px-3 py-1.5 text-right">{num(Number(i.cantidad))}</td>
                          {gestiona && <td className="px-3 py-1.5 text-right">{soles(Number(i.cantidad) * Number(i.precio_referencial))}</td>}
                          <td colSpan={2} />
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

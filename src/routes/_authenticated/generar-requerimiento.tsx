import { useRecordado } from "@/lib/recordado";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText, PackageCheck, Upload, Zap } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, BotonIcono, Campo, Etiqueta, Input, MenuFiltros, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { soles } from "@/lib/format";
import { usePartidas, useProyectos } from "@/lib/datos";
import { TIPOS_INSUMO, apuDb, cantidadComponente, nombreTipo, useInsumos, type ComponenteApu, type TipoInsumo } from "@/lib/apu";
import { BANCOS_RECURSO, dbBanco, useRecursosApu } from "@/lib/banco-apu";
import { exportarExcel } from "@/lib/exportar";
import { useItemsOC, useMovimientos, useOrdenesCompra } from "@/lib/logistica";
import { cantidadPermitida, saldoRecepcion, tonoEstadoReq } from "@/lib/requerimientos-flujo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/generar-requerimiento")({
  head: () => ({
    meta: [
      { title: "Generar Requerimiento — ERP TELXEN SAC" },
      { name: "description", content: "El responsable de obra genera requerimientos desde los insumos del APU o con términos de referencia." },
      { property: "og:title", content: "Generar Requerimiento — ERP TELXEN SAC" },
      { property: "og:description", content: "Requerimientos de obra desde el APU y términos de referencia, con recepción en obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequerimientosPage,
});

type Tdr = { objeto?: string; alcance?: string; entregables?: string; plazo?: string; lugar?: string; condiciones?: string; tipo?: string; partida?: string };
type Requerimiento = {
  id: string;
  proyecto_id: string;
  codigo: string;
  fecha: string;
  estado: string;
  observacion: string;
  creado_por: string | null;
  cotizacion_id: string | null;
  origen: string;
  clase: string;
  motivo_rechazo: string;
  tdr: Tdr;
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

const num = (n: number, d = 2) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
const TDR_VACIO = { tipo: "Subcontrato", partida: "", objeto: "", alcance: "", entregables: "", plazo: "", lugar: "", condiciones: "", referencial: "" };

function RequerimientosPage() {
  const { rol } = useAuth();
  const gestiona = puedeVerDinero(rol);
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: insumos = [] } = useInsumos();
  const recursos = useRecursosApu();
  const [origen, setOrigen] = useState<"obra" | "cotizacion">("cotizacion");
  const [cotizacionId, setCotizacionId] = useState("");
  const [vista, setVista] = useState<"tipo" | "consolidada">("tipo");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [proyectoSel, setProyectoSel] = useState("");
  const [tipos, setTipos] = useState<TipoInsumo[]>(["MAT", "EQ", "SC"]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useRecordado("requerimientos:busqueda", "");
  const [sel, setSel] = useState("");

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
  // Receta del Banco APU de las partidas hoja (cotización u obra).
  const { data: detBanco = [] } = useQuery({
    queryKey: ["apu_req_banco", origen, hojas.map((h) => h.id).join(",")],
    enabled: hojas.length > 0,
    queryFn: async () => {
      const ids = hojas.map((h) => h.id);
      if (origen === "cotizacion") {
        const { data, error } = await dbBanco.from("cotizacion_apu_detalle").select("*").in("cotizacion_item_id", ids);
        if (error) throw error;
        return (data ?? []) as Record<string, string | number | null>[];
      }
      const { data, error } = await dbBanco.from("partida_detalle").select("*").in("partida_obra_id", ids);
      if (error) throw error;
      return (data ?? []) as Record<string, string | number | null>[];
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

  type Origen = { partidaId: string; codigo: string; nombre: string; metrado: number; unitaria: number; cantidad: number };
  type Entrada = {
    clave: string; insumoId: string | null; tipo: string; nombre: string; unidad: string; precio: number;
    total: number; partidas: number; origenes: Origen[]; requerido: number; saldo: number;
  };
  /** Desdoblamiento: Σ metrado de la partida × cantidad del recurso en su APU, consolidado por recurso. */
  const explosion = useMemo(() => {
    const mapa = new Map<string, Entrada>();
    const agregar = (clave: string, base: Omit<Entrada, "total" | "partidas" | "origenes" | "requerido" | "saldo">, p: (typeof hojas)[number], unitaria: number) => {
      const q = p.metrado * unitaria;
      const act = mapa.get(clave) ?? { ...base, total: 0, partidas: 0, origenes: [], requerido: 0, saldo: 0 };
      act.total += q;
      act.partidas += 1;
      act.origenes.push({ partidaId: p.id, codigo: p.codigo, nombre: p.nombre, metrado: p.metrado, unitaria, cantidad: q });
      mapa.set(clave, act);
    };
    // APU anterior (insumos) — cotizaciones y obras migradas antes del Banco APU.
    for (const c of comps) {
      const pid = origen === "obra" ? c.partida_id : c.cotizacion_item_id;
      const p = hojas.find((h) => h.id === pid);
      if (!p) continue;
      const ins = insumos.find((i) => i.id === c.insumo_id);
      if (!ins || ins.tipo === "HT") continue;
      agregar(`ins:${c.insumo_id}`, { clave: `ins:${c.insumo_id}`, insumoId: c.insumo_id, tipo: ins.tipo, nombre: ins.nombre, unidad: ins.unidad, precio: Number(ins.precio) }, p, cantidadComponente(c, p.rendimiento || 1, p.jornada || 8));
    }
    // Banco APU: recursos a costo (sin margen). Equipos «%» no son comprables y se omiten.
    for (const d of detBanco) {
      const pid = String(origen === "obra" ? d["partida_obra_id"] : d["cotizacion_item_id"] ?? "");
      const p = hojas.find((h) => h.id === pid);
      if (!p) continue;
      const found = BANCOS_RECURSO.find(([col]) => d[col]);
      if (!found) continue;
      const [col, tabla, , tipo] = found;
      const r = (recursos[tabla] ?? []).find((x: { id: string }) => x.id === d[col]);
      if (!r) continue;
      const q = Number(d["cantidad_o_cuadrilla"]) || 0;
      if (tabla === "equipos_herramientas" && r.unidad === "%") continue;
      const porRendimiento = tabla === "mano_obra" || (tabla === "equipos_herramientas" && r.unidad === "H-M");
      const unitaria = porRendimiento ? (q * (p.jornada || 8)) / (p.rendimiento || 1) : q;
      const precio = Number(tabla === "materiales" ? r.precio_base : tabla === "mano_obra" || tabla === "equipos_herramientas" ? r.costo_hora : r.costo) || 0;
      agregar(`banco:${tipo}:${r.id}`, { clave: `banco:${tipo}:${r.id}`, insumoId: null, tipo, nombre: r.descripcion, unidad: r.unidad, precio }, p, unitaria);
    }
    const reqsBase = new Set(
      reqs
        .filter((r) => r.estado !== "Rechazado" && (origen === "cotizacion" ? r.cotizacion_id === cotizacionId : r.proyecto_id === proyectoId && r.origen !== "cotizacion"))
        .map((r) => r.id),
    );
    return [...mapa.values()]
      .map((e) => {
        const requerido = reqItems
          .filter((it) => reqsBase.has(it.requerimiento_id) && (e.insumoId ? it.insumo_id === e.insumoId : !it.insumo_id && it.tipo === e.tipo && it.descripcion === e.nombre))
          .reduce((s, it) => s + Number(it.cantidad), 0);
        return { ...e, requerido, saldo: Math.max(0, e.total - requerido) };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [comps, detBanco, hojas, insumos, recursos, reqs, reqItems, proyectoId, origen, cotizacionId]);

  const listo = origen === "obra" ? !!proyectoSel : !!cotizacionId;
  const sinApu = hojas.filter((h) =>
    !comps.some((c) => (origen === "obra" ? c.partida_id : c.cotizacion_item_id) === h.id) &&
    !detBanco.some((d) => String(origen === "obra" ? d["partida_obra_id"] : d["cotizacion_item_id"] ?? "") === h.id),
  ).length;
  const alternar = (id: string) =>
    setExpandidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const nombreProy = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const actual = reqs.find((x) => x.id === sel);
  const reqsVisibles = reqs.filter((r) => (!proyectoId || r.proyecto_id === proyectoId) && coincide(busqueda, r.codigo, nombreProy(r.proyecto_id), r.observacion));

  async function generar() {
    setError("");
    setAviso("");
    if (!proyectoId) return setError("La cotización aprobada no está vinculada a una obra; conviértela en proyecto primero.");
    const filas = explosion.filter((e) => tipos.includes(e.tipo as TipoInsumo) && e.saldo > 0.0001);
    if (!filas.length) return setError("No hay saldo por requerir para los tipos seleccionados.");
    const n = reqs.filter((r) => r.proyecto_id === proyectoId).length + 1;
    const codigo = `REQ-${proyecto?.codigo || "OBRA"}-${String(n).padStart(3, "0")}`;
    const { data: req, error: e1 } = await apuDb
      .from("requerimientos")
      .insert({
        proyecto_id: proyectoId,
        codigo,
        origen,
        cotizacion_id: origen === "cotizacion" ? cotizacionId : null,
        observacion: origen === "cotizacion" ? `Desdoblamiento de APU de ${cotizacion?.codigo ?? "cotización"}` : "Generado por explosión de insumos",
      })
      .select("id")
      .single();
    if (e1) return setError(e1.message);
    const { data: creados, error: e2 } = await apuDb.from("requerimiento_items").insert(
      filas.map((e) => ({
        requerimiento_id: req.id,
        insumo_id: e.insumoId,
        tipo: e.tipo,
        descripcion: e.nombre,
        unidad: e.unidad,
        cantidad: Math.round(e.saldo * 10000) / 10000,
        precio_referencial: e.precio,
      })),
    ).select("id");
    if (e2) return setError(e2.message);
    const origenesFilas = (creados ?? []).flatMap((it: { id: string }, idx: number) =>
      (filas[idx]?.origenes ?? []).map((o) => ({
        requerimiento_item_id: it.id,
        cotizacion_item_id: origen === "cotizacion" ? o.partidaId : null,
        partida_codigo: o.codigo,
        partida_nombre: o.nombre,
        metrado: o.metrado,
        cantidad_unitaria: Math.round(o.unitaria * 1e6) / 1e6,
        cantidad: Math.round(o.cantidad * 1e4) / 1e4,
      })),
    );
    if (origenesFilas.length) {
      const { error: e3 } = await apuDb.from("requerimiento_item_origenes").insert(origenesFilas);
      if (e3) return setError(e3.message);
    }
    qc.invalidateQueries({ queryKey: ["requerimiento_item_origenes"] });
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
    const ref = origen === "cotizacion" ? cotizacion?.codigo : proyecto?.codigo;
    exportarExcel(`desdoblamiento-insumos-${ref || "obra"}`, [
      {
        nombre: "Consolidado",
        filas: explosion.map((e) => ({
          Tipo: nombreTipo(e.tipo),
          Insumo: e.nombre,
          Unidad: e.unidad,
          Partidas: e.partidas,
          "Cantidad total": Number(e.total.toFixed(4)),
          "Ya requerido": Number(e.requerido.toFixed(4)),
          "Saldo por requerir": Number(e.saldo.toFixed(4)),
          ...(gestiona
            ? { "Precio (S/)": e.precio, "Parcial (S/)": Math.round(e.total * e.precio * 100) / 100 }
            : {}),
        })),
      },
      {
        nombre: "Origen por partida",
        filas: explosion.flatMap((e) =>
          e.origenes.map((o) => ({
            Tipo: nombreTipo(e.tipo),
            Insumo: e.nombre,
            Unidad: e.unidad,
            "Código partida": o.codigo,
            Partida: o.nombre,
            Metrado: Number(o.metrado.toFixed(4)),
            "Cantidad APU": Number(o.unitaria.toFixed(6)),
            Subtotal: Number(o.cantidad.toFixed(4)),
          })),
        ),
      },
    ]);
  }

  const cols = gestiona ? 8 : 6;
  const filaInsumo = (e: (typeof explosion)[number], incluido: boolean, conTipo: boolean) => {
    const ver = expandidos.has(e.clave);
    return (
      <React.Fragment key={e.clave}>
        <tr className={`border-b border-line/40 ${incluido ? "" : "opacity-60"}`}>
          <td className="truncate px-5 py-1.5 text-ink">
            <button type="button" onClick={() => alternar(e.clave)} className="inline-flex max-w-full items-center gap-1 text-left" title="Ver origen por partida">
              {ver ? <ChevronDown size={13} className="shrink-0 text-primary" /> : <ChevronRight size={13} className="shrink-0 text-primary" />}
              <span className="truncate">{e.nombre}</span>
              {conTipo && <span className="ml-1 shrink-0 text-[10px] text-muted-foreground">· {nombreTipo(e.tipo)}</span>}
            </button>
          </td>
          <td className="px-2 py-1.5 text-muted-foreground">{e.unidad}</td>
          <td className="px-2 py-1.5 text-center text-muted-foreground">{e.partidas}</td>
          <td className="px-2 py-1.5 text-right">{num(e.total)}</td>
          <td className="px-2 py-1.5 text-right text-muted-foreground">{num(e.requerido)}</td>
          <td className={`px-2 py-1.5 text-right font-semibold ${e.saldo > 0 ? "text-ink" : "text-muted-foreground"}`}>{num(e.saldo)}</td>
          {gestiona && <td className="px-2 py-1.5 text-right">{num(e.precio)}</td>}
          {gestiona && <td className="px-5 py-1.5 text-right">{soles(e.total * e.precio)}</td>}
        </tr>
        {ver &&
          e.origenes.map((o, i) => (
            <tr key={`${e.clave}-${i}`} className="border-b border-line/20 bg-muted/20 text-[11px] text-muted-foreground">
              <td className="truncate px-5 py-1 pl-11" colSpan={2}>
                <span className="text-primary">{o.codigo || "—"}</span> {o.nombre}
              </td>
              <td className="px-2 py-1 text-right" colSpan={2}>
                {num(o.metrado)} × {num(o.unitaria, 4)} = <span className="text-ink">{num(o.cantidad)}</span>
              </td>
              <td colSpan={cols - 4} />
            </tr>
          ))}
      </React.Fragment>
    );
  };

  return (
    <>
      <Encabezado
        titulo="Requerimientos"
        subtitulo="Logística"
        acciones={
          listo && explosion.length > 0 ? (
            <Boton variante="linea" onClick={exportar}>
              <Upload size={14} className="mr-1 inline" /> Exportar a Excel
            </Boton>
          ) : null
        }
      />

      <Panel titulo="Desdoblamiento de APU en insumos" className="mb-5">
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3 font-mono text-xs">
          <label>
            <span className="label-mono">Origen</span>
            <Select className="mt-1" value={origen} onChange={(e) => { setOrigen(e.target.value as "obra" | "cotizacion"); setExpandidos(new Set()); }}>
              <option value="cotizacion">Desde cotización aprobada</option>
              <option value="obra">Desde obra</option>
            </Select>
          </label>
          <label className="min-w-64 flex-1">
            <span className="label-mono">{origen === "obra" ? "Obra" : "Cotización aprobada"}</span>
            {origen === "obra" ? (
              <Select className="mt-1" value={proyectoSel} onChange={(e) => setProyectoSel(e.target.value)}>
                <option value="">Seleccionar obra…</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre}</option>
                ))}
              </Select>
            ) : (
              <Select className="mt-1" value={cotizacionId} onChange={(e) => setCotizacionId(e.target.value)}>
                <option value="">{cotizaciones.length ? "Seleccionar cotización…" : "No hay cotizaciones aprobadas"}</option>
                {cotizaciones.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}{c.cliente ? ` — ${c.cliente}` : ""}</option>
                ))}
              </Select>
            )}
          </label>
          <div className="flex overflow-hidden rounded border border-line">
            {(["tipo", "consolidada"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setVista(v)} className={`px-3 py-1.5 ${vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {v === "tipo" ? "Por tipo" : "Consolidada"}
              </button>
            ))}
          </div>
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
          {listo && (
            <Boton onClick={() => void generar()}>
              <Zap size={14} className="mr-1 inline" /> Generar requerimiento
            </Boton>
          )}
        </div>
        {error && <p className="px-5 pt-3 font-mono text-xs text-bad">{error}</p>}
        {aviso && <p className="px-5 pt-3 font-mono text-xs text-primary">{aviso}</p>}

        {!listo ? (
          <Vacio texto={origen === "obra" ? "Selecciona una obra para calcular sus insumos a partir del análisis de precios de cada partida." : "Selecciona una cotización aprobada: cada partida se desdobla en sus insumos (metrado × cantidad del APU)."} />
        ) : explosion.length === 0 ? (
          <Vacio texto="Las partidas todavía no tienen análisis de precios unitarios." />
        ) : (
          <>
            <p className="px-5 pt-3 font-mono text-[11px] text-muted-foreground">
              Cantidad total = metrado de la partida × cantidad del insumo en su APU. Pulsa un insumo para ver de qué partidas proviene.
              {sinApu > 0 && ` ${sinApu} de ${hojas.length} partidas no tienen APU y no se incluyen.`}
            </p>
            <table className="mt-2 w-full table-fixed font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="w-[32%] px-5 py-2 font-medium">Insumo</th>
                  <th className="w-[6%] px-2 py-2 font-medium">Und.</th>
                  <th className="w-[7%] px-2 py-2 text-center font-medium">Partidas</th>
                  <th className="w-[11%] px-2 py-2 text-right font-medium">Cantidad total</th>
                  <th className="w-[11%] px-2 py-2 text-right font-medium">Ya requerido</th>
                  <th className="w-[11%] px-2 py-2 text-right font-medium">Saldo</th>
                  {gestiona && <th className="w-[9%] px-2 py-2 text-right font-medium">Precio</th>}
                  {gestiona && <th className="w-[13%] px-5 py-2 text-right font-medium">Parcial</th>}
                </tr>
              </thead>
              <tbody>
                {vista === "consolidada"
                  ? explosion.map((e) => filaInsumo(e, tipos.includes(e.tipo as TipoInsumo), true))
                  : TIPOS_INSUMO.map(([k, t]) => {
                      const filas = explosion.filter((e) => e.tipo === k);
                      if (!filas.length) return null;
                      const incluido = tipos.includes(k);
                      return (
                        <React.Fragment key={k}>
                          <tr className="bg-muted/40">
                            <td colSpan={gestiona ? cols - 1 : cols} className="px-5 py-1.5 font-semibold text-primary">
                              {t} {!incluido && <span className="ml-1 text-[10px] font-normal text-muted-foreground">(no se incluye en el requerimiento)</span>}
                            </td>
                            {gestiona && (
                              <td className="px-5 py-1.5 text-right font-semibold">
                                {soles(filas.reduce((s, e) => s + e.total * e.precio, 0))}
                              </td>
                            )}
                          </tr>
                          {filas.map((e) => filaInsumo(e, incluido, false))}
                        </React.Fragment>
                      );
                    })}
              </tbody>
            </table>
          </>
        )}
      </Panel>

      <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1" titulo="Requerimientos registrados">
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
              </tr>
            </thead>
            <tbody>
              {reqsVisibles.map((r) => {
                const its = reqItems.filter((i) => i.requerimiento_id === r.id);
                const ver = abierto === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr onClick={() => setSel(r.id)} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === r.id ? "bg-primary/10" : ""}`}>
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
                        <Etiqueta tono={tonoEstadoReq(r.estado)}>{r.estado}</Etiqueta>
                        {r.clase === "tdr" && <span className="ml-1 text-[10px] text-muted-foreground">TDR</span>}
                        {r.estado === "Rechazado" && r.motivo_rechazo && <span className="ml-1 text-[10px] text-bad" title={r.motivo_rechazo}>· {r.motivo_rechazo}</span>}
                      </td>

                    </tr>
                    {ver &&
                      its.flatMap((i) => [(
                        <tr key={i.id} className="border-b border-line/30 bg-muted/10">
                          <td className="px-5 py-1.5 pl-10 text-[10px] text-muted-foreground">{nombreTipo(i.tipo)}</td>
                          <td className="px-3 py-1.5">{i.descripcion}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{i.unidad}</td>
                          <td className="px-3 py-1.5 text-right">{num(Number(i.cantidad))}</td>
                          {gestiona && <td className="px-3 py-1.5 text-right">{soles(Number(i.cantidad) * Number(i.precio_referencial))}</td>}
                          <td />
                        </tr>
                      ), ...origenesReq
                        .filter((o) => o.requerimiento_item_id === i.id)
                        .map((o) => (
                          <tr key={o.id} className="border-b border-line/20 text-[11px] text-muted-foreground">
                            <td />
                            <td className="truncate px-3 py-1 pl-6" colSpan={2}><span className="text-primary">{o.partida_codigo || "—"}</span> {o.partida_nombre}</td>
                            <td className="px-3 py-1 text-right">{num(Number(o.metrado))} × {num(Number(o.cantidad_unitaria), 4)} = {num(Number(o.cantidad))}</td>
                            <td colSpan={gestiona ? 2 : 1} />
                          </tr>
                        ))])}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja
        objeto="requerimiento"
        filtros={<MenuFiltros activos={busqueda ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={reqsVisibles.length} placeholder="Buscar por código, obra u observación..." /></MenuFiltros>}
        haySeleccion={!!actual}
        onEliminar={actual && (gestiona || ["Enviado a Gerencia", "Rechazado"].includes(actual.estado)) ? () => void eliminar(actual.id) : undefined}
        extras={
          <BotonIcono etiqueta="Nuevo requerimiento con términos de referencia" disabled={!proyectoId} onClick={() => { setTdr(TDR_VACIO); setVentanaTdr(true); }}>
            <FileText size={15} />
          </BotonIcono>
        }
      />
      </div>

      <div className="mt-5 flex items-start gap-3">
        <Panel className="min-w-0 flex-1" titulo="Recepción en obra">
          {ocsObra.length === 0 ? (
            <Vacio texto={proyectoId ? "No hay órdenes de compra enviadas a esta obra." : "Selecciona una obra para ver las compras enviadas."} />
          ) : (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Orden</th>
                  <th className="px-3 py-2 font-medium">Requerimiento</th>
                  <th className="px-3 py-2 font-medium">Fecha entrega</th>
                  <th className="px-3 py-2 text-right font-medium">Ítems</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-5 py-2 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ocsObra.map((o) => (
                  <tr key={o.id} className="border-b border-line/40">
                    <td className="px-5 py-1.5 text-primary">{o.codigo}</td>
                    <td className="px-3 py-1.5">{reqs.find((r) => r.id === o.requerimiento_id)?.codigo ?? "—"}</td>
                    <td className="px-3 py-1.5">{o.fecha_entrega ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">{itemsOC.filter((i) => i.orden_id === o.id).length}</td>
                    <td className="px-3 py-1.5"><Etiqueta tono={o.estado === "Recibida" ? "good" : o.estado === "Recibida parcial" ? "warn" : "neutro"}>{o.estado}</Etiqueta></td>
                    <td className="px-5 py-1.5 text-right">
                      {(o.estado === "Enviado a obra" || o.estado === "Recibida parcial") && (
                        <Boton variante="linea" className="py-0.5 text-xs" onClick={() => abrirRecepcion(o.id)}>
                          <PackageCheck size={13} className="mr-1 inline" /> Recepcionar
                        </Boton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <VentanaFlotante abierta={ventanaTdr} onCerrar={() => setVentanaTdr(false)} titulo="Términos de Referencia" subtitulo={`Subcontratos, servicios y alquileres · ${proyecto ? nombreProy(proyecto.id) : ""}`} ancho="max-w-3xl">
        <form className="grid grid-cols-2 gap-3 p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardarTdr(); }}>
          <Campo etiqueta="Tipo">
            <Select value={tdr.tipo} onChange={(e) => setTdr({ ...tdr, tipo: e.target.value })}>
              {["Subcontrato", "Servicio", "Alquiler"].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Partida vinculada">
            <Select value={tdr.partida} onChange={(e) => setTdr({ ...tdr, partida: e.target.value })}>
              <option value="">Sin partida</option>
              {hojasObra.map((h) => <option key={h.id} value={`${h.codigo} ${h.nombre}`.trim()}>{h.codigo} {h.nombre}</option>)}
            </Select>
          </Campo>
          <div className="col-span-2"><Campo etiqueta="Objeto de la contratación"><Input required value={tdr.objeto} onChange={(e) => setTdr({ ...tdr, objeto: e.target.value })} /></Campo></div>
          {([["alcance", "Alcance"], ["entregables", "Entregables"], ["condiciones", "Condiciones y requisitos"]] as const).map(([k, t]) => (
            <div key={k} className="col-span-2">
              <Campo etiqueta={t}>
                <textarea className="min-h-16 w-full rounded border border-line bg-background px-2 py-1.5 text-xs" value={tdr[k]} onChange={(e) => setTdr({ ...tdr, [k]: e.target.value })} />
              </Campo>
            </div>
          ))}
          <Campo etiqueta="Plazo de ejecución"><Input value={tdr.plazo} onChange={(e) => setTdr({ ...tdr, plazo: e.target.value })} placeholder="Ej. 15 días calendario" /></Campo>
          <Campo etiqueta="Lugar"><Input value={tdr.lugar} onChange={(e) => setTdr({ ...tdr, lugar: e.target.value })} /></Campo>
          {gestiona && <Campo etiqueta="Monto referencial (S/)"><Input type="number" step="0.01" value={tdr.referencial} onChange={(e) => setTdr({ ...tdr, referencial: e.target.value })} /></Campo>}
          <div className="col-span-2 flex justify-end gap-2 border-t border-line pt-3">
            <Boton type="button" variante="linea" onClick={() => setVentanaTdr(false)}>Cancelar</Boton>
            <Boton type="submit">Enviar a Gerencia</Boton>
          </div>
        </form>
      </VentanaFlotante>

      <VentanaFlotante abierta={!!recepcion} onCerrar={() => setRecepcion(null)} titulo={`Recepción en obra · ${ordenes.find((o) => o.id === recepcion?.orden)?.codigo ?? ""}`} subtitulo="Registra lo que llegó físicamente a la obra; admite recepción parcial." ancho="max-w-3xl">
        {recepcion && (
          <form className="p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardarRecepcion(); }}>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Campo etiqueta="Fecha de recepción"><Input type="date" value={recepcion.fecha} onChange={(e) => setRecepcion({ ...recepcion, fecha: e.target.value })} /></Campo>
              <Campo etiqueta="Observaciones"><Input value={recepcion.obs} onChange={(e) => setRecepcion({ ...recepcion, obs: e.target.value })} /></Campo>
            </div>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">Ítem</th>
                  <th className="px-2 py-1.5 font-medium">Und.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Ordenado</th>
                  <th className="px-2 py-1.5 text-right font-medium">Recibido</th>
                  <th className="px-2 py-1.5 text-right font-medium">Recibir ahora</th>
                </tr>
              </thead>
              <tbody>
                {itemsOC.filter((i) => i.orden_id === recepcion.orden).map((i) => {
                  const rec = recibidoOC(i.id);
                  return (
                    <tr key={i.id} className="border-b border-line/40">
                      <td className="px-2 py-1">{i.descripcion}</td>
                      <td className="px-2 py-1 text-muted-foreground">{i.unidad}</td>
                      <td className="px-2 py-1 text-right">{num(Number(i.cantidad))}</td>
                      <td className="px-2 py-1 text-right text-muted-foreground">{num(rec)}</td>
                      <td className="px-2 py-1 text-right">
                        <Input type="number" step="0.0001" min="0" max={saldoRecepcion(Number(i.cantidad), rec)} className="w-28 py-0.5 text-right text-xs" value={recepcion.cant[i.id] ?? ""} onChange={(e) => setRecepcion({ ...recepcion, cant: { ...recepcion.cant, [i.id]: e.target.value } })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
              <Boton type="button" variante="linea" onClick={() => setRecepcion(null)}>Cancelar</Boton>
              <Boton type="submit">Registrar recepción</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
    </>
  );
}

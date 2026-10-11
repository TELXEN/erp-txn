import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Etiqueta, Input, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { soles } from "@/lib/format";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useUnidadesMedida } from "@/lib/unidades";
import { siguienteCodigoJerarquico } from "@/lib/banco-apu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any };

type Tabla = "partidas_apu" | "materiales" | "mano_obra" | "equipos_herramientas" | "subcontratos";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = any;

type CampoDef = {
  k: string;
  t: string;
  tipo?: "num" | "sel";
  opciones?: string[];
  soloSi?: (f: Fila) => boolean;
};

const CONFIG: Record<Tabla, { titulo: string; campos: CampoDef[]; columnas: [string, string, "num" | "txt" | "sol"][]; filtro?: string }> = {
  partidas_apu: {
    titulo: "Partidas",
    campos: [
      { k: "codigo_jerarquico", t: "Código jerárquico" },
      { k: "descripcion", t: "Descripción" },
      { k: "unidad", t: "Unidad" },
      { k: "rendimiento_diario", t: "Rendimiento diario", tipo: "num" },
      { k: "especialidad", t: "Especialidad", tipo: "sel" },
    ],
    columnas: [["codigo_jerarquico", "Código", "txt"], ["descripcion", "Descripción", "txt"], ["unidad", "Und", "txt"], ["rendimiento_diario", "Rend./día", "num"], ["especialidad", "Especialidad", "txt"]],
    filtro: "especialidad",
  },
  materiales: {
    titulo: "Materiales",
    campos: [
      { k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" }, { k: "marca", t: "Marca" },
      { k: "unidad", t: "Unidad" }, { k: "precio_base", t: "Precio base", tipo: "num" }, { k: "margen", t: "Margen %", tipo: "num" },
    ],
    columnas: [["codigo", "Código", "txt"], ["descripcion", "Descripción", "txt"], ["marca", "Marca", "txt"], ["unidad", "Und", "txt"], ["precio_base", "P. base", "sol"], ["margen", "Margen %", "num"], ["costo_unitario", "C. unitario", "sol"]],
    filtro: "marca",
  },
  mano_obra: {
    titulo: "Mano de Obra",
    campos: [{ k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" }, { k: "unidad", t: "Unidad" }, { k: "costo_hora", t: "Costo hora", tipo: "num" }],
    columnas: [["codigo", "Código", "txt"], ["descripcion", "Descripción", "txt"], ["unidad", "Und", "txt"], ["costo_hora", "Costo hora", "sol"]],
  },
  equipos_herramientas: {
    titulo: "Equipos/Herramientas",
    campos: [
      { k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" },
      { k: "tipo", t: "Tipo", tipo: "sel", opciones: ["propio", "alquilado"] },
      { k: "unidad", t: "Unidad", tipo: "sel", opciones: ["H-M", "%"] },
      { k: "costo_hora", t: "Costo hora / %", tipo: "num" },
      { k: "margen", t: "Margen %", tipo: "num", soloSi: (f) => f.tipo === "alquilado" },
    ],
    columnas: [["codigo", "Código", "txt"], ["descripcion", "Descripción", "txt"], ["tipo", "Tipo", "txt"], ["unidad", "Und", "txt"], ["costo_hora", "Costo hora", "sol"], ["margen", "Margen %", "num"], ["costo_unitario", "C. unitario", "sol"]],
    filtro: "tipo",
  },
  subcontratos: {
    titulo: "Subcontratos",
    campos: [{ k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" }, { k: "unidad", t: "Unidad" }, { k: "costo", t: "Costo", tipo: "num" }, { k: "margen", t: "Margen %", tipo: "num" }],
    columnas: [["codigo", "Código", "txt"], ["descripcion", "Descripción", "txt"], ["unidad", "Und", "txt"], ["costo", "Costo", "sol"], ["margen", "Margen %", "num"], ["costo_unitario", "C. unitario", "sol"]],
  },
};

const TABS = Object.keys(CONFIG) as Tabla[];

const useTabla = (t: Tabla | "partida_detalle") =>
  useQuery({
    queryKey: ["banco_apu", t],
    queryFn: async () => {
      const { data, error } = await db.from(t).select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Fila[];
    },
  });

export function BancoApu() {
  const [tab, setTab] = useState<Tabla>(() =>
    (typeof window !== "undefined" && (localStorage.getItem("banco-apu:tab") as Tabla)) || "partidas_apu",
  );
  const cambiar = (t: Tabla) => { setTab(t); localStorage.setItem("banco-apu:tab", t); };
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => cambiar(t)}
            className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${tab === t ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}>
            {CONFIG[t].titulo}
          </button>
        ))}
      </div>
      {tab === "partidas_apu" ? <SplitPartidas /> : <ListaBanco key={tab} tabla={tab} />}
    </>
  );
}

function SplitPartidas() {
  const [sel, setSel] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("banco-apu:partida")) || "");
  const elegir = (id: string) => { setSel(id); localStorage.setItem("banco-apu:partida", id); };
  const { data: pa = [] } = useTabla("partidas_apu");
  const partida = pa.find((p) => p.id === sel);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0"><ListaBanco tabla="partidas_apu" seleccion={sel} onSeleccion={elegir} /></div>
      <div className="min-w-0">
        {partida ? <PanelApuMaestro partida={partida} /> : <Panel titulo="Análisis de precios unitarios"><Vacio texto="Elige una partida a la izquierda para ver y armar su APU." /></Panel>}
      </div>
    </div>
  );
}

function ListaBanco({ tabla, seleccion, onSeleccion }: { tabla: Tabla; seleccion?: string; onSeleccion?: (id: string) => void }) {
  const cfg = CONFIG[tabla];
  const qc = useQueryClient();
  const { data: filasRaw = [] } = useTabla(tabla);
  const filas = tabla === "partidas_apu"
    ? [...filasRaw].sort((a, b) => String(a.codigo_jerarquico ?? "").localeCompare(String(b.codigo_jerarquico ?? ""), "es", { numeric: true }))
    : filasRaw;
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [estado, setEstado] = useState("activo");
  const [form, setForm] = useState<Fila | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState("");

  const opcionesFiltro = useMemo(
    () => (cfg.filtro ? [...new Set(filas.map((f) => String(f[cfg.filtro!] ?? "")).filter(Boolean))].sort() : []),
    [filas, cfg.filtro],
  );
  const visibles = filas.filter(
    (f) =>
      (!estado || f.estado === estado) &&
      (!filtro || String(f[cfg.filtro!]) === filtro) &&
      coincide(busqueda, ...cfg.columnas.map(([k]) => f[k])),
  );
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu"] });

  function abrir(f?: Fila) {
    const base: Fila = {};
    for (const c of cfg.campos) base[c.k] = f ? String(f[c.k] ?? "") : c.opciones?.[0] ?? (c.tipo === "num" ? "0" : "");
    if (!f && tabla === "mano_obra") base.unidad = "H-H";
    if (!f && tabla === "partidas_apu") base.rendimiento_diario = "1";
    setEditId(f?.id ?? null);
    setForm(base);
    setAviso("");
  }

  async function guardar(cerrar: boolean) {
    if (!form) return;
    if (!form.descripcion?.trim()) return setAviso("Escribe la descripción.");
    const datos: Record<string, unknown> = {};
    for (const c of cfg.campos) datos[c.k] = c.tipo === "num" ? Number(form[c.k] || 0) : form[c.k]?.trim() ?? "";
    if (tabla === "equipos_herramientas" && form.tipo !== "alquilado") datos["margen"] = 0;
    const { error } = editId ? await db.from(tabla).update(datos).eq("id", editId) : await db.from(tabla).insert(datos);
    if (error) return setAviso(error.message);
    refrescar();
    if (cerrar || editId) setForm(null);
    else { abrir(); setAviso("Guardado. Puedes registrar el siguiente."); }
  }

  async function quitar(f: Fila) {
    if (!window.confirm(`¿Quitar «${f.descripcion}»?`)) return;
    const { data, error } = await db.rpc("quitar_recurso_apu", { _tabla: tabla, _id: f.id });
    if (error) return window.alert(error.message);
    if (data === "inactivado") window.alert("Está en uso en una o más partidas: se marcó como Inactivo en lugar de eliminarse.");
    refrescar();
  }

  async function reactivar(f: Fila) {
    await db.from(tabla).update({ estado: "activo" }).eq("id", f.id);
    refrescar();
  }

  return (
    <>
    <Panel
      titulo={cfg.titulo}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <Buscador valor={busqueda} onChange={setBusqueda} total={visibles.length} />
          {cfg.filtro && (
            <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-40 py-1.5 text-xs">
              <option value="">Todas ({cfg.filtro})</option>
              {opcionesFiltro.map((o) => <option key={o}>{o}</option>)}
            </Select>
          )}
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-32 py-1.5 text-xs">
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="">Todos</option>
          </Select>
          <Boton onClick={() => (tabla === "partidas_apu" ? setNueva(true) : abrir())}><Plus size={13} /> Aumentar</Boton>
        </div>
      }
    >
      {visibles.length === 0 ? (
        <Vacio texto="Sin registros." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left label-mono">
                {cfg.columnas.map(([k, t, tp]) => <th key={k} className={`px-4 py-2 ${tp !== "txt" ? "text-right" : ""}`}>{t}</th>)}
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.id} className={`border-b border-line/60 hover:bg-muted/40 ${onSeleccion ? "cursor-pointer" : ""} ${seleccion === f.id ? "bg-primary/10" : ""}`}
                  onClick={() => onSeleccion?.(f.id)}>
                  {cfg.columnas.map(([k, , tp]) => (
                    <td key={k} className={`px-4 py-2 ${tp !== "txt" ? "text-right font-mono" : ""}`}>
                      {tp === "sol" ? soles(Number(f[k] ?? 0)) : tp === "num" ? Number(f[k] ?? 0).toLocaleString("es-PE") : <Resaltar texto={f[k]} termino={busqueda} />}
                    </td>
                  ))}
                  <td className="px-4 py-2"><Etiqueta tono={f.estado === "activo" ? "good" : "neutro"}>{f.estado === "activo" ? "Activo" : "Inactivo"}</Etiqueta></td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {onSeleccion && <BotonIcono etiqueta="Análisis (receta APU)" tono="primario" onClick={() => onSeleccion(f.id)}><Calculator size={14} /></BotonIcono>}
                      <BotonIcono etiqueta="Editar" onClick={() => abrir(f)}><Pencil size={14} /></BotonIcono>
                      {f.estado === "activo"
                        ? <BotonIcono etiqueta="Quitar" tono="peligro" onClick={() => quitar(f)}><Trash2 size={14} /></BotonIcono>
                        : <Boton variante="linea" className="py-1" onClick={() => reactivar(f)}>Reactivar</Boton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VentanaFlotante abierta={!!form} onCerrar={() => setForm(null)} ancho="max-w-2xl"
        titulo={`${editId ? "Editar" : "Nuevo"} — ${cfg.titulo}`}>
        {form && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(false); }}>
            {cfg.campos.filter((c) => !c.soloSi || c.soloSi(form)).map((c) => (
              <Campo key={c.k} etiqueta={c.t}>
                {c.tipo === "sel" ? (
                  <Select value={form[c.k]} onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}>
                    {c.k === "especialidad" && <option value="">—</option>}
                    {(c.opciones ?? especialidades.map((e: { nombre: string }) => e.nombre)).map((o) => <option key={o}>{o}</option>)}
                  </Select>
                ) : (
                  <Input type={c.tipo === "num" ? "number" : "text"} step="any" value={form[c.k]} autoFocus={c.k === "descripcion"}
                    onChange={(e) => setForm({ ...form, [c.k]: e.target.value })} />
                )}
              </Campo>
            ))}
            {aviso && <p className="text-xs text-muted-foreground sm:col-span-2">{aviso}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Boton type="button" variante="linea" onClick={() => setForm(null)}>Cerrar</Boton>
              <Boton type="submit">Guardar</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>

    </Panel>
      {nueva && (
        <DialogoNuevaPartida partidas={filasRaw} onCerrar={() => setNueva(false)}
          onGuardado={(id) => { setNueva(false); setEstado("activo"); setFiltro(""); setBusqueda(""); refrescar(); onSeleccion?.(id); }} />
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Detalle = any;

const BANCOS = [
  ["material_id", "materiales", "Materiales"],
  ["mano_obra_id", "mano_obra", "Mano de Obra"],
  ["equipo_id", "equipos_herramientas", "Equipos/Herramientas"],
  ["subcontrato_id", "subcontratos", "Subcontratos"],
  ["subpartida_hijo_id", "partidas_apu", "Subpartidas"],
] as const;

const GRUPOS = [
  ["mano_obra_id", "mano_obra", "MANO DE OBRA"],
  ["material_id", "materiales", "MATERIALES"],
  ["equipo_id", "equipos_herramientas", "EQUIPOS Y HERRAMIENTAS"],
  ["subcontrato_id", "subcontratos", "SUBCONTRATOS"],
  ["subpartida_hijo_id", "partidas_apu", "SUBPARTIDAS"],
] as const;
type Grupo = (typeof GRUPOS)[number];

function PanelApuMaestro({ partida }: { partida: Fila }) {
  const qc = useQueryClient();
  const { data: det = [] } = useTabla("partida_detalle");
  const { data: mat = [] } = useTabla("materiales");
  const { data: mo = [] } = useTabla("mano_obra");
  const { data: eq = [] } = useTabla("equipos_herramientas");
  const { data: sc = [] } = useTabla("subcontratos");
  const { data: pa = [] } = useTabla("partidas_apu");
  const fuentes: Record<string, Fila[]> = { materiales: mat, mano_obra: mo, equipos_herramientas: eq, subcontratos: sc, partidas_apu: pa };
  const [cerrados, setCerrados] = useState<Record<string, boolean>>({});
  const [agregar, setAgregar] = useState<Grupo | null>(null);
  const detalles = det as Detalle[];

  type FilaC = { d: Detalle; col: string; nombre: string; und: string; cu: number; parcial: number; pct?: boolean };
  const costo = (id: string, visitados = new Set<string>()): { total: number; filas: FilaC[] } => {
    if (visitados.has(id)) return { total: 0, filas: [] };
    visitados.add(id);
    const p = pa.find((x) => x.id === id);
    const rend = Number(p?.rendimiento_diario) || 1;
    const filas: FilaC[] = detalles.filter((d) => d.partida_padre_id === id).map((d) => {
      const [col, tabla] = GRUPOS.find(([c]) => d[c]) ?? GRUPOS[0];
      const r = (fuentes[tabla] ?? []).find((x) => x.id === d[col]);
      const q = Number(d.cantidad_o_cuadrilla);
      let cu = 0, parcial = 0;
      if (tabla === "partidas_apu") { cu = costo(d[col] as string, new Set(visitados)).total; parcial = q * cu; }
      else if (tabla === "mano_obra") { cu = Number(r?.costo_hora ?? 0); parcial = (q * 8 * cu) / rend; }
      else if (tabla === "equipos_herramientas" && r?.unidad === "H-M") { cu = Number(r?.costo_unitario ?? 0); parcial = (q * 8 * cu) / rend; }
      else { cu = Number(r?.costo_unitario ?? 0); parcial = q * cu; }
      return { d, col, nombre: r?.descripcion ?? "(no encontrado)", und: r?.unidad ?? "", cu, parcial, pct: tabla === "equipos_herramientas" && r?.unidad === "%" };
    });
    const totalMo = filas.filter((f) => f.col === "mano_obra_id").reduce((s, f) => s + f.parcial, 0);
    for (const f of filas) if (f.pct) f.parcial = (totalMo * f.cu * Number(f.d.cantidad_o_cuadrilla)) / 100;
    return { total: filas.reduce((s, f) => s + f.parcial, 0), filas };
  };
  const calc = costo(partida.id);
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", "partida_detalle"] });

  async function cambiarCant(id: string, v: string) {
    await db.from("partida_detalle").update({ cantidad_o_cuadrilla: Number(v || 0) }).eq("id", id);
    refrescar();
  }
  async function quitarFila(id: string) {
    await db.from("partida_detalle").delete().eq("id", id);
    refrescar();
  }

  return (
    <>
    <Panel titulo={`${partida.codigo_jerarquico || "s/c"} · ${partida.descripcion}`}>
      <div className="px-5 py-4"><p className="mb-3 text-xs text-muted-foreground">{partida.unidad} · Rendimiento {partida.rendimiento_diario}/día{partida.especialidad ? ` · ${partida.especialidad}` : ""}</p>
      <div className="space-y-3">
        {GRUPOS.map((g) => {
          const [col, , titulo] = g;
          const filas = calc.filas.filter((f) => f.col === col);
          const sub = filas.reduce((s, f) => s + f.parcial, 0);
          const cerrado = cerrados[col];
          return (
            <div key={col} className="rounded-md border border-line">
              <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5">
                <button type="button" className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-primary"
                  onClick={() => setCerrados({ ...cerrados, [col]: !cerrado })}>
                  {cerrado ? "▸" : "▾"} {titulo} <span className="font-normal text-muted-foreground">({filas.length})</span>
                </button>
                <span className="shrink-0 font-mono text-xs">{soles(sub)}</span>
                <BotonIcono etiqueta={`Agregar a ${titulo.toLowerCase()}`} tono="primario" onClick={() => setAgregar(g)}><Plus size={14} /></BotonIcono>
              </div>
              {!cerrado && filas.length > 0 && (
                <table className="w-full text-xs">
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.d.id} className="border-t border-line/60">
                        <td className="px-2 py-1">{f.nombre}<span className="ml-1 text-muted-foreground">{f.und}</span></td>
                        <td className="w-20 px-1 py-1">
                          <Input type="number" step="any" defaultValue={f.d.cantidad_o_cuadrilla} className="py-0.5 text-right text-xs"
                            onBlur={(e) => Number(e.target.value) !== Number(f.d.cantidad_o_cuadrilla) && cambiarCant(f.d.id, e.target.value)} />
                        </td>
                        <td className="px-2 py-1 text-right font-mono">{soles(f.cu)}</td>
                        <td className="px-2 py-1 text-right font-mono">{soles(f.parcial)}</td>
                        <td className="w-8 px-1"><BotonIcono etiqueta="Quitar fila" tono="peligro" onClick={() => quitarFila(f.d.id)}><X size={13} /></BotonIcono></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
        <span className="text-sm font-semibold">Costo total del APU</span>
        <span className="font-mono text-sm font-semibold text-primary">{soles(calc.total)}</span>
      </div>
      </div>
    </Panel>
      {agregar && (
        <DialogoAgregarInsumo grupo={agregar} partida={partida} opciones={(fuentes[agregar[1]] ?? []).filter((x) => x.estado === "activo" && x.id !== partida.id)}
          existentes={detalles.filter((d) => d.partida_padre_id === partida.id)}
          onCerrar={() => setAgregar(null)} onGuardado={() => { setAgregar(null); refrescar(); }} />
      )}
    </>
  );
}

function DialogoAgregarInsumo({ grupo, partida, opciones, existentes, onCerrar, onGuardado }: {
  grupo: Grupo; partida: Fila; opciones: Fila[]; existentes: Detalle[]; onCerrar: () => void; onGuardado: () => void;
}) {
  const [col, , titulo] = grupo;
  const [q, setQ] = useState("");
  const [elegido, setElegido] = useState<Fila | null>(null);
  const [cant, setCant] = useState("");
  const [error, setError] = useState("");
  const lista = opciones.filter((o) => coincide(q, o.codigo ?? o.codigo_jerarquico, o.descripcion, o.marca)).slice(0, 50);

  async function guardar() {
    if (!elegido) return setError("Elige un insumo.");
    const n = Number(cant);
    if (!(n > 0)) return setError("Ingresa la cantidad / cuadrilla (mayor que 0).");
    const ya = existentes.find((d) => d[col] === elegido.id);
    if (ya) {
      if (!window.confirm(`«${elegido.descripcion}» ya está en el APU. ¿Sumar ${n} a su cantidad actual (${ya.cantidad_o_cuadrilla})?`)) return;
      const { error: e } = await db.from("partida_detalle").update({ cantidad_o_cuadrilla: Number(ya.cantidad_o_cuadrilla) + n }).eq("id", ya.id);
      if (e) return setError(e.message);
    } else {
      const { error: e } = await db.from("partida_detalle").insert({ partida_padre_id: partida.id, [col]: elegido.id, cantidad_o_cuadrilla: n });
      if (e) return setError(e.message);
    }
    onGuardado();
  }

  return (
    <VentanaFlotante abierta onCerrar={onCerrar} ancho="max-w-xl" titulo={`Agregar — ${titulo}`} subtitulo={partida.descripcion}>
      {!elegido ? (
        <div className="p-5">
          <Input autoFocus placeholder="Busca por código, descripción o marca…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-line">
            {lista.length === 0 && <Vacio texto="Sin coincidencias." />}
            {lista.map((o) => (
              <button key={o.id} type="button" onClick={() => setElegido(o)}
                className="flex w-full items-center gap-2 border-b border-line/60 px-3 py-1.5 text-left text-xs hover:bg-primary/10">
                <span className="w-24 shrink-0 font-mono text-muted-foreground">{o.codigo ?? o.codigo_jerarquico ?? ""}</span>
                <span className="min-w-0 flex-1 truncate"><Resaltar texto={o.descripcion} termino={q} /></span>
                {o.marca && <span className="shrink-0 text-muted-foreground">{o.marca}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form className="space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
          <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{elegido.codigo ?? elegido.codigo_jerarquico} · {elegido.descripcion}{elegido.marca ? ` · ${elegido.marca}` : ""}</span>
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
      {!elegido && error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </VentanaFlotante>
  );
}

function DialogoNuevaPartida({ partidas, onCerrar, onGuardado }: { partidas: Fila[]; onCerrar: () => void; onGuardado: (id: string) => void }) {
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: unidades = [] } = useUnidadesMedida();
  const [f, setF] = useState({ especialidad: "", codigo: "", descripcion: "", unidad: "und", rendimiento: "1" });
  const [error, setError] = useState("");
  const listaUnd = unidades.filter((u) => u.activo).map((u) => u.simbolo);
  const unds = listaUnd.length ? listaUnd : ["und", "m", "m2", "m3", "kg", "glb"];

  function elegirEsp(nombre: string) {
    const pref = especialidades.find((e) => e.nombre === nombre)?.codigo ?? "";
    setF({ ...f, especialidad: nombre, codigo: siguienteCodigoJerarquico(partidas.map((p) => String(p.codigo_jerarquico ?? "")), pref) });
  }
  async function guardar() {
    if (!f.descripcion.trim()) return setError("Escribe la descripción.");
    const { data, error: e } = await db.from("partidas_apu").insert({
      especialidad: f.especialidad, codigo_jerarquico: f.codigo.trim(), descripcion: f.descripcion.trim(),
      unidad: f.unidad, rendimiento_diario: Number(f.rendimiento) || 1,
    }).select("id").single();
    if (e) return setError(e.message);
    onGuardado(data.id);
  }

  return (
    <VentanaFlotante abierta onCerrar={onCerrar} ancho="max-w-2xl" titulo="Nueva partida">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <Campo etiqueta="Especialidad">
          <Select value={f.especialidad} onChange={(e) => elegirEsp(e.target.value)}>
            <option value="">—</option>
            {especialidades.filter((e) => e.activo).map((e) => <option key={e.id} value={e.nombre}>{e.codigo} · {e.nombre}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="Código jerárquico (sugerido)">
          <Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo etiqueta="Descripción *">
            <Input autoFocus value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
          </Campo>
        </div>
        <Campo etiqueta="Unidad">
          <Select value={f.unidad} onChange={(e) => setF({ ...f, unidad: e.target.value })}>
            {[...new Set([f.unidad, ...unds])].map((u) => <option key={u}>{u}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="Rendimiento diario">
          <Input type="number" step="any" value={f.rendimiento} onChange={(e) => setF({ ...f, rendimiento: e.target.value })} />
        </Campo>
        {error && <p className="text-xs text-bad sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Boton type="button" variante="linea" onClick={onCerrar}>Cerrar</Boton>
          <Boton type="submit">Guardar</Boton>
        </div>
      </form>
    </VentanaFlotante>
  );
}

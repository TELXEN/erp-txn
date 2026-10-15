import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Etiqueta, Input, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { soles } from "@/lib/format";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useUnidadesMedida } from "@/lib/unidades";
import { siguienteCodigoJerarquico } from "@/lib/banco-apu";
import { r2, r4, sumar2 } from "@/lib/decimal";

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
      <div className="mb-3 flex flex-wrap gap-1 border-b border-line pb-2">
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

const PIE = ["analisis", "especificaciones"] as const;
type Pie = (typeof PIE)[number];
const PIE_TITULOS: Record<Pie, string> = {
  analisis: "Análisis de costo unitario",
  especificaciones: "Especificaciones técnicas",
};

function SplitPartidas() {
  const [sel, setSel] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("banco-apu:partida")) || "");
  const elegir = (id: string) => { setSel(id); localStorage.setItem("banco-apu:partida", id); };
  const [pie, setPie] = useState<Pie>(() => (typeof window !== "undefined" && (localStorage.getItem("banco-apu:pie") as Pie)) || "analisis");
  const elegirPie = (p: Pie) => { setPie(p); localStorage.setItem("banco-apu:pie", p); };
  const { data: pa = [] } = useTabla("partidas_apu");
  const partida = pa.find((p) => p.id === sel);
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:h-[calc(100dvh-240px)] lg:min-h-[400px] lg:grid-cols-12">
      <div className="min-h-0 min-w-0 lg:col-span-7"><ListaBanco tabla="partidas_apu" seleccion={sel} onSeleccion={elegir} llena /></div>
      <div className="flex min-h-[420px] min-w-0 flex-col lg:col-span-5 lg:min-h-0">
        <div className="min-h-0 flex-1">
          {!partida ? (
            <Panel titulo="Análisis de precios unitarios" className="flex h-full flex-col"><div className="min-h-0 flex-1 overflow-y-auto"><Vacio texto="Elige una partida a la izquierda para ver y armar su APU." /></div></Panel>
          ) : pie === "analisis" ? (
            <PanelApuMaestro partida={partida} />
          ) : (
            <PanelEspecificaciones partida={partida} />
          )}
        </div>
        <div className="mt-2 flex shrink-0 flex-wrap items-stretch gap-x-1 border-t border-line">

          {PIE.map((p) => (
            <button key={p} type="button" onClick={() => elegirPie(p)}
              className={`-mt-px border-t-[3px] px-2 py-1 text-[11px] leading-tight transition-colors ${pie === p ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {PIE_TITULOS[p]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListaBanco({ tabla, seleccion, onSeleccion, llena = false }: { tabla: Tabla; seleccion?: string; onSeleccion?: (id: string) => void; llena?: boolean }) {
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
      className={llena ? "flex h-full flex-col" : ""}
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
        <div className={`overflow-x-auto ${llena ? "min-h-0 flex-1 overflow-y-auto" : ""}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left label-mono">
                {cfg.columnas.map(([k, t, tp]) => <th key={k} className={`px-2 py-1 ${tp !== "txt" ? "text-right" : ""}`}>{t}</th>)}
                <th className="px-2 py-1">Estado</th>
                <th className="px-2 py-1 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.id} className={`border-b border-line/60 hover:bg-muted/40 ${onSeleccion ? "cursor-pointer" : ""} ${seleccion === f.id ? "bg-primary/10" : ""}`}
                  onClick={() => onSeleccion?.(f.id)}>
                  {cfg.columnas.map(([k, , tp]) => {
                    const fijo = k === "codigo" || k === "codigo_jerarquico" || k === "unidad";
                    const largo = tp === "txt" && !fijo;
                    const ancho = k === "descripcion" ? "w-full max-w-[1px]" : "max-w-[74px]";
                    return (
                      <td key={k} className={`px-2 py-0.5 ${largo ? ancho : tp !== "txt" ? "whitespace-nowrap text-right font-mono" : k === "codigo" || k === "codigo_jerarquico" ? "whitespace-nowrap font-mono" : "whitespace-nowrap"}`}>
                        <span className={`block ${largo ? "truncate" : ""}`} title={largo ? String(f[k] ?? "") : undefined}>
                          {tp === "sol" ? soles(Number(f[k] ?? 0)) : tp === "num" ? Number(f[k] ?? 0).toLocaleString("es-PE") : <Resaltar texto={f[k]} termino={busqueda} />}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-0.5"><Etiqueta tono={f.estado === "activo" ? "good" : "neutro"}>{f.estado === "activo" ? "Activo" : "Inactivo"}</Etiqueta></td>
                  <td className="px-3 py-0.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {onSeleccion && <BotonIcono etiqueta="Análisis (receta APU)" tono="primario" className="size-6" onClick={() => onSeleccion(f.id)}><Calculator size={13} /></BotonIcono>}
                      <BotonIcono etiqueta="Editar" className="size-6" onClick={() => abrir(f)}><Pencil size={13} /></BotonIcono>
                      {f.estado === "activo"
                        ? <BotonIcono etiqueta="Quitar" tono="peligro" className="size-6" onClick={() => quitar(f)}><Trash2 size={13} /></BotonIcono>
                        : <Boton variante="linea" className="h-6 px-2 py-0 text-[11px]" onClick={() => reactivar(f)}>Reactivar</Boton>}
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
          <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(false); }}>
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

type FilaC = { d: Detalle; col: string; codigo: string; nombre: string; und: string; cu: number; q: number; cant: number; parcial: number; pct?: boolean; horas?: boolean };

function useApuMaestro() {
  const { data: det = [] } = useTabla("partida_detalle");
  const { data: mat = [] } = useTabla("materiales");
  const { data: mo = [] } = useTabla("mano_obra");
  const { data: eq = [] } = useTabla("equipos_herramientas");
  const { data: sc = [] } = useTabla("subcontratos");
  const { data: pa = [] } = useTabla("partidas_apu");
  const fuentes: Record<string, Fila[]> = { materiales: mat, mano_obra: mo, equipos_herramientas: eq, subcontratos: sc, partidas_apu: pa };
  const detalles = det as Detalle[];

  const costo = (id: string, visitados = new Set<string>(), rendForzado?: number, jornadaFija?: number): { total: number; filas: FilaC[] } => {
    if (visitados.has(id)) return { total: 0, filas: [] };
    visitados.add(id);
    const p = pa.find((x) => x.id === id);
    const rend = rendForzado || Number(p?.rendimiento_diario) || 1;
    const jor = jornadaFija ?? 8;
    // 1) Fusionar duplicados del mismo recurso sumando la cuadrilla/cantidad.
    const fusion = new Map<string, Detalle>();
    for (const d of detalles.filter((x) => x.partida_padre_id === id)) {
      const [col] = GRUPOS.find(([c]) => d[c]) ?? GRUPOS[0];
      const clave = `${col}:${d[col]}`;
      const ya = fusion.get(clave);
      if (ya) fusion.set(clave, { ...ya, cantidad_o_cuadrilla: Number(ya.cantidad_o_cuadrilla) + Number(d.cantidad_o_cuadrilla) });
      else fusion.set(clave, d);
    }
    // 2) Calcular cada fila desde cero (cantidades a 4 dp, totales a 2 dp).
    const filas: FilaC[] = [...fusion.values()].map((d) => {
      const [col, tabla] = GRUPOS.find(([c]) => d[c]) ?? GRUPOS[0];
      const r = (fuentes[tabla] ?? []).find((x) => x.id === d[col]);
      const q = Number(d.cantidad_o_cuadrilla) || 0;
      const base = { d, col, codigo: String(r?.codigo ?? r?.codigo_jerarquico ?? ""), nombre: r?.descripcion ?? "(no encontrado)", und: r?.unidad ?? "", q };
      if (tabla === "partidas_apu") { const cu = costo(d[col] as string, new Set(visitados), undefined, jor).total; return { ...base, cu, cant: q, parcial: r2(q * cu) }; }
      if (tabla === "mano_obra" || (tabla === "equipos_herramientas" && r?.unidad === "H-M")) {
        const cu = Number(tabla === "mano_obra" ? r?.costo_hora : r?.costo_unitario) || 0;
        // HH = (cuadrilla × jornada) / rendimiento
        const cant = r4((q * jor) / rend);
        return { ...base, cu, cant, parcial: r2(cant * cu), horas: true };
      }
      if (tabla === "equipos_herramientas" && r?.unidad === "%") return { ...base, cu: Number(r?.costo_hora ?? 0), cant: 0, parcial: 0, pct: true };
      const cu = Number(r?.costo_unitario ?? 0);
      return { ...base, cu, cant: q, parcial: r2(q * cu) };
    });
    const totalMo = sumar2(filas.filter((f) => f.col === "mano_obra_id").map((f) => f.parcial));
    for (const f of filas) if (f.pct) f.parcial = r2((totalMo * f.cu * f.q) / 100);
    return { total: sumar2(filas.map((f) => f.parcial)), filas };
  };

  return { costo, fuentes, detalles, partidas: pa };
}

const n2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n4 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function CeldaNum({ valor, dec, onGuardar, deshabilitado, sufijo }: { sufijo?: string | undefined; valor: number; dec: number; onGuardar?: ((v: number) => void) | undefined; deshabilitado?: boolean | undefined }) {
  if (!onGuardar || deshabilitado)
    return <div className={`flex h-full items-center justify-end font-mono ${deshabilitado ? "text-muted-foreground/50" : ""}`}>{deshabilitado ? "" : dec === 4 ? n4(valor) : n2(valor)}{!deshabilitado && sufijo ? <span className="ml-1 w-7 text-left text-muted-foreground">{sufijo}</span> : null}</div>;
  return (
    <div className="flex h-full items-center"><input key={valor} type="number" step="any" defaultValue={valor.toFixed(dec)}
      className="h-6 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-0.5 text-right font-mono text-[12px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none hover:border-line focus:border-primary focus:bg-background"
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== Number(valor.toFixed(dec))) onGuardar(v); }} />{sufijo ? <span className="ml-0.5 w-7 shrink-0 text-muted-foreground">{sufijo}</span> : null}</div>
  );
}

function PanelApuMaestro({ partida }: { partida: Fila }) {
  const qc = useQueryClient();
  const { costo, fuentes, detalles } = useApuMaestro();
  const [agregar, setAgregar] = useState<Grupo | null>(null);
  const [rendLocal, setRendLocal] = useState<number | null>(null);
  const [editJornada, setEditJornada] = useState(false);
  const [jornada, setJornada] = useState<number>(() => Number(localStorage.getItem(`banco-apu:jornada:${partida.id}`)) || 8);
  useEffect(() => { setRendLocal(null); setEditJornada(false); setJornada(Number(localStorage.getItem(`banco-apu:jornada:${partida.id}`)) || 8); }, [partida.id, partida.rendimiento_diario]);
  const rend = rendLocal ?? (Number(partida.rendimiento_diario) || 1);
  const jornadaEfectiva = editJornada ? jornada : 8;
  const calc = costo(partida.id, new Set(), rend, jornadaEfectiva);
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", "partida_detalle"] });

  // Guarda el valor en la fila fusionada y elimina duplicados del mismo recurso.
  async function guardarQ(f: FilaC, v: number) {
    const dup = detalles.filter((d) => d.partida_padre_id === partida.id && d[f.col] === f.d[f.col] && d.id !== f.d.id);
    await db.from("partida_detalle").update({ cantidad_o_cuadrilla: v }).eq("id", f.d.id);
    if (dup.length) await db.from("partida_detalle").delete().in("id", dup.map((d) => d.id));
    refrescar();
  }
  async function quitarFila(f: FilaC) {
    const ids = detalles.filter((d) => d.partida_padre_id === partida.id && d[f.col] === f.d[f.col]).map((d) => d.id);
    await db.from("partida_detalle").delete().in("id", ids.length ? ids : [f.d.id]);
    refrescar();
  }
  async function guardarRend(v: number) {
    if (!(v > 0)) return setRendLocal(null);
    setRendLocal(v);
    await db.from("partidas_apu").update({ rendimiento_diario: v }).eq("id", partida.id);
    await qc.invalidateQueries({ queryKey: ["banco_apu", "partidas_apu"] });
  }

  const th = "h-[30px] !py-0 border-r border-line px-1 text-[12px] font-semibold text-foreground/80 whitespace-nowrap last:border-r-0";
  const td = "h-[26px] !py-0 leading-none border-r border-line/70 px-1.5 align-middle text-[12px] whitespace-nowrap";
  const totalMo = sumar2(calc.filas.filter((f) => f.col === "mano_obra_id").map((f) => f.parcial));

  return (
    <>
    <Panel titulo={`${partida.codigo_jerarquico || "s/c"} · ${partida.descripcion}`} className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-line bg-muted/50 px-4 py-2 text-[13px] shadow-sm">
        <label className="flex items-center gap-2"><span className="font-bold text-foreground/80">Rend. diario</span>
          <input key={`${partida.id}:${rend}`} type="number" step="0.01" defaultValue={rend.toFixed(2)}
            className="h-7 w-24 rounded border border-line bg-warn/20 px-2 text-right font-mono outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            onBlur={(e) => { const v = Number(e.target.value); if (v !== rend) void guardarRend(v); }} />
          <span className="text-muted-foreground">{partida.unidad}/día</span></label>
        <label className="flex items-center gap-2"><span className="font-bold text-foreground/80">Jornada</span>
          <input key={`jor:${partida.id}:${jornadaEfectiva}`} type="number" step="0.5" min="1" max="24" defaultValue={jornadaEfectiva.toFixed(2)} readOnly={!editJornada} disabled={!editJornada}
            className={`h-7 w-16 rounded border border-line px-2 text-right font-mono outline-none ${editJornada ? "bg-warn/20 focus:border-primary" : "bg-muted text-muted-foreground"}`}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v <= 24 && v !== jornada) { setJornada(v); localStorage.setItem(`banco-apu:jornada:${partida.id}`, String(v)); } }} />
          <span className="text-muted-foreground">h/día</span>
          <input type="checkbox" checked={editJornada} onChange={(e) => setEditJornada(e.target.checked)} title="Editar jornada"
            className="h-4 w-4 cursor-pointer accent-primary" /></label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup><col /><col style={{ width: 34 }} /><col style={{ width: 50 }} /><col style={{ width: 100 }} /><col style={{ width: 34 }} /><col style={{ width: 56 }} /><col style={{ width: 60 }} /><col style={{ width: 24 }} /></colgroup>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-line">
              <th className={`${th} text-left`}>Descripción</th><th className={`${th} text-center`}>Unid.</th>
              <th className={`${th} text-right`}>Recurso</th><th className={`${th} text-right`}>Cantidad</th>
              <th className={`${th} text-right`}>% De…</th><th className={`${th} text-right`}>Precio</th>
              <th className={`${th} text-right`}>Total</th><th />
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map((g) => {
              const [col, , titulo] = g;
              const filas = calc.filas.filter((f) => f.col === col);
                            const sub = sumar2(filas.map((f) => f.parcial));
              return [
                <tr key={col} className="border-b border-line bg-muted/60">
                  <td colSpan={6} className={`${td} font-bold text-foreground/80`}>▾ {titulo}</td>
                  <td className={`${td} text-right font-mono font-bold`}>{n2(sub)}</td>
                  <td className="h-[26px] !py-0 px-0.5"><BotonIcono etiqueta={`Agregar a ${titulo.toLowerCase()}`} tono="primario" className="size-5" onClick={() => setAgregar(g)}><Plus size={13} /></BotonIcono></td>
                </tr>,
                ...filas.map((f) => (
                  <tr key={f.d.id} className="border-b border-line/70 hover:bg-primary/5">
                    <td className={td}><div className="flex min-w-0 items-center gap-1.5">{f.codigo && <span className="hidden shrink-0 2xl:inline font-mono text-[11px] text-muted-foreground">{f.codigo}</span>}<span className="min-w-0 truncate" title={f.nombre}>{f.nombre}</span></div></td>
                    <td className={`${td} text-center text-muted-foreground`}>{f.pct ? "%…" : f.und}</td>
                    <td className={td}><CeldaNum valor={f.q} dec={2} deshabilitado={!f.horas} onGuardar={(v) => guardarQ(f, v)} /></td>
                    <td className={td}>{f.pct ? <CeldaNum valor={f.cu * f.q} dec={4} sufijo="%mo" onGuardar={(v) => f.cu > 0 && guardarQ(f, v / f.cu)} /> : <CeldaNum valor={f.cant} dec={4} sufijo={f.und.toLowerCase()} onGuardar={f.horas ? undefined : (v) => guardarQ(f, v)} />}</td>
                    <td className={td}></td>
                    <td className={`${td} text-right font-mono`}>{n2(f.pct ? totalMo : f.cu)}</td>
                    <td className={`${td} text-right font-mono`}>{n2(f.parcial)}</td>
                    <td className="h-[26px] !py-0 px-0.5"><BotonIcono etiqueta="Quitar fila" tono="peligro" className="size-5" onClick={() => quitarFila(f)}><X size={12} /></BotonIcono></td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-4 border-t border-line bg-muted/30 px-4 py-2">
        <span className="text-[15px] font-bold">Costo total del APU</span>
        <span className="font-mono text-[15px] font-bold text-primary">S/ {n2(calc.total)}</span>
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
      <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
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
            <Input autoFocus value={f.descripcion} data-formato="oracion" onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
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

// ---------- Pie del APU: especificaciones técnicas, metrado y consolidado ----------

const areaTexto =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";

function PanelEspecificaciones({ partida }: { partida: Fila }) {
  const qc = useQueryClient();
  const [txt, setTxt] = useState(String(partida.especificaciones ?? ""));
  const [aviso, setAviso] = useState("");
  useEffect(() => { setTxt(String(partida.especificaciones ?? "")); setAviso(""); }, [partida.id, partida.especificaciones]);

  async function guardar() {
    const { error } = await db.from("partidas_apu").update({ especificaciones: txt }).eq("id", partida.id);
    if (error) return setAviso(error.message);
    setAviso("Guardado en la ficha de la partida.");
    qc.invalidateQueries({ queryKey: ["banco_apu", "partidas_apu"] });
  }

  return (
    <Panel titulo={`Especificaciones técnicas · ${partida.codigo_jerarquico || "s/c"}`} className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
        <textarea data-formato="oracion" className={`${areaTexto} min-h-0 flex-1 resize-none`} value={txt}
          onChange={(e) => { setTxt(e.target.value); setAviso(""); }}
          placeholder="Alcance, norma aplicable, equipo y control de calidad, condiciones de aceptación…" />
        <div className="mt-2 flex shrink-0 items-center justify-between gap-3">
          <span className={`text-xs ${aviso.startsWith("Guardado") ? "text-good" : "text-muted-foreground"}`}>{aviso || "Se guarda en la ficha de la partida."}</span>
          <div className="flex gap-2">
            <Boton type="button" variante="linea" onClick={() => { setTxt(String(partida.especificaciones ?? "")); setAviso(""); }}>Descartar</Boton>
            <Boton type="button" onClick={guardar}>Guardar</Boton>
          </div>
        </div>
      </div>
    </Panel>

  );
}

function PanelMetrado({ partida }: { partida: Fila }) {
  const qc = useQueryClient();
  const { data: filas = [] } = useQuery({
    queryKey: ["banco_apu", "partidas_apu_metrado", partida.id],
    queryFn: async () => {
      const { data, error } = await db.from("partidas_apu_metrado").select("*").eq("partida_id", partida.id).order("orden").order("created_at");
      if (error) throw error;
      return (data ?? []) as Fila[];
    },
  });
  const { data: unidades = [] } = useUnidadesMedida();
  const unds = useMemo(() => [...new Set([partida.unidad, ...unidades.filter((u) => u.activo).map((u) => u.simbolo)].filter(Boolean))], [unidades, partida.unidad]);

  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", "partidas_apu_metrado"] });
  const guardarFila = async (id: string, datos: Record<string, unknown>) => {
    const { error } = await db.from("partidas_apu_metrado").update(datos).eq("id", id);
    if (error) window.alert(error.message);
    refrescar();
  };

  async function aumentar() {
    const orden = filas.reduce((s, f) => Math.max(s, Number(f.orden) || 0), 0) + 1;
    const { error } = await db.from("partidas_apu_metrado").insert({ partida_id: partida.id, unidad: partida.unidad ?? "", orden });
    if (error) return window.alert(error.message);
    refrescar();
  }

  async function quitar(id: string) {
    if (!window.confirm("¿Quitar esta medición?")) return;
    const { error } = await db.from("partidas_apu_metrado").delete().eq("id", id);
    if (error) return window.alert(error.message);
    refrescar();
  }

  const total = filas.filter((f) => String(f.unidad) === String(partida.unidad)).reduce((s, f) => s + Number(f.cantidad ?? 0), 0);

  return (
    <Panel titulo={`Metrado · ${partida.codigo_jerarquico || "s/c"}`}
      extra={<Boton className="py-1 text-xs" onClick={aumentar}><Plus size={13} /> Agregar fila</Boton>}
      className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">

        {filas.length === 0 ? (
          <Vacio texto="Aún no hay mediciones. Agrega la primera fila del metrado." />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line label-mono leading-none">
                <th className="w-full max-w-[1px] whitespace-nowrap px-2 py-1 text-left font-medium">Concepto</th>
                <th className="whitespace-nowrap px-1 py-1 text-right font-medium">Und.</th>
                <th className="whitespace-nowrap px-2 py-1 text-right font-medium">Cantidad</th>
                <th className="whitespace-nowrap px-2 py-1 text-left font-medium">Observación</th>
                <th className="py-1 pl-1 pr-2.5" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-b border-line/60">
                  <td className="w-full max-w-[1px] px-1 py-0.5">
                    <Input defaultValue={f.concepto} className="text-xs" style={{ padding: "1px 6px", fontSize: 12 }}
                      onBlur={(e) => e.target.value !== String(f.concepto ?? "") && guardarFila(f.id, { concepto: e.target.value })} />
                  </td>
                  <td className="w-20 px-1 py-0.5">
                    <Select value={String(f.unidad ?? "")} className="text-xs" style={{ padding: "1px 4px", fontSize: 12 }}
                      onChange={(e) => guardarFila(f.id, { unidad: e.target.value })}>
                      {unds.map((u) => <option key={u}>{u}</option>)}
                    </Select>
                  </td>
                  <td className="w-24 px-1 py-0.5">
                    <Input type="number" step="any" defaultValue={f.cantidad} className="text-right text-xs" style={{ padding: "1px 6px", fontSize: 12 }}
                      onBlur={(e) => Number(e.target.value) !== Number(f.cantidad ?? 0) && guardarFila(f.id, { cantidad: Number(e.target.value) })} />
                  </td>
                  <td className="w-56 px-1 py-0.5">
                    <Input defaultValue={f.observacion} className="text-xs" style={{ padding: "1px 6px", fontSize: 12 }}
                      onBlur={(e) => e.target.value !== String(f.observacion ?? "") && guardarFila(f.id, { observacion: e.target.value })} />
                  </td>
                  <td className="w-6 py-0.5 pl-1 pr-2.5"><BotonIcono etiqueta="Quitar fila" tono="peligro" className="size-6" onClick={() => quitar(f.id)}><X size={12} /></BotonIcono></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2 text-xs">
        <span className="text-muted-foreground">{filas.length} medición{filas.length === 1 ? "" : "es"}</span>
        <span className="font-semibold">Total en {partida.unidad}: <span className="font-mono">{total.toLocaleString("es-PE", { maximumFractionDigits: 4 })}</span></span>
      </div>
    </Panel>

  );
}

type RecursoConsolidado = { k: string; nombre: string; und: string; col: string; cu: number; cantidad: number; parcial: number; pct: boolean };

function consolidarApu(costo: (id: string) => { total: number; filas: FilaC[] }, id: string) {
  const vistos = new Set<string>();
  const mapa = new Map<string, RecursoConsolidado>();
  const caminar = (padre: string) => {
    if (vistos.has(padre)) return;
    vistos.add(padre);
    for (const f of costo(padre).filas) {
      if (f.col === "subpartida_hijo_id") { caminar(String(f.d[f.col])); continue; }
      const k = `${f.col}:${f.d[f.col]}`;
      const a = mapa.get(k) ?? { k, nombre: f.nombre, und: f.und, col: f.col, cu: f.cu, cantidad: 0, parcial: 0, pct: !!f.pct };
      a.cantidad += f.q;
      a.parcial += f.parcial;
      mapa.set(k, a);
    }
  };
  caminar(id);
  const valores = [...mapa.values()];
  const grupos = GRUPOS.map(([col, , titulo]) => ({
    col, titulo,
    filas: valores.filter((f) => f.col === col).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  })).filter((g) => g.filas.length > 0);
  return { grupos, total: valores.reduce((s, f) => s + f.parcial, 0), recursos: valores.length };
}

function PanelConsolidado({ partida }: { partida: Fila }) {
  const { costo } = useApuMaestro();
  const { grupos, total, recursos } = consolidarApu(costo, partida.id);
  return (
    <Panel titulo={`Consolidado de partida · ${partida.codigo_jerarquico || "s/c"}`} className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">

        <p className="mb-2 truncate text-xs text-muted-foreground" title={partida.descripcion}>
          {partida.descripcion} · {partida.unidad} · Rendimiento {partida.rendimiento_diario}/día · {recursos} recurso{recursos === 1 ? "" : "s"}
        </p>
        {grupos.length === 0 ? (
          <Vacio texto="Esta partida aún no tiene recursos en su APU." />
        ) : grupos.map((g) => (
          <div key={g.col} className="mb-2 rounded-md border border-line">
            <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1 text-xs font-semibold text-primary">
              <span>{g.titulo}</span>
              <span className="font-mono font-normal">{soles(g.filas.reduce((s, f) => s + f.parcial, 0))}</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="label-mono leading-none">
                  <th className="w-full max-w-[1px] whitespace-nowrap px-2 py-1 text-left font-medium">Recurso</th>
                  <th className="whitespace-nowrap px-1 py-1 text-right font-medium">Cant.</th>
                  <th className="whitespace-nowrap px-1 py-1 text-right font-medium">Und.</th>
                  <th className="whitespace-nowrap px-2 py-1 text-right font-medium">C. unit.</th>
                  <th className="whitespace-nowrap px-2 py-1 text-right font-medium">Parcial</th>
                </tr>
              </thead>
              <tbody>
                {g.filas.map((f) => (
                  <tr key={f.k} className="border-t border-line/60">
                    <td className="w-full max-w-[1px] px-2 py-0.5"><span className="block truncate" title={f.nombre}>{f.nombre}</span></td>
                    <td className="whitespace-nowrap px-1 py-0.5 text-right font-mono">{f.pct ? `${f.cantidad}%` : f.cantidad.toLocaleString("es-PE", { maximumFractionDigits: 4 })}</td>
                    <td className="whitespace-nowrap px-1 py-0.5 text-right text-muted-foreground">{f.und}</td>
                    <td className="whitespace-nowrap px-2 py-0.5 text-right font-mono">{f.pct ? `${f.cu}%` : soles(f.cu)}</td>
                    <td className="whitespace-nowrap px-2 py-0.5 text-right font-mono">{soles(f.parcial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2">
        <span className="text-sm font-semibold">Costo unitario consolidado ({partida.unidad})</span>
        <span className="font-mono text-sm font-semibold text-primary">{soles(total)}</span>
      </div>
    </Panel>

  );
}

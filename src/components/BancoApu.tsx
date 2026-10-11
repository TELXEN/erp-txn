import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Etiqueta, Input, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { soles } from "@/lib/format";
import { useEspecialidadesPartida } from "@/lib/especialidades";

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
      <ListaBanco key={tab} tabla={tab} />
    </>
  );
}

function ListaBanco({ tabla }: { tabla: Tabla }) {
  const cfg = CONFIG[tabla];
  const qc = useQueryClient();
  const { data: filas = [] } = useTabla(tabla);
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [estado, setEstado] = useState("activo");
  const [form, setForm] = useState<Fila | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [receta, setReceta] = useState<Fila | null>(null);
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
    if (tabla === "equipos_herramientas" && form.tipo !== "alquilado") datos.margen = 0;
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
          <Boton onClick={() => abrir()}><Plus size={13} /> Aumentar</Boton>
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
                <tr key={f.id} className={`border-b border-line/60 hover:bg-muted/40 ${tabla === "partidas_apu" ? "cursor-pointer" : ""}`}
                  onClick={() => tabla === "partidas_apu" && setReceta(f)}>
                  {cfg.columnas.map(([k, , tp]) => (
                    <td key={k} className={`px-4 py-2 ${tp !== "txt" ? "text-right font-mono" : ""}`}>
                      {tp === "sol" ? soles(Number(f[k] ?? 0)) : tp === "num" ? Number(f[k] ?? 0).toLocaleString("es-PE") : <Resaltar texto={f[k]} termino={busqueda} />}
                    </td>
                  ))}
                  <td className="px-4 py-2"><Etiqueta tono={f.estado === "activo" ? "good" : "neutro"}>{f.estado === "activo" ? "Activo" : "Inactivo"}</Etiqueta></td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {tabla === "partidas_apu" && <BotonIcono etiqueta="Análisis (receta APU)" tono="primario" onClick={() => setReceta(f)}><Calculator size={14} /></BotonIcono>}
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

      {receta && <RecetaApu partida={receta} onCerrar={() => setReceta(null)} />}
    </Panel>
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

function RecetaApu({ partida, onCerrar }: { partida: Fila; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data: det = [] } = useTabla("partida_detalle");
  const { data: mat = [] } = useTabla("materiales");
  const { data: mo = [] } = useTabla("mano_obra");
  const { data: eq = [] } = useTabla("equipos_herramientas");
  const { data: sc = [] } = useTabla("subcontratos");
  const { data: pa = [] } = useTabla("partidas_apu");
  const fuentes: Record<string, Fila[]> = { materiales: mat, mano_obra: mo, equipos_herramientas: eq, subcontratos: sc, partidas_apu: pa };
  const [banco, setBanco] = useState(0);
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState("");
  const detalles = det as Detalle[];

  // Costo de una partida (recursivo, protegido contra ciclos).
  const costo = (id: string, visitados = new Set<string>()): { total: number; filas: { d: Detalle; banco: string; nombre: string; und: string; cu: number; parcial: number }[] } => {
    if (visitados.has(id)) return { total: 0, filas: [] };
    visitados.add(id);
    const p = pa.find((x) => x.id === id);
    const rend = Number(p?.rendimiento_diario) || 1;
    const propias = detalles.filter((d) => d.partida_padre_id === id);
    const filas = propias.map((d) => {
      const [col, tabla, etiqueta] = BANCOS.find(([c]) => d[c]) ?? BANCOS[0];
      const r = (fuentes[tabla] ?? []).find((x) => x.id === d[col]);
      const q = Number(d.cantidad_o_cuadrilla);
      let cu = 0, parcial = 0;
      if (tabla === "partidas_apu") { cu = costo(d[col] as string, new Set(visitados)).total; parcial = q * cu; }
      else if (tabla === "mano_obra") { cu = Number(r?.costo_hora ?? 0); parcial = (q * 8 * cu) / rend; }
      else if (tabla === "equipos_herramientas" && r?.unidad === "H-M") { cu = Number(r?.costo_unitario ?? 0); parcial = (q * 8 * cu) / rend; }
      else { cu = Number(r?.costo_unitario ?? 0); parcial = q * cu; }
      return { d, banco: etiqueta, nombre: r?.descripcion ?? "(no encontrado)", und: r?.unidad ?? "", cu, parcial, pct: tabla === "equipos_herramientas" && r?.unidad === "%" };
    });
    const totalMo = filas.filter((f) => f.d.mano_obra_id).reduce((s, f) => s + f.parcial, 0);
    for (const f of filas) if ((f as { pct?: boolean }).pct) f.parcial = (totalMo * f.cu * Number(f.d.cantidad_o_cuadrilla)) / 100;
    return { total: filas.reduce((s, f) => s + f.parcial, 0), filas };
  };
  const calc = costo(partida.id);

  const [col, tabla, etiqueta] = BANCOS[banco]!;
  const opciones = (fuentes[tabla] ?? []).filter((x) => x.estado === "activo" && x.id !== partida.id);
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", "partida_detalle"] });

  async function agregar() {
    if (!elegido) return;
    setError("");
    const { error: e } = await db.from("partida_detalle").insert({ partida_padre_id: partida.id, [col]: elegido, cantidad_o_cuadrilla: 1 });
    if (e) return setError(e.message);
    setElegido("");
    refrescar();
  }
  async function cambiarCant(id: string, v: string) {
    await db.from("partida_detalle").update({ cantidad_o_cuadrilla: Number(v || 0) }).eq("id", id);
    refrescar();
  }
  async function quitarFila(id: string) {
    await db.from("partida_detalle").delete().eq("id", id);
    refrescar();
  }

  return (
    <VentanaFlotante abierta onCerrar={onCerrar} ancho="max-w-5xl"
      titulo={`Análisis de precios — ${partida.descripcion}`}
      subtitulo={`${partida.codigo_jerarquico || "s/c"} · ${partida.unidad} · Rendimiento ${partida.rendimiento_diario}/día`}>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Campo etiqueta="Banco">
          <Select value={banco} onChange={(e) => { setBanco(Number(e.target.value)); setElegido(""); }} className="w-48">
            {BANCOS.map(([, , t], i) => <option key={t} value={i}>{t}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta={etiqueta}>
          <Select value={elegido} onChange={(e) => setElegido(e.target.value)} className="w-80">
            <option value="">Selecciona…</option>
            {opciones.map((o) => <option key={o.id} value={o.id}>{(o.codigo ?? o.codigo_jerarquico) ? `${o.codigo ?? o.codigo_jerarquico} · ` : ""}{o.descripcion}</option>)}
          </Select>
        </Campo>
        <Boton onClick={agregar} disabled={!elegido}><Plus size={13} /> Agregar fila</Boton>
      </div>
      {error && <p className="mb-2 text-xs text-bad">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left label-mono">
            <th className="px-3 py-2">Banco</th><th className="px-3 py-2">Descripción</th><th className="px-3 py-2">Und</th>
            <th className="px-3 py-2 text-right">Cant./Cuadrilla</th><th className="px-3 py-2 text-right">C. unitario</th>
            <th className="px-3 py-2 text-right">Parcial</th><th />
          </tr>
        </thead>
        <tbody>
          {calc.filas.length === 0 && <tr><td colSpan={7}><Vacio texto="Agrega recursos de los bancos o subpartidas." /></td></tr>}
          {calc.filas.map((f) => (
            <tr key={f.d.id} className="border-b border-line/60">
              <td className="px-3 py-1.5 text-xs text-muted-foreground">{f.banco}</td>
              <td className="px-3 py-1.5">{f.nombre}</td>
              <td className="px-3 py-1.5">{f.und}</td>
              <td className="px-3 py-1.5 text-right">
                <Input type="number" step="any" defaultValue={f.d.cantidad_o_cuadrilla} className="w-24 py-1 text-right"
                  onBlur={(e) => Number(e.target.value) !== Number(f.d.cantidad_o_cuadrilla) && cambiarCant(f.d.id, e.target.value)} />
              </td>
              <td className="px-3 py-1.5 text-right font-mono">{soles(f.cu)}</td>
              <td className="px-3 py-1.5 text-right font-mono">{soles(f.parcial)}</td>
              <td className="px-3 py-1.5"><BotonIcono etiqueta="Quitar fila" tono="peligro" onClick={() => quitarFila(f.d.id)}><X size={14} /></BotonIcono></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={5} className="px-3 py-2 text-right font-semibold">Costo total de la partida</td>
            <td className="px-3 py-2 text-right font-mono font-semibold text-primary">{soles(calc.total)}</td><td /></tr>
        </tfoot>
      </table>
    </VentanaFlotante>
  );
}

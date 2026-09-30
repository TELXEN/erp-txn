import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { soles } from "@/lib/format";
import { agruparPorCategoria, codigoContextual, ordenarJerarquia, prefijosWBS } from "@/lib/categorias";
import { apuDb, calcularApu, nombreTipo, TIPOS_INSUMO, useComponentesApu, useInsumos } from "@/lib/apu";
import type { CotizacionItem } from "@/lib/cotizaciones";

/** Columnas de la hoja, en el orden en que se navegan con el teclado. */
const COLUMNAS = ["codigo", "nombre", "marca", "unidad", "metrado", "precio_unitario", "total"] as const;
type Columna = (typeof COLUMNAS)[number];

type Fila =
  | { clase: "cap"; clave: string; codigo: string; texto: string; esp: string; total: number }
  | { clase: "sub"; clave: string; codigo: string; texto: string; esp: string; cat: string; total: number }
  | { clase: "item"; clave: string; it: CotizacionItem; nivel: 3 | 4; agrupadora: boolean; total: number };

const num = (n: number | string) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Construye el árbol visible: capítulo (especialidad), subcapítulo (categoría), partidas y subpartidas. */
function construirArbol(items: CotizacionItem[]): Fila[] {
  const wbs = prefijosWBS(items);
  const filas: Fila[] = [];
  for (const grupo of agruparPorCategoria(items)) {
    const totalCap = grupo.categorias.reduce(
      (t, s) => t + s.items.reduce((x, i) => x + Number(i.metrado) * Number(i.precio_unitario), 0),
      0,
    );
    filas.push({
      clase: "cap",
      clave: `c:${grupo.especialidad}`,
      codigo: wbs.capitulo(grupo.especialidad),
      texto: grupo.especialidad,
      esp: grupo.especialidad,
      total: totalCap,
    });
    for (const sub of grupo.categorias) {
      const totalSub = sub.items.reduce((x, i) => x + Number(i.metrado) * Number(i.precio_unitario), 0);
      filas.push({
        clase: "sub",
        clave: `s:${grupo.especialidad}|${sub.categoria}`,
        codigo: wbs.categoria(grupo.especialidad, sub.categoria),
        texto: sub.categoria,
        esp: grupo.especialidad,
        cat: sub.categoria,
        total: totalSub,
      });
      for (const nodo of ordenarJerarquia(sub.items)) {
        const total = nodo.agrupadora
          ? nodo.hijos.reduce((s, h) => s + Number(h.metrado) * Number(h.precio_unitario), 0)
          : Number(nodo.fila.metrado) * Number(nodo.fila.precio_unitario);
        filas.push({
          clase: "item",
          clave: `i:${nodo.fila.id}`,
          it: nodo.fila,
          nivel: nodo.nivel,
          agrupadora: nodo.agrupadora,
          total,
        });
      }
    }
  }
  return filas;
}

/** Columnas editables según la naturaleza de la fila. */
function columnasEditables(f: Fila, conApu: boolean): number[] {
  if (f.clase !== "item") return [0, 1];
  if (f.agrupadora) return [0, 1];
  return conApu ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
}

export function CotizacionHoja({
  cotizacionId,
  items,
  unidades,
  alAbrirCatalogo,
}: {
  cotizacionId: string;
  items: CotizacionItem[];
  unidades: { id: string; simbolo: string; activo: boolean }[];
  alAbrirCatalogo?: () => void;
}) {
  const qc = useQueryClient();
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [apuAbierto, setApuAbierto] = useState<string | null>(null);
  const [activo, setActivo] = useState<{ r: number; c: number }>({ r: 0, c: 1 });
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const celdas = useRef(new Map<string, HTMLTableCellElement | null>());
  const [conApu, setConApu] = useState<Set<string>>(new Set());

  const arbol = useMemo(() => construirArbol(items), [items]);

  // Partidas que ya tienen análisis de precios: su P.U. queda en solo lectura.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const ids = items.map((i) => i.id);
      if (!ids.length) return setConApu(new Set());
      const { data } = await apuDb
        .from("apu_componentes")
        .select("cotizacion_item_id")
        .in("cotizacion_item_id", ids);
      if (!vivo) return;
      setConApu(new Set((data ?? []).map((d: { cotizacion_item_id: string }) => d.cotizacion_item_id)));
    })();
    return () => {
      vivo = false;
    };
  }, [items, apuAbierto]);

  const visibles = useMemo(() => {
    const out: Fila[] = [];
    let capOculto: string | null = null;
    let subOculto: string | null = null;
    let padreOculto: string | null = null;
    for (const f of arbol) {
      if (f.clase === "cap") {
        capOculto = colapsados.has(f.clave) ? f.clave : null;
        subOculto = null;
        padreOculto = null;
        out.push(f);
        continue;
      }
      if (capOculto) continue;
      if (f.clase === "sub") {
        subOculto = colapsados.has(f.clave) ? f.clave : null;
        padreOculto = null;
        out.push(f);
        continue;
      }
      if (subOculto) continue;
      if (f.nivel === 4) {
        if (padreOculto) continue;
        out.push(f);
        continue;
      }
      padreOculto = f.agrupadora && colapsados.has(f.clave) ? f.clave : null;
      out.push(f);
    }
    return out;
  }, [arbol, colapsados]);

  useEffect(() => {
    if (activo.r >= visibles.length && visibles.length) setActivo({ r: visibles.length - 1, c: activo.c });
  }, [visibles.length, activo]);

  useEffect(() => {
    if (editando) return;
    celdas.current.get(`${activo.r}-${activo.c}`)?.focus({ preventScroll: false });
  }, [activo, editando, visibles.length]);

  const refrescar = () => qc.invalidateQueries({ queryKey: ["cotizacion_items", cotizacionId] });

  function alternar(clave: string) {
    setColapsados((prev) => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave);
      else s.add(clave);
      return s;
    });
  }

  function valorActual(f: Fila, c: number): string {
    const col = COLUMNAS[c] as Columna;
    if (f.clase !== "item") return col === "codigo" ? f.codigo : col === "nombre" ? f.texto : "";
    const it = f.it;
    if (col === "codigo") return it.codigo ?? "";
    if (col === "nombre") return it.nombre;
    if (col === "marca") return it.marca ?? "";
    if (col === "unidad") return it.unidad;
    if (col === "metrado") return String(Number(it.metrado));
    if (col === "precio_unitario") return String(Number(it.precio_unitario));
    return "";
  }

  /** Guarda la celda editada y refresca el árbol sin recargar la página. */
  async function guardar(f: Fila, c: number, v: string) {
    setError("");
    const col = COLUMNAS[c] as Columna;
    const texto = v.trim();

    if (f.clase === "cap" || f.clase === "sub") {
      const enGrupo = items.filter((i) =>
        f.clase === "cap"
          ? (i.especialidad || "Sin especialidad") === f.esp
          : (i.especialidad || "Sin especialidad") === f.esp && ((i.categoria ?? "").trim() || "Sin categoría") === f.cat,
      );
      if (col === "nombre") {
        if (!texto || texto === (f.clase === "cap" ? f.texto : f.texto)) return;
        const campo = f.clase === "cap" ? "especialidad" : "categoria";
        for (const i of enGrupo) await supabase.from("cotizacion_items").update({ [campo]: texto } as never).eq("id", i.id);
        return refrescar();
      }
      if (col === "codigo") {
        const partes = texto.split(".").filter(Boolean);
        if (!partes.length || texto === f.codigo) return;
        for (const i of enGrupo) {
          const actuales = (i.codigo ?? "").split(".").filter(Boolean);
          const nuevo = [...partes, ...actuales.slice(partes.length)].join(".");
          if (nuevo !== i.codigo) await supabase.from("cotizacion_items").update({ codigo: nuevo }).eq("id", i.id);
        }
        return refrescar();
      }
      return;
    }

    const it = f.it;
    const campos: Record<string, string | number> = {};
    if (col === "codigo") campos["codigo"] = texto;
    else if (col === "nombre") campos["nombre"] = texto || it.nombre;
    else if (col === "marca") campos["marca"] = texto;
    else if (col === "unidad") campos["unidad"] = texto || it.unidad;
    else if (col === "metrado") campos["metrado"] = Number(texto.replace(",", ".")) || 0;
    else if (col === "precio_unitario") campos["precio_unitario"] = Number(texto.replace(",", ".")) || 0;
    else return;
    const clave = Object.keys(campos)[0] as keyof CotizacionItem;
    if (String(campos[clave as string]) === String(it[clave] ?? "")) return;
    const { error: err } = await supabase.from("cotizacion_items").update(campos as never).eq("id", it.id);
    if (err) return setError(err.message);
    refrescar();
  }

  /** Inserta una fila nueva justo debajo de la fila activa, heredando su nivel. */
  async function insertarFila(r: number) {
    const f = visibles[r];
    if (!f) return;
    const esp = f.clase === "item" ? f.it.especialidad : f.esp;
    const cat = f.clase === "item" ? f.it.categoria ?? "" : f.clase === "sub" ? (f.cat === "Sin categoría" ? "" : f.cat) : "";
    const hermanos = items.filter(
      (i) => i.especialidad === esp && (i.categoria ?? "") === cat && !i.padre_id,
    );
    const base = (hermanos[0]?.codigo ?? "").split(".").slice(0, 2).join(".");
    const usados = hermanos
      .map((h) => Number((h.codigo ?? "").split(".")[2]))
      .filter((n) => Number.isFinite(n));
    const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
    const codigo = base ? `${base}.${String(siguiente).padStart(2, "0")}` : "";
    const { error: err } = await supabase.from("cotizacion_items").insert({
      cotizacion_id: cotizacionId,
      codigo,
      nombre: "Nueva partida",
      especialidad: esp,
      categoria: cat,
      marca: "",
      unidad: f.clase === "item" ? f.it.unidad : "glb",
      metrado: 1,
      precio_unitario: 0,
      orden: items.length + 1,
    });
    if (err) return setError(err.message);
    await refrescar();
    setActivo({ r: r + 1, c: 1 });
  }

  /** Crea una partida dentro de una especialidad/categoría, con código EDT automático. */
  async function crearPartida(esp: string, cat: string, nombre: string, unidad = "glb") {
    setError("");
    const { error: err } = await supabase.from("cotizacion_items").insert({
      cotizacion_id: cotizacionId,
      codigo: codigoContextual(esp, cat, items),
      nombre: nombre.trim() || "Nueva partida",
      especialidad: esp,
      categoria: cat,
      marca: "",
      unidad,
      metrado: 1,
      precio_unitario: 0,
      orden: items.length + 1,
    });
    if (err) {
      setError(err.message);
      return false;
    }
    await refrescar();
    return true;
  }

  /** Abre un capítulo nuevo (especialidad) con su primera partida lista para renombrar. */
  async function nuevaEspecialidad() {
    const usadas = new Set(items.map((i) => i.especialidad || "Sin especialidad"));
    let n = usadas.size + 1;
    while (usadas.has(`Nueva especialidad ${n}`)) n += 1;
    await crearPartida(`Nueva especialidad ${n}`, "", "Nueva partida");
  }



  async function borrar(id: string) {
    await supabase.from("cotizacion_items").delete().eq("id", id);
    refrescar();
  }

  function mover(dr: number, dc: number) {
    let { r, c } = activo;
    if (dr) {
      const nr = Math.min(Math.max(r + dr, 0), visibles.length - 1);
      const f = visibles[nr];
      if (!f) return;
      const cols = columnasEditables(f, f.clase === "item" && conApu.has(f.it.id));
      setActivo({ r: nr, c: cols.includes(c) ? c : (cols[cols.length - 1] as number) });
      return;
    }
    const f = visibles[r];
    if (!f) return;
    const cols = columnasEditables(f, f.clase === "item" && conApu.has(f.it.id));
    const pos = cols.indexOf(c);
    const np = pos + dc;
    if (np >= 0 && np < cols.length) return setActivo({ r, c: cols[np] as number });
    // Salta a la fila contigua cuando se acaba la fila actual.
    const nr = Math.min(Math.max(r + (dc > 0 ? 1 : -1), 0), visibles.length - 1);
    const sig = visibles[nr];
    if (!sig) return;
    const cs = columnasEditables(sig, sig.clase === "item" && conApu.has(sig.it.id));
    setActivo({ r: nr, c: (dc > 0 ? cs[0] : cs[cs.length - 1]) as number });
  }

  function alPresionar(e: React.KeyboardEvent, f: Fila, r: number, c: number) {
    if (editando) return;
    if (e.key === "ArrowUp") return e.preventDefault(), mover(-1, 0);
    if (e.key === "ArrowDown") return e.preventDefault(), mover(1, 0);
    if (e.key === "ArrowLeft") return e.preventDefault(), mover(0, -1);
    if (e.key === "ArrowRight") return e.preventDefault(), mover(0, 1);
    if (e.key === "Tab") return e.preventDefault(), mover(0, e.shiftKey ? -1 : 1);
    if (e.key === "Insert") return e.preventDefault(), void insertarFila(r);
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      setValor(valorActual(f, c));
      setEditando(true);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setValor(e.key);
      setEditando(true);
    }
  }

  const celdaBase = "border-b border-line/60 px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/40";

  function editor(f: Fila, c: number) {
    const col = COLUMNAS[c] as Columna;
    const comun = {
      autoFocus: true,
      value: valor,
      className: "w-full rounded border border-primary bg-card px-1 py-0.5 text-xs outline-none",
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void guardar(f, c, valor).then(() => {
            setEditando(false);
            mover(1, 0);
          });
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setEditando(false);
        }
        if (e.key === "Tab") {
          e.preventDefault();
          void guardar(f, c, valor).then(() => {
            setEditando(false);
            mover(0, e.shiftKey ? -1 : 1);
          });
        }
      },
      onBlur: () => {
        void guardar(f, c, valor).then(() => setEditando(false));
      },
    };
    if (col === "unidad")
      return (
        <select {...comun} onChange={(e) => setValor(e.target.value)}>
          {unidades.filter((u) => u.activo).map((u) => (
            <option key={u.id} value={u.simbolo}>
              {u.simbolo}
            </option>
          ))}
        </select>
      );
    const numerico = col === "metrado" || col === "precio_unitario";
    return (
      <input
        {...comun}
        type={numerico ? "number" : "text"}
        step="0.01"
        onChange={(e) => setValor(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
      />
    );
  }

  function celda(f: Fila, r: number, c: number, contenido: React.ReactNode, extra = "") {
    const cols = columnasEditables(f, f.clase === "item" && conApu.has(f.it.id));
    const editable = cols.includes(c);
    const esActivo = activo.r === r && activo.c === c;
    return (
      <td
        ref={(el) => {
          celdas.current.set(`${r}-${c}`, el);
        }}
        tabIndex={editable ? (esActivo ? 0 : -1) : -1}
        onClick={() => editable && setActivo({ r, c })}
        onDoubleClick={() => {
          if (!editable) return;
          setActivo({ r, c });
          setValor(valorActual(f, c));
          setEditando(true);
        }}
        onKeyDown={(e) => editable && alPresionar(e, f, r, c)}
        className={`${celdaBase} ${extra} ${esActivo ? "bg-primary/10 ring-1 ring-primary/50" : ""} ${
          editable ? "cursor-cell" : "cursor-default text-muted-foreground"
        }`}
      >
        {esActivo && editando && editable ? editor(f, c) : contenido}
      </td>
    );
  }

  /** Fila fantasma al pie de cada grupo visible (capítulo o categoría sin más filas debajo). */
  function fantasmaDe(r: number): { esp: string; cat: string } | null {
    const f = visibles[r];
    if (!f) return null;
    const sig = visibles[r + 1];
    if (f.clase === "item") {
      if (sig && sig.clase === "item") return null;
      return { esp: f.it.especialidad, cat: (f.it.categoria ?? "").trim() };
    }
    if (colapsados.has(f.clave)) return null;
    if (f.clase === "sub") {
      if (sig && sig.clase === "item") return null;
      return { esp: f.esp, cat: f.cat === "Sin categoría" ? "" : f.cat };
    }
    if (sig && sig.clase !== "cap") return null;
    return { esp: f.esp, cat: "" };
  }

  if (!items.length)
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center print:hidden">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Hoja en blanco</p>
        <h3 className="text-base font-semibold text-ink">¿Cómo quieres empezar el presupuesto?</h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void nuevaEspecialidad()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground hover:opacity-90"
          >
            <FolderPlus size={14} /> Nueva especialidad
          </button>
          <button
            type="button"
            onClick={() => void crearPartida("General", "", "Nueva partida")}
            className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-[12px] text-ink hover:border-primary hover:text-primary"
          >
            <Plus size={14} /> Partida rápida
          </button>
          {alAbrirCatalogo && (
            <button
              type="button"
              onClick={alAbrirCatalogo}
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-[12px] text-ink hover:border-primary hover:text-primary"
            >
              <BookOpen size={14} /> Importar del catálogo maestro
            </button>
          )}
        </div>
        <p className="max-w-md font-mono text-[10px] text-muted-foreground">
          Después podrás escribir directamente en la fila punteada al pie de cada grupo para seguir añadiendo partidas.
        </p>
        {error && <p className="font-mono text-xs text-bad">{error}</p>}
      </div>
    );

  return (
    <div className="overflow-x-auto">
      {error && <p className="px-5 py-2 font-mono text-xs text-bad">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-muted/30 px-5 py-2 font-mono text-[10px] text-muted-foreground print:hidden">
        <button
          type="button"
          onClick={() => void insertarFila(activo.r)}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
        >
          <Plus size={12} /> Fila
        </button>
        <button
          type="button"
          onClick={() => void nuevaEspecialidad()}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
        >
          <FolderPlus size={12} /> Especialidad
        </button>
        {alAbrirCatalogo && (
          <button
            type="button"
            onClick={alAbrirCatalogo}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
          >
            <BookOpen size={12} /> Catálogo
          </button>
        )}
        <span>Doble clic edita · Enter guarda · Esc cancela · Flechas y Tab navegan · Insert añade fila</span>
      </div>
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-b border-line bg-muted/40 text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="px-2 py-2 font-medium">Código</th>
            <th className="px-2 py-2 font-medium">Descripción</th>
            <th className="px-2 py-2 font-medium">Marca</th>
            <th className="px-2 py-2 font-medium">Unidad</th>
            <th className="px-2 py-2 text-right font-medium">Cantidad</th>
            <th className="px-2 py-2 text-right font-medium">C. unitario</th>
            <th className="px-2 py-2 text-right font-medium">Sub total</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {visibles.map((f, r) => {
            if (f.clase !== "item") {
              const cap = f.clase === "cap";
              return (
                <tr key={f.clave} className={cap ? "bg-muted/50" : "bg-muted/25"}>
                  {celda(
                    f,
                    r,
                    0,
                    <span className="flex items-center gap-1 font-semibold text-ink" style={{ paddingLeft: cap ? 0 : 14 }}>
                      <button type="button" onClick={() => alternar(f.clave)} className="text-muted-foreground">
                        {colapsados.has(f.clave) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {f.codigo || "—"}
                    </span>,
                  )}
                  {celda(
                    f,
                    r,
                    1,
                    <span className={`font-semibold ${cap ? "uppercase text-ink" : "text-muted-foreground"}`}>{f.texto}</span>,
                  )}
                  <td className={celdaBase}>—</td>
                  <td className={celdaBase}>—</td>
                  <td className={`${celdaBase} text-right`}>—</td>
                  <td className={`${celdaBase} text-right`}>—</td>
                  <td className={`${celdaBase} text-right font-semibold text-ink`}>{soles(f.total)}</td>
                  <td className={celdaBase} />
                </tr>
              );
            }
            const it = f.it;
            const bloqueada = f.agrupadora;
            const puFijo = conApu.has(it.id);
            const sangria = f.nivel === 4 ? 44 : 28;
            return (
              <React.Fragment key={f.clave}>
                <tr
                  className={f.agrupadora ? "bg-muted/10" : ""}
                  onDoubleClick={(e) => {
                    if ((e.target as HTMLElement).closest("input,select")) return;
                  }}
                >
                  {celda(
                    f,
                    r,
                    0,
                    <span className="flex items-center gap-1 text-primary" style={{ paddingLeft: sangria }}>
                      {f.agrupadora && (
                        <button type="button" onClick={() => alternar(f.clave)} className="text-muted-foreground">
                          {colapsados.has(f.clave) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      {f.nivel === 4 && <CornerDownRight size={11} className="text-muted-foreground" />}
                      {it.codigo || "—"}
                    </span>,
                  )}
                  {celda(f, r, 1, <span className="text-ink">{it.nombre}</span>)}
                  {bloqueada ? (
                    <td className={celdaBase}>—</td>
                  ) : (
                    celda(f, r, 2, <span>{it.marca || "-"}</span>)
                  )}
                  {bloqueada ? <td className={celdaBase}>—</td> : celda(f, r, 3, <span>{it.unidad}</span>)}
                  {bloqueada ? (
                    <td className={`${celdaBase} text-right`}>—</td>
                  ) : (
                    celda(f, r, 4, <span>{num(it.metrado)}</span>, "text-right")
                  )}
                  {bloqueada || puFijo ? (
                    <td className={`${celdaBase} text-right ${puFijo ? "italic" : ""}`}>
                      {bloqueada ? "—" : soles(Number(it.precio_unitario))}
                    </td>
                  ) : (
                    celda(f, r, 5, <span>{soles(Number(it.precio_unitario))}</span>, "text-right")
                  )}
                  <td className={`${celdaBase} text-right font-semibold text-ink`}>{soles(f.total)}</td>
                  <td className={`${celdaBase} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      {!f.agrupadora && (
                        <button
                          type="button"
                          title="Desglose de insumos (APU)"
                          onClick={() => setApuAbierto(apuAbierto === it.id ? null : it.id)}
                          className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          APU
                        </button>
                      )}
                      <button
                        type="button"
                        title="Eliminar fila"
                        onClick={() => void borrar(it.id)}
                        className="rounded border border-line p-1 text-muted-foreground hover:border-bad hover:text-bad"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
                {apuAbierto === it.id && (
                  <tr>
                    <td colSpan={8} className="border-b border-line bg-muted/20 p-0">
                      <DesgloseApu item={it} alCambiar={refrescar} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Sub-tabla de insumos (materiales, mano de obra, equipos y subcontratos) con edición en línea. */
function DesgloseApu({ item, alCambiar }: { item: CotizacionItem; alCambiar: () => void }) {
  const qc = useQueryClient();
  const { data: insumos = [] } = useInsumos();
  const { data: comps = [] } = useComponentesApu(item.id, "cotizacion");
  const [nuevo, setNuevo] = useState("");
  const rend = Number(item.rendimiento ?? 1) || 1;
  const jornada = Number(item.jornada ?? 8) || 8;
  const pctH = Number(item.pct_herramientas ?? 3);
  const calc = calcularApu(comps, insumos, rend, jornada, pctH);

  async function sincronizarPu() {
    await supabase.from("cotizacion_items").update({ precio_unitario: calc.pu }).eq("id", item.id);
    alCambiar();
  }

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["apu_componentes", item.id] });
  };

  async function agregar(id: string) {
    const ins = insumos.find((i) => i.id === id);
    if (!ins) return;
    const conCuadrilla = ins.tipo === "MO" || (ins.tipo === "EQ" && ins.unidad === "hm");
    await apuDb.from("apu_componentes").insert({
      cotizacion_item_id: item.id,
      insumo_id: id,
      cuadrilla: conCuadrilla ? 1 : 0,
      cantidad: conCuadrilla ? 0 : 1,
    });
    setNuevo("");
    await refrescar();
  }

  async function cambiar(id: string, campo: "cuadrilla" | "cantidad", v: string) {
    await apuDb.from("apu_componentes").update({ [campo]: Number(v || 0) }).eq("id", id);
    await refrescar();
  }

  async function quitar(id: string) {
    await apuDb.from("apu_componentes").delete().eq("id", id);
    await refrescar();
  }

  async function cambiarPartida(campo: "rendimiento" | "jornada" | "pct_herramientas", v: string) {
    await supabase.from("cotizacion_items").update({ [campo]: Number(v || 0) } as never).eq("id", item.id);
    alCambiar();
  }

  const inp = "w-20 rounded border border-line bg-card px-1 py-0.5 text-right text-[11px] outline-none focus:border-primary";

  return (
    <div className="px-6 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-ink">Análisis de precios · {item.nombre}</span>
        <label className="flex items-center gap-1">
          Rendimiento
          <input className={inp} type="number" step="0.01" defaultValue={rend} onBlur={(e) => void cambiarPartida("rendimiento", e.target.value)} />
        </label>
        <label className="flex items-center gap-1">
          Jornada
          <input className={inp} type="number" step="0.5" defaultValue={jornada} onBlur={(e) => void cambiarPartida("jornada", e.target.value)} />
        </label>
        <label className="flex items-center gap-1">
          % Herram.
          <input className={inp} type="number" step="0.1" defaultValue={pctH} onBlur={(e) => void cambiarPartida("pct_herramientas", e.target.value)} />
        </label>
      </div>
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="border-b border-line text-left text-[9px] uppercase tracking-wider text-muted-foreground">
            <th className="py-1">Tipo</th>
            <th className="py-1">Insumo</th>
            <th className="py-1">Und.</th>
            <th className="py-1 text-right">Cuadrilla</th>
            <th className="py-1 text-right">Cantidad</th>
            <th className="py-1 text-right">Precio</th>
            <th className="py-1 text-right">Parcial</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {calc.filas.map(({ c, ins, cantidad, parcial }) => (
            <tr key={c.id} className="border-b border-line/50">
              <td className="py-1 text-muted-foreground">{nombreTipo(ins?.tipo ?? "")}</td>
              <td className="py-1 text-ink">{ins?.nombre ?? "—"}</td>
              <td className="py-1 text-muted-foreground">{ins?.unidad ?? ""}</td>
              <td className="py-1 text-right">
                <input className={inp} type="number" step="0.01" defaultValue={Number(c.cuadrilla)} onBlur={(e) => void cambiar(c.id, "cuadrilla", e.target.value)} />
              </td>
              <td className="py-1 text-right">
                {Number(c.cuadrilla) > 0 ? (
                  num(cantidad)
                ) : (
                  <input className={inp} type="number" step="0.01" defaultValue={Number(c.cantidad)} onBlur={(e) => void cambiar(c.id, "cantidad", e.target.value)} />
                )}
              </td>
              <td className="py-1 text-right">{soles(Number(ins?.precio ?? 0))}</td>
              <td className="py-1 text-right font-semibold text-ink">{soles(parcial)}</td>
              <td className="py-1 text-right">
                <button type="button" onClick={() => void quitar(c.id)} className="text-muted-foreground hover:text-bad">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <select
          value={nuevo}
          onChange={(e) => void agregar(e.target.value)}
          className="rounded border border-line bg-card px-2 py-1 font-mono text-[11px] outline-none focus:border-primary"
        >
          <option value="">+ Agregar insumo…</option>
          {TIPOS_INSUMO.map(([t, etiqueta]) => (
            <optgroup key={t} label={etiqueta}>
              {insumos.filter((i) => i.activo && i.tipo === t).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} · {i.unidad} · {soles(Number(i.precio))}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-muted-foreground">
            P.U. calculado <strong className="text-ink">{soles(calc.pu)}</strong>
          </span>
          <button
            type="button"
            onClick={() => void sincronizarPu()}
            className="rounded-md border border-primary/40 px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
          >
            Aplicar al C. unitario
          </button>
        </div>
      </div>
    </div>
  );
}

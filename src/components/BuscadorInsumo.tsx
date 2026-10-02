import { useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { coincide, Resaltar } from "@/components/Buscador";
import { Boton, Input, Select } from "@/components/ui-kit";
import { TIPOS_INSUMO, useTiposInsumo, apuDb, nombreTipo, precioVenta, type Insumo, type TipoInsumo } from "@/lib/apu";

/** Buscador con autocompletado de insumos y creación rápida al vuelo. */
export function BuscadorInsumo({
  insumos,
  onElegir,
  onCreado,
}: {
  insumos: Insumo[];
  onElegir: (id: string) => void | Promise<void>;
  onCreado: () => Promise<unknown> | void;
}) {
  useTiposInsumo();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ tipo: "MAT" as TipoInsumo, unidad: "und", precio: "" });
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const lista = useMemo(
    () => insumos.filter((i) => i.activo && coincide(q, i.nombre, i.codigo, nombreTipo(i.tipo))).slice(0, 12),
    [insumos, q],
  );
  const opciones = lista.length + (q.trim() ? 1 : 0);

  async function elegir(id: string) {
    await onElegir(id);
    setQ("");
    setAbierto(false);
    setActivo(0);
    ref.current?.focus();
  }

  async function crear() {
    setError("");
    const nombre = q.trim();
    if (!nombre) return;
    const { data, error: err } = await apuDb
      .from("insumos")
      .insert({ tipo: nuevo.tipo, codigo: "", nombre, unidad: nuevo.unidad.trim() || "und", precio: Number(nuevo.precio || 0), activo: true })
      .select("id")
      .single();
    if (err) return setError(err.message);
    await onCreado();
    setCreando(false);
    setNuevo({ tipo: nuevo.tipo, unidad: "und", precio: "" });
    await elegir(data.id);
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, opciones - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Escape") setAbierto(false);
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activo < lista.length && lista[activo]) void elegir(lista[activo].id);
      else if (q.trim()) { setCreando(true); setAbierto(false); }
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Search size={13} className="pointer-events-none absolute left-2.5 top-2.5 text-muted-foreground" />
      <Input
        ref={ref}
        className="py-1.5 pl-8 text-xs"
        placeholder="Buscar insumo por nombre, código o tipo… (Enter para agregar)"
        value={q}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); setActivo(0); setCreando(false); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={teclas}
      />
      {abierto && opciones > 0 && (
        <ul className="absolute bottom-full left-0 z-20 mb-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-card py-1 font-mono text-xs shadow-lg">
          {lista.map((i, k) => (
            <li key={i.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActivo(k)}
                onClick={() => void elegir(i.id)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${k === activo ? "bg-primary/10" : ""}`}
              >
                <span className="w-9 shrink-0 rounded bg-muted px-1 text-center text-[10px] text-muted-foreground">{i.tipo}</span>
                <span className="min-w-0 flex-1 truncate text-ink"><Resaltar texto={i.nombre} termino={q} /></span>
                <span className="text-muted-foreground">{i.unidad} · S/ {precioVenta(i).toFixed(2)}</span>
              </button>
            </li>
          ))}
          {q.trim() && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActivo(lista.length)}
                onClick={() => { setCreando(true); setAbierto(false); }}
                className={`flex w-full items-center gap-2 border-t border-line px-3 py-1.5 text-left text-primary ${activo === lista.length ? "bg-primary/10" : ""}`}
              >
                <Plus size={13} /> Crear insumo «{q.trim()}»
              </button>
            </li>
          )}
        </ul>
      )}
      {creando && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-primary/40 bg-muted/40 p-2 font-mono text-xs">
          <span className="w-full text-[10px] uppercase tracking-wider text-muted-foreground">Nuevo insumo: <b className="text-ink normal-case">{q.trim()}</b></span>
          <label>Tipo<Select className="mt-1 py-1 text-xs" value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoInsumo, unidad: e.target.value === "MO" ? "hh" : e.target.value === "HT" ? "%MO" : nuevo.unidad })}>
            {TIPOS_INSUMO.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </Select></label>
          <label className="w-20">Unidad<Input className="mt-1 py-1 text-xs" value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })} /></label>
          <label className="w-28">{nuevo.tipo === "HT" ? "%" : "Precio (S/)"}<Input autoFocus className="mt-1 py-1 text-right text-xs" type="number" step="0.01" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} onKeyDown={(e) => e.key === "Enter" && void crear()} /></label>
          <Boton type="button" onClick={() => void crear()}>Crear y agregar</Boton>
          <Boton type="button" variante="linea" onClick={() => setCreando(false)}>Cancelar</Boton>
          {error && <p className="w-full text-bad">{error}</p>}
        </div>
      )}
    </div>
  );
}

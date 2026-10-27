import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Input, Panel } from "@/components/ui-kit";
import { useTiposInsumo, type TipoInsumo, type TipoInsumoFila } from "@/lib/apu";
import { recodificarWbs } from "@/lib/wbs";

const db = supabase as unknown as { from: (t: string) => any };

const REGLA = [
  { nombre: "MANO DE OBRA", clave: "MO", digito: 1, ss: false },
  { nombre: "MATERIALES", clave: "MAT", digito: 2, ss: true },
  { nombre: "EQUIPOS", clave: "EQ", digito: 3, ss: false },
  { nombre: "HERRAMIENTAS", clave: "HE", digito: 4, ss: false },
  { nombre: "SUBCONTRATOS", clave: "SC", digito: 5, ss: false },
  { nombre: "EQUIPO DE PROTECCIÓN PERSONAL", clave: "EPP", digito: 6, ss: false },
];

type Edicion = Record<string, { nombre: string; digito: number; correlativo: number }>;

/** Clave corta única derivada del nombre (ej. «MANO DE OBRA ESPECIAL» → MOE). */
function sugerirClave(nombre: string, usadas: string[]) {
  const base =
    nombre
      .toUpperCase()
      .normalize("NFD")
      .replace(/[^A-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter((p) => p && !["DE", "Y", "LA", "EL", "DEL", "LOS", "LAS"].includes(p))
      .map((p) => p[0])
      .join("")
      .slice(0, 6) || "T";
  let clave = base;
  let n = 2;
  while (usadas.includes(clave)) clave = `${base}${n++}`;
  return clave;
}

export function CodificacionInsumos({ onAgregarTipo }: { onAgregarTipo?: (tipo: TipoInsumo) => void }) {
  const qc = useQueryClient();
  const { data: tipos = [] } = useTiposInsumo();
  const [form, setForm] = useState<Edicion>({});
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    setForm(Object.fromEntries(tipos.map((t) => [t.id, { nombre: t.nombre, digito: t.digito, correlativo: Number(t.correlativo) }])));
  }, [tipos]);

  const refrescar = async () => {
    await recodificarWbs().catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["tipos_insumo"] });
    qc.invalidateQueries({ queryKey: ["margenes_insumo"] });
    qc.invalidateQueries({ queryKey: ["insumos"] });
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
  };

  async function crearTipo() {
    const nombre = nuevoNombre.trim().toUpperCase();
    if (!nombre) return setError("Escribe el nombre del tipo de insumo.");
    if (tipos.some((t) => t.nombre === nombre)) return setError("Ya existe un tipo con ese nombre.");
    const usados = tipos.map((t) => t.digito);
    const digito = [6, 7, 8, 9, 0].find((d) => !usados.includes(d));
    if (digito === undefined) return setError("No quedan dígitos libres (0–9) para un tipo nuevo.");
    setError("");
    setGuardando(true);
    const clave = sugerirClave(nombre, tipos.map((t) => t.clave));
    const orden = Math.max(0, ...tipos.map((t) => t.orden)) + 1;
    const { error: err } = await db.from("tipos_insumo").insert({ clave, nombre, digito, orden });
    setGuardando(false);
    if (err) return setError(err.message);
    setNuevoNombre("");
    setNuevoAbierto(false);
    setAviso(`Tipo «${nombre}» creado con dígito ${digito}.`);
    await refrescar();
  }

  async function eliminarTipo(t: TipoInsumoFila) {
    if (!confirm(`¿Eliminar el tipo «${t.nombre}»? Solo es posible si no tiene insumos registrados.`)) return;
    setError("");
    const { error: err } = await db.from("tipos_insumo").delete().eq("id", t.id);
    if (err) return setError(err.message);
    setAviso(`Tipo «${t.nombre}» eliminado.`);
    await refrescar();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    const filas = tipos.map((t) => ({ t, f: form[t.id] ?? { nombre: t.nombre, digito: t.digito, correlativo: Number(t.correlativo) } }));
    const digitos = filas.map(({ f }) => Number(f.digito));
    if (digitos.some((d) => d < 0 || d > 9)) return setError("Los dígitos de tipo deben estar entre 0 y 9.");
    if (new Set(digitos).size !== digitos.length) return setError("Cada tipo de insumo debe tener un dígito distinto.");
    if (filas.some(({ f }) => !f.nombre.trim())) return setError("Cada tipo debe tener un nombre.");
    setGuardando(true);
    // Dígitos temporales para evitar choques de unicidad al intercambiarlos.
    const cambian = filas.filter(({ t, f }) => t.digito !== Number(f.digito));
    for (const [i, { t }] of cambian.entries()) {
      const { error: err } = await db.from("tipos_insumo").update({ digito: -1 - i }).eq("id", t.id);
      if (err) { setGuardando(false); return setError(err.message); }
    }
    for (const { t, f } of filas) {
      const { error: err } = await db
        .from("tipos_insumo")
        .update({ nombre: f.nombre.trim().toUpperCase(), digito: Number(f.digito), correlativo: Number(f.correlativo) })
        .eq("id", t.id);
      if (err) { setGuardando(false); return setError(err.message); }
    }
    setGuardando(false);
    setAviso("Regla de codificación guardada correctamente.");
    await refrescar();
  }

  const mo = tipos.find((t) => t.clave === "MO");
  const fMo = mo ? form[mo.id] : undefined;

  return (
    <form onSubmit={guardar} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel
        titulo="Codificación automática de insumos"
        extra={
          <button
            type="button"
            title="Añadir nuevo tipo de insumo"
            onClick={() => { setNuevoAbierto(true); setError(""); }}
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Plus size={14} />
          </button>
        }
      >
        <div className="p-4">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Tipo de insumo</th>
                <th className="w-16 py-2 pr-3 font-medium">Clave</th>
                <th className="w-24 px-3 py-2 font-medium">Dígito</th>
                <th className="w-32 px-3 py-2 font-medium">Estructura</th>
                <th className="py-2 pl-3 font-medium">Formato del código</th>
                <th className="py-2 pl-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {nuevoAbierto && (
                <tr className="border-b border-line bg-primary/5">
                  <td colSpan={3} className="py-2 pr-3">
                    <Input
                      autoFocus
                      className="py-1 uppercase"
                      placeholder="Nombre del nuevo tipo y pulsa Enter…"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); void crearTipo(); }
                        if (e.key === "Escape") { setNuevoAbierto(false); setNuevoNombre(""); }
                      }}
                    />
                  </td>
                  <td colSpan={3} className="px-3 py-2 text-[10px] text-muted-foreground">
                    Dígito automático: {[6, 7, 8, 9, 0].find((d) => !tipos.some((t) => t.digito === d)) ?? "—"}
                  </td>
                  <td className="py-2 pl-2">
                    <Boton type="button" disabled={guardando} onClick={() => void crearTipo()}>Crear</Boton>
                  </td>
                </tr>
              )}
              {REGLA.map((r) => (
                <tr key={r.digito} className="border-b border-line/40 last:border-0">
                  <td className="py-2 pr-3 text-ink">{r.nombre}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.clave}</td>
                  <td className="px-3 py-2 text-center text-sm font-semibold">{r.digito}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.ss ? "Especialidad + subfamilia" : "Especialidad + 00"}</td>
                  <td className="py-2 pl-3 font-semibold text-primary">{r.digito}EE{r.ss ? "SS" : "00"}NNN</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          {error && <span className="font-mono text-xs text-bad">{error}</span>}
          {aviso && <span className="font-mono text-xs text-good">{aviso}</span>}
        </div>
      </Panel>

      <Panel titulo="Cómo funciona">
        <div className="space-y-3 p-4">
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Cada insumo recibe un código de 8 dígitos: tipo (1 dígito) + especialidad (2) + subfamilia (2, solo
            materiales; el resto 00) + correlativo (3). Ejemplo: Capataz 10600001. Equipos y herramientas se separan
            solo en el código (3 y 4); en el APU siguen juntos. El EPP no entra al APU. Herramientas manuales no lleva
            código. El código se genera solo al guardar la ficha y nunca se repite.
          </p>
        </div>
      </Panel>
    </form>
  );
}

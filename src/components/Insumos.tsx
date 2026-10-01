import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { soles } from "@/lib/format";
import { useUnidadesMedida } from "@/lib/unidades";
import { TIPOS_INSUMO, apuDb, nombreTipo, precioVenta, useInsumos, type Insumo, type TipoInsumo } from "@/lib/apu";

const vacio = { tipo: "MAT" as TipoInsumo, codigo: "", nombre: "", unidad: "und", precio: "", margen: "" };

export function Insumos() {
  const qc = useQueryClient();
  const { data: lista = [] } = useInsumos();
  const { data: unidades = [] } = useUnidadesMedida();
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [filtro, setFiltro] = useState<TipoInsumo>("MO");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["insumos"] });
    qc.invalidateQueries({ queryKey: ["apu_componentes"] });
  };
  const simbolos = useMemo(() => {
    const s = unidades.filter((u) => u.activo).map((u) => u.simbolo);
    return [...new Set([...s, "hh", "hm", "und", "%mo"])];
  }, [unidades]);
  
  const visibles = lista
    .filter((i) => i.tipo === filtro)
    .filter((i) => coincide(busqueda, i.codigo, i.nombre));

  function cambiarPestana(t: TipoInsumo) {
    setFiltro(t);
    setForm((f) => ({ ...f, tipo: t }));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim()) return setError("Escribe la descripción del insumo.");
    const { error: err } = await apuDb.from("insumos").insert({
      tipo: form.tipo,
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      unidad: form.unidad,
      precio: Number(form.precio || 0),
      margen_pct: Number(form.margen || 0),
    });
    if (err) return setError(err.message);
    setForm({ ...vacio, tipo: form.tipo, unidad: form.unidad });
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    const { error: err } = await apuDb
      .from("insumos")
      .update({
        tipo: editando.tipo,
        codigo: editando.codigo.trim(),
        nombre: editando.nombre.trim(),
        unidad: editando.unidad,
        precio: Number(editando.precio || 0),
        margen_pct: Number(editando.margen_pct || 0),
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este insumo?")) return;
    const { error: err } = await apuDb.from("insumos").delete().eq("id", id);
    if (err)
      return setError(
        err.message.includes("foreign key") ? "El insumo se usa en un análisis de precios; desactívalo." : err.message,
      );
    refrescar();
  }

  return (
    <>
      <Panel titulo="Nuevo insumo" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-7">
          <Campo etiqueta="Tipo">
            <Select className="py-1.5" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoInsumo })}>
              {TIPOS_INSUMO.map(([k, t]) => (
                <option key={k} value={k}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Código">
            <Input className="py-1.5 font-mono" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Opcional" />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Descripción">
              <Input className="py-1.5" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Cemento Portland tipo I" />
            </Campo>
          </div>
          <Campo etiqueta="Unidad">
            <Select className="py-1.5" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
              {simbolos.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="P. compra sin IGV (S/)">
            <Input className="py-1.5" type="number" step="0.01" min={0} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
          </Campo>
          <Campo etiqueta="Margen (%)">
            <Input className="py-1.5" type="number" step="0.01" min={0} value={form.margen} onChange={(e) => setForm({ ...form, margen: e.target.value })} />
          </Campo>
          <div className="sm:col-span-7 flex justify-end">
            <Boton type="submit">Agregar insumo</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-7">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Maestro de insumos"
        extra={
          <div className="flex items-center gap-2">
            <Buscador valor={busqueda} onChange={setBusqueda} total={visibles.length} placeholder="Buscar insumo por código o descripción..." />
            <Select className="py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value as "" | TipoInsumo)}>
              <option value="">Todos los tipos</option>
              {TIPOS_INSUMO.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </Select>
          </div>
        }
      >
        {visibles.length === 0 ? (
          <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay insumos registrados."} />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[14%] px-5 py-2 font-medium">Tipo</th>
                <th className="w-[9%] px-3 py-2 font-medium">Código</th>
                <th className="w-[27%] px-3 py-2 font-medium">Descripción</th>
                <th className="w-[7%] px-3 py-2 font-medium">Und.</th>
                <th className="w-[11%] px-3 py-2 text-right font-medium">P. Compra</th>
                <th className="w-[8%] px-3 py-2 text-right font-medium">Margen %</th>
                <th className="w-[11%] px-3 py-2 text-right font-medium">P. Venta</th>
                <th className="w-[6%] px-3 py-2 font-medium">Estado</th>
                <th className="w-[7%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((i) =>
                editando?.id === i.id ? (
                  <tr key={i.id} className="border-b border-line/40">
                    <td className="px-5 py-2">
                      <Select className="py-1 text-xs" value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value as TipoInsumo })}>
                        {TIPOS_INSUMO.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2"><Input className="py-1 text-xs" value={editando.codigo} onChange={(e) => setEditando({ ...editando, codigo: e.target.value })} /></td>
                    <td className="px-3 py-2"><Input className="py-1 text-xs" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <Select className="py-1 text-xs" value={editando.unidad} onChange={(e) => setEditando({ ...editando, unidad: e.target.value })}>
                        {[...new Set([editando.unidad, ...simbolos])].map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2"><Input className="py-1 text-right text-xs" type="number" step="0.01" value={editando.precio} onChange={(e) => setEditando({ ...editando, precio: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2"><Input className="py-1 text-right text-xs" type="number" step="0.01" value={editando.margen_pct} onChange={(e) => setEditando({ ...editando, margen_pct: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2 text-right text-ink">{soles(precioVenta(editando))}</td>
                    <td className="px-3 py-2">
                      <Select className="py-1 text-xs" value={editando.activo ? "si" : "no"} onChange={(e) => setEditando({ ...editando, activo: e.target.value === "si" })}>
                        <option value="si">Activo</option>
                        <option value="no">Inactivo</option>
                      </Select>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={guardar} title="Guardar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"><Check size={14} /></button>
                        <button type="button" onClick={() => setEditando(null)} title="Cancelar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"><X size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-2.5 text-muted-foreground">{nombreTipo(i.tipo)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={i.codigo || "—"} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-ink"><Resaltar texto={i.nombre} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{i.unidad}</td>
                    <td className="px-3 py-2.5 text-right">{soles(Number(i.precio))}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{Number(i.margen_pct || 0).toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-right text-ink">{soles(precioVenta(i))}</td>
                    <td className="px-3 py-2.5"><span className={i.activo ? "text-good" : "text-muted-foreground"}>{i.activo ? "Activo" : "Inactivo"}</span></td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditando(i)} title="Editar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Pencil size={14} /></button>
                        <button type="button" onClick={() => eliminar(i.id)} title="Eliminar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
        <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Mano de obra y equipos se valorizan por hora (hh / hm). Los precios se registran sin IGV y alimentan el análisis de precios unitarios de cada partida.
        </p>
      </Panel>
    </>
  );
}

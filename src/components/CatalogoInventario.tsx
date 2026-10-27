import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, Copy, Pencil, Plus, ShieldCheck, Trash2, Wrench, Package } from "lucide-react";
import { toast } from "sonner";
import { BancoEpp } from "@/components/epp/epp";
import { VentanaInsumo, type SelInsumo } from "@/components/InsumoVentana";
import { Boton, BotonIcono, FilasCargando, MenuFiltros, Panel, Pestanas, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useBancoTabla } from "@/lib/banco-apu";
import { num, useMovimientos } from "@/lib/logistica";
import { perteneceCatalogo, type CategoriaInventario } from "@/lib/catalogo-inventario";
import { supabase } from "@/integrations/supabase/client";
import { soles } from "@/lib/format";

type Grupo = "materiales" | "equipos" | "herramientas" | "epp";
export function CatalogoInventario() {
  const qc = useQueryClient();
  const materiales = useBancoTabla("materiales");
  const equipos = useBancoTabla("equipos_herramientas");
  const [grupo, setGrupo] = useState<Grupo>("materiales");
  const [buscar, setBuscar] = useState("");
  const [inactivos, setInactivos] = useState(false);
  const [editor, setEditor] = useState<{ sel: SelInsumo | null; modo?: "nuevo" | "editar" | "copiar"; categoria?: CategoriaInventario } | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [selId, setSelId] = useState("");
  const categoria: CategoriaInventario = grupo === "herramientas" ? "Herramienta" : "Equipo";
  const tabla = grupo === "materiales" ? "materiales" : "equipos_herramientas";
  const consulta = grupo === "materiales" ? materiales : equipos;
  const lista = (consulta.data ?? []).filter((r) => grupo === "materiales" || perteneceCatalogo(r.categoria_inventario, categoria))
    .filter((r) => inactivos || r.estado !== "inactivo")
    .filter((r) => coincide(buscar, r.codigo, r.descripcion, r.marca))
    .sort((a, b) => String(a.descripcion).localeCompare(String(b.descripcion), "es", { sensitivity: "base" }));
  const selFila = lista.find((r) => r.id === selId) ?? null;
  const { data: movs = [] } = useMovimientos();
  // Maestro único: la ficha del catálogo es la misma que lleva el kardex.
  const stockPorInsumo = new Map<string, number>();
  for (const m of movs) {
    if (!m.insumo_id) continue;
    const d = m.tipo === "Ingreso" ? Number(m.cantidad) : -Number(m.cantidad);
    stockPorInsumo.set(m.insumo_id, (stockPorInsumo.get(m.insumo_id) ?? 0) + d);
  }
  const stockDe = (r: { id?: string }) => (r.id ? stockPorInsumo.get(r.id) : undefined);
  const nombreGrupo = grupo === "materiales" ? "Materiales" : grupo === "equipos" ? "Equipos" : "Herramientas";
  const objeto = grupo === "materiales" ? "material" : grupo === "equipos" ? "equipo" : "herramienta";
  async function clasificar(id: string, valor: string) {
    setGuardando(id);
    const { error } = await supabase.from("equipos_herramientas").update({ categoria_inventario: valor || null }).eq("id", id);
    setGuardando(null);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["banco_apu", "equipos_herramientas"] });
  }
  async function eliminar(id: string, descripcion: string) {
    if (!confirm(`¿Eliminar «${descripcion}» del catálogo? Quedará como inactivo.`)) return;
    setGuardando(id);
    const { error } = await supabase.from("insumos").update({ activo: false }).eq("id", id);
    setGuardando(null);
    if (error) { toast.error(error.message); return; }
    if (selId === id) setSelId("");
    toast.success(`«${descripcion}» eliminado del catálogo.`);
    await qc.invalidateQueries({ queryKey: ["banco_apu", tabla] });
  }
  const abrir = (modo: "nuevo" | "editar" | "copiar") =>
    setEditor(modo === "nuevo"
      ? { sel: null, modo, ...(grupo !== "materiales" ? { categoria } : {}) }
      : { sel: { tabla, fila: selFila! }, modo, ...(selFila!.categoria_inventario ? { categoria: selFila!.categoria_inventario as CategoriaInventario } : {}) });
  return <div className="space-y-4">
    <Pestanas etiqueta="Catálogo de Inventario" valor={grupo} onCambiar={(g) => { setGrupo(g); setBuscar(""); setSelId(""); }} opciones={[
      { id: "materiales", texto: "Materiales", icono: <Package size={15} /> },
      { id: "equipos", texto: "Equipos", icono: <Boxes size={15} /> },
      { id: "herramientas", texto: "Herramientas", icono: <Wrench size={15} /> },
      { id: "epp", texto: "EPPs", icono: <ShieldCheck size={15} /> },
    ]} />
    {grupo === "epp" ? <BancoEpp /> : (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <Panel titulo={`Catálogo de ${nombreGrupo}`}>
          {consulta.error ? <Vacio texto="No se pudo cargar el catálogo." accion={<Boton variante="linea" onClick={() => consulta.refetch()}>Reintentar</Boton>} /> : <div className="overflow-x-auto">
            <table className="w-full text-xs"><thead className="border-b border-line text-left text-muted-foreground"><tr>
              <th className="px-3 py-2">Código</th><th className="px-3 py-2">Descripción</th><th className="px-3 py-2">{grupo === "materiales" ? "Marca" : "Clasificación"}</th><th className="px-3 py-2">Und.</th><th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2 text-right">{grupo === "materiales" ? "Precio base" : "Costo hora"}</th><th className="px-3 py-2">Estado</th>
            </tr></thead><tbody>{consulta.isLoading ? <FilasCargando columnas={7} /> : lista.map((r) => <tr key={r.id} onClick={() => setSelId(r.id)} className={`cursor-pointer border-b border-line/50 transition-colors ${selId === r.id ? "bg-primary/10" : "hover:bg-muted/60"}`}>
              <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.codigo}</td><td className="px-3 py-1.5"><Resaltar texto={r.descripcion} termino={buscar} /></td>
              <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>{grupo === "materiales" ? r.marca || "—" : <Select aria-label={`Clasificación de ${r.descripcion}`} className="h-7 py-0 text-xs" value={r.categoria_inventario ?? ""} disabled={guardando === r.id} onChange={(e) => void clasificar(r.id, e.target.value)}><option value="">Sin clasificar</option><option value="Equipo">Equipo</option><option value="Herramienta">Herramienta</option></Select>}</td>
              <td className="px-3 py-1.5">{r.unidad}</td><td className="px-3 py-1.5 text-right font-mono">{(() => { const c = stockDe(r); return c === undefined ? "—" : num(c); })()}</td><td className="px-3 py-1.5 text-right font-mono">{soles(Number(grupo === "materiales" ? r.precio_base : r.costo_hora))}</td><td className="px-3 py-1.5 text-muted-foreground">{r.estado === "inactivo" ? "Inactivo" : "Activo"}</td>
            </tr>)}</tbody></table>
            {!consulta.isLoading && !lista.length && <Vacio texto={buscar ? "Sin coincidencias." : "No hay registros en este catálogo."} />}
          </div>}
        </Panel>
        <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
          <MenuFiltros activos={[buscar, inactivos].filter(Boolean).length} onLimpiar={() => { setBuscar(""); setInactivos(false); }}>
            <Buscador valor={buscar} onChange={setBuscar} placeholder="Buscar código, descripción o marca…" total={lista.length} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} /> Incluir inactivos</label>
          </MenuFiltros>
          <BotonIcono etiqueta={`Nuevo ${objeto}`} title={`Nuevo ${objeto}`} tono="primario" onClick={() => abrir("nuevo")}><Plus size={15} /></BotonIcono>
          <BotonIcono etiqueta={`Editar ${selFila?.descripcion ?? objeto}`} title={`Editar ${selFila?.descripcion ?? objeto}`} disabled={!selFila || guardando === selFila?.id} onClick={() => selFila && abrir("editar")}><Pencil size={15} /></BotonIcono>
          <BotonIcono etiqueta={`Copiar ${selFila?.descripcion ?? objeto}`} title={`Copiar ${selFila?.descripcion ?? objeto}`} disabled={!selFila} onClick={() => selFila && abrir("copiar")}><Copy size={15} /></BotonIcono>
          <BotonIcono etiqueta={`Eliminar ${selFila?.descripcion ?? objeto}`} title={`Eliminar ${selFila?.descripcion ?? objeto}`} tono="peligro" disabled={!selFila || guardando === selFila?.id} onClick={() => selFila && void eliminar(selFila.id, selFila.descripcion)}><Trash2 size={15} /></BotonIcono>
        </div>
      </div>
    )}
    {editor && <VentanaInsumo modo={editor.modo ?? (editor.sel ? "editar" : "nuevo")} sel={editor.sel} soloTabla={tabla} conStock stockActual={editor.sel ? stockDe(editor.sel.fila) ?? null : null} {...(editor.categoria ? { categoriaInventario: editor.categoria } : {})} onGuardado={() => qc.invalidateQueries({ queryKey: ["movimientos_almacen"] })} onCerrar={() => setEditor(null)} />}
  </div>;
}

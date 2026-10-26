import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, Pencil, Plus, ShieldCheck, Wrench, Package } from "lucide-react";
import { toast } from "sonner";
import { BancoEpp } from "@/components/epp/epp";
import { VentanaInsumo, type SelInsumo } from "@/components/InsumoVentana";
import { Boton, BotonIcono, FilasCargando, MenuFiltros, Panel, Pestanas, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useBancoTabla } from "@/lib/banco-apu";
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
  const [editor, setEditor] = useState<{ sel: SelInsumo | null; categoria?: CategoriaInventario } | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const categoria: CategoriaInventario = grupo === "herramientas" ? "Herramienta" : "Equipo";
  const tabla = grupo === "materiales" ? "materiales" : "equipos_herramientas";
  const consulta = grupo === "materiales" ? materiales : equipos;
  const lista = (consulta.data ?? []).filter((r) => grupo === "materiales" || perteneceCatalogo(r.categoria_inventario, categoria))
    .filter((r) => inactivos || r.estado !== "inactivo")
    .filter((r) => coincide(buscar, r.codigo, r.descripcion, r.marca))
    .sort((a, b) => String(a.descripcion).localeCompare(String(b.descripcion), "es", { sensitivity: "base" }));
  async function clasificar(id: string, valor: string) {
    setGuardando(id);
    const { error } = await supabase.from("equipos_herramientas").update({ categoria_inventario: valor || null }).eq("id", id);
    setGuardando(null);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["banco_apu", "equipos_herramientas"] });
  }
  return <div className="space-y-4">
    <Pestanas etiqueta="Catálogo de Inventario" valor={grupo} onCambiar={(g) => { setGrupo(g); setBuscar(""); }} opciones={[
      { id: "materiales", texto: "Materiales", icono: <Package size={15} /> },
      { id: "equipos", texto: "Equipos", icono: <Boxes size={15} /> },
      { id: "herramientas", texto: "Herramientas", icono: <Wrench size={15} /> },
      { id: "epp", texto: "EPPs", icono: <ShieldCheck size={15} /> },
    ]} />
    {grupo === "epp" ? <BancoEpp /> : <Panel titulo={`Catálogo de ${grupo === "materiales" ? "Materiales" : grupo === "equipos" ? "Equipos" : "Herramientas"}`} extra={<div className="flex items-center gap-2">
      <MenuFiltros flotante activos={[buscar, inactivos].filter(Boolean).length} onLimpiar={() => { setBuscar(""); setInactivos(false); }}>
        <Buscador valor={buscar} onChange={setBuscar} placeholder="Buscar código, descripción o marca…" total={lista.length} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} /> Incluir inactivos</label>
      </MenuFiltros>
      <Boton onClick={() => setEditor({ sel: null, ...(grupo !== "materiales" ? { categoria } : {}) })}><Plus size={14} /> {grupo === "materiales" ? "Nuevo material" : grupo === "equipos" ? "Nuevo equipo" : "Nueva herramienta"}</Boton>
    </div>}>
      {consulta.error ? <Vacio texto="No se pudo cargar el catálogo." accion={<Boton variante="linea" onClick={() => consulta.refetch()}>Reintentar</Boton>} /> : <div className="overflow-x-auto">
        <table className="w-full text-xs"><thead className="border-b border-line text-left text-muted-foreground"><tr>
          <th className="px-3 py-2">Código</th><th className="px-3 py-2">Descripción</th><th className="px-3 py-2">{grupo === "materiales" ? "Marca" : "Clasificación"}</th><th className="px-3 py-2">Und.</th><th className="px-3 py-2 text-right">{grupo === "materiales" ? "Precio base" : "Costo hora"}</th><th className="px-3 py-2">Estado</th><th className="w-10 px-3 py-2" />
        </tr></thead><tbody>{consulta.isLoading ? <FilasCargando columnas={7} /> : lista.map((r) => <tr key={r.id} className="border-b border-line/50">
          <td className="px-3 py-1.5 font-mono text-muted-foreground">{r.codigo}</td><td className="px-3 py-1.5"><Resaltar texto={r.descripcion} termino={buscar} /></td>
          <td className="px-3 py-1.5">{grupo === "materiales" ? r.marca || "—" : <Select aria-label={`Clasificación de ${r.descripcion}`} className="h-7 py-0 text-xs" value={r.categoria_inventario ?? ""} disabled={guardando === r.id} onChange={(e) => void clasificar(r.id, e.target.value)}><option value="">Sin clasificar</option><option value="Equipo">Equipo</option><option value="Herramienta">Herramienta</option></Select>}</td>
          <td className="px-3 py-1.5">{r.unidad}</td><td className="px-3 py-1.5 text-right font-mono">{soles(Number(grupo === "materiales" ? r.precio_base : r.costo_hora))}</td><td className="px-3 py-1.5 text-muted-foreground">{r.estado === "inactivo" ? "Inactivo" : "Activo"}</td>
          <td className="px-3 py-1.5"><BotonIcono etiqueta={`Editar ${r.descripcion}`} onClick={() => setEditor({ sel: { tabla, fila: r }, ...(r.categoria_inventario ? { categoria: r.categoria_inventario as CategoriaInventario } : {}) })}><Pencil size={13} /></BotonIcono></td>
        </tr>)}</tbody></table>
        {!consulta.isLoading && !lista.length && <Vacio texto={buscar ? "Sin coincidencias." : "No hay registros en este catálogo."} />}
      </div>}
    </Panel>}
    {editor && <VentanaInsumo modo={editor.sel ? "editar" : "nuevo"} sel={editor.sel} soloTabla={tabla} {...(editor.categoria ? { categoriaInventario: editor.categoria } : {})} onCerrar={() => setEditor(null)} />}
  </div>;
}
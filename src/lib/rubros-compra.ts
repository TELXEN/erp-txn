import { useBancoTabla } from "@/lib/banco-apu";
import { perteneceCatalogo } from "@/lib/catalogo-inventario";
import { useEpps } from "@/components/epp/epp";
import { apuDb } from "@/lib/apu";

/** Rubro homogéneo de un requerimiento / cotización / orden de compra. Nunca se mezclan. */
export type RubroCompra = "MAT" | "EQ" | "HE" | "EPP";
export const RUBROS_COMPRA: { id: RubroCompra; texto: string }[] = [
  { id: "MAT", texto: "Materiales" },
  { id: "EQ", texto: "Equipos" },
  { id: "HE", texto: "Herramientas" },
  { id: "EPP", texto: "EPP" },
];
export const nombreRubro = (r: string | null | undefined) => RUBROS_COMPRA.find((x) => x.id === r)?.texto ?? "—";

/** Tipo de la ficha de almacén (`insumos`) que corresponde al rubro. El EPP tiene su propio tipo (oculto en el APU); nunca es Material. */
export const tipoFichaRubro = (r: RubroCompra) => (r === "EQ" || r === "HE" ? "EQ" : r === "EPP" ? "EPP" : "MAT");

/** EPP, equipos y herramientas de soporte en obra se imputan a Gastos Generales; los materiales a la partida. */
export const imputaGastosGenerales = (r: string | null | undefined) => r === "EPP" || r === "EQ" || r === "HE";

/** Comprueba que todas las líneas sean del mismo rubro que el documento. */
export function validarRubroUnico(rubro: RubroCompra | "", lineas: { rubro?: string | null }[]) {
  if (!rubro) return "Elige primero qué vas a comprar: Materiales, Equipos, Herramientas o EPP.";
  if (lineas.some((l) => l.rubro && l.rubro !== rubro)) return "No se pueden mezclar rubros en un mismo documento.";
  return "";
}

export type ArticuloRubro = { clave: string; codigo: string; nombre: string; unidad: string; precio: number; rubro: RubroCompra };

/** Lista de artículos del catálogo de Inventario para un rubro. */
export function useCatalogoRubro(rubro: RubroCompra | "") {
  const mat = useBancoTabla("materiales");
  const eq = useBancoTabla("equipos_herramientas");
  const epp = useEpps();
  if (!rubro) return [] as ArticuloRubro[];
  let lista: ArticuloRubro[] = [];
  if (rubro === "MAT") lista = (mat.data ?? []).filter((r) => r.estado !== "inactivo").map((r) => ({ clave: `mat:${r.id}`, codigo: String(r.codigo ?? ""), nombre: String(r.descripcion), unidad: String(r.unidad ?? "und"), precio: Number(r.precio_base ?? 0), rubro }));
  else if (rubro === "EPP") lista = (epp.data ?? []).filter((e) => e.activo).map((e) => ({ clave: `epp:${e.id}`, codigo: e.codigo, nombre: e.nombre, unidad: "und", precio: Number(e.costo_unitario ?? 0), rubro }));
  else {
    const cat = rubro === "HE" ? "Herramienta" : "Equipo";
    lista = (eq.data ?? []).filter((r) => r.estado !== "inactivo" && perteneceCatalogo(r.categoria_inventario as string | null, cat)).map((r) => ({ clave: `eq:${r.id}`, codigo: String(r.codigo ?? ""), nombre: String(r.descripcion), unidad: String(r.unidad ?? "und"), precio: Number(r.costo_unitario ?? r.costo_hora ?? 0), rubro }));
  }
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}

/** Busca (o crea) la ficha de almacén del artículo, para que su stock se lleve en el kardex. */
export async function asegurarFichaAlmacen(a: ArticuloRubro): Promise<string> {
  const tipo = tipoFichaRubro(a.rubro);
  const { data: ex } = await apuDb.from("insumos").select("id").eq("tipo", tipo).eq("unidad", a.unidad).ilike("nombre", a.nombre);
  if (ex?.[0]?.id) return ex[0].id as string;
  const { data, error } = await apuDb.from("insumos").insert({ tipo, codigo: a.codigo, nombre: a.nombre, unidad: a.unidad, precio: a.precio }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

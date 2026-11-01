type Categoria = { id: string; codigo: string };
type Subcategoria = { id: string; especialidad_id: string; categoria_id: string | null; codigo: string; nombre: string };
const alfabeto = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** Orden A–Z y secuencia independiente desde 01 en cada categoría. */
export function numerarSubcategorias<T extends Subcategoria>(filas: T[], categorias: Categoria[]) {
  const rango = new Map(categorias.map((c) => [c.id, Number(c.codigo)]));
  const contadores = new Map<string, number>();
  return [...filas].sort((a, b) => a.especialidad_id.localeCompare(b.especialidad_id)
    || (rango.get(a.categoria_id ?? "") ?? 100) - (rango.get(b.categoria_id ?? "") ?? 100)
    || alfabeto.compare(a.nombre, b.nombre) || a.id.localeCompare(b.id)).map((fila) => {
      const grupo = `${fila.especialidad_id}:${fila.categoria_id ?? ""}`;
      const numero = (contadores.get(grupo) ?? 0) + 1;
      if (numero > 99) throw new Error("Una categoría admite hasta 99 subcategorías.");
      contadores.set(grupo, numero);
      return { ...fila, codigo: String(numero).padStart(2, "0") };
    });
}
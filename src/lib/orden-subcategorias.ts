type Categoria = { id: string; codigo: string };
type Subcategoria = { id: string; especialidad_id: string; categoria_id: string | null; codigo: string };

/** Secuencia por especialidad, siguiendo los grupos A–Z y su orden interno. */
export function numerarSubcategorias<T extends Subcategoria>(filas: T[], categorias: Categoria[]) {
  const rango = new Map(categorias.map((c) => [c.id, Number(c.codigo)]));
  const contadores = new Map<string, number>();
  return [...filas].sort((a, b) => a.especialidad_id.localeCompare(b.especialidad_id)
    || (rango.get(a.categoria_id ?? "") ?? 100) - (rango.get(b.categoria_id ?? "") ?? 100)
    || a.codigo.localeCompare(b.codigo) || a.id.localeCompare(b.id)).map((fila) => {
      const numero = (contadores.get(fila.especialidad_id) ?? 0) + 1;
      if (numero > 99) throw new Error("Una especialidad admite hasta 99 subcategorías.");
      contadores.set(fila.especialidad_id, numero);
      return { ...fila, codigo: String(numero).padStart(2, "0") };
    });
}
const alfabeto = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** Shared Spanish alphabetical order; category links always use their stable identifiers. */
export function ordenarCategorias<T extends { nombre: string }>(categorias: readonly T[]): T[] {
  return [...categorias].sort((a, b) => alfabeto.compare(a.nombre.trim(), b.nombre.trim()));
}

/** Preview only: persistence assigns consecutive codes atomically in the database. */
export function numerarCategorias<T extends { nombre: string; especialidad_id: string }>(categorias: readonly T[]): (T & { codigo: string; orden: number })[] {
  const contadores = new Map<string, number>();
  return ordenarCategorias(categorias).map((categoria) => {
    const orden = (contadores.get(categoria.especialidad_id) ?? 0) + 1;
    contadores.set(categoria.especialidad_id, orden);
    return { ...categoria, codigo: String(orden).padStart(2, "0"), orden };
  });
}
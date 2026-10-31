const alfabeto = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** Shared display order; category identifiers and codes remain unchanged. */
export function ordenarCategorias<T extends { nombre: string }>(categorias: readonly T[]): T[] {
  return [...categorias].sort((a, b) => alfabeto.compare(a.nombre.trim(), b.nombre.trim()));
}
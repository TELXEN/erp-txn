export type CategoriaInventario = "Equipo" | "Herramienta";
export function perteneceCatalogo(categoria: string | null | undefined, grupo: CategoriaInventario) {
  return categoria === grupo || (grupo === "Equipo" && !categoria);
}
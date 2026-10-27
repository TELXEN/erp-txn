/** En selectores, "central" representa el Almacén Central (proyecto_id null en la base). */
export const almacenDeValor = (v: string): string | null => (v === "central" || v === "" ? null : v);
export const valorDeAlmacen = (proyectoId: string | null) => proyectoId ?? "central";

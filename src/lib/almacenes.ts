/** En selectores, "central" representa el Almacén Central (proyecto_id null en la base). */
export const almacenDeValor = (v: string): string | null => (v === "central" || v === "" ? null : v);
export const valorDeAlmacen = (proyectoId: string | null) => proyectoId ?? "central";

/** Proyecto del almacén donde entrega una OC (null = Central). Sin destino elegido, es la obra de la orden. */
export const destinoOrden = (
  oc: { proyecto_id: string; almacen_destino_id?: string | null },
  almacenes: { id: string; proyecto_id: string | null }[],
): string | null => {
  if (!oc.almacen_destino_id) return oc.proyecto_id;
  const a = almacenes.find((x) => x.id === oc.almacen_destino_id);
  return a ? a.proyecto_id ?? null : oc.proyecto_id;
};

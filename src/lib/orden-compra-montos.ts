/** Desglose documental de compra: IGV únicamente sobre materiales, sin modificar costos guardados. */
export function montosOrdenCompra(items: { cantidad: number; precio_unitario: number; tipo: string }[]) {
  const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = redondear(items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0));
  const baseMateriales = redondear(items.filter((i) => i.tipo === "MAT").reduce((a, i) => a + i.cantidad * i.precio_unitario, 0));
  const igv = redondear(baseMateriales * 0.18);
  return { subtotal, igv, total: redondear(subtotal + igv), materiales: items.some((i) => i.tipo === "MAT") };
}
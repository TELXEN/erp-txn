/** Desglose documental de compra: IGV sobre bienes gravados (materiales y EPP), sin modificar costos guardados. */
export function montosOrdenCompra(items: { cantidad: number; precio_unitario: number; tipo: string }[]) {
  const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const gravado = (t: string) => t === "MAT" || t === "EPP";
  const subtotal = redondear(items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0));
  const baseMateriales = redondear(items.filter((i) => gravado(i.tipo)).reduce((a, i) => a + i.cantidad * i.precio_unitario, 0));
  const igv = redondear(baseMateriales * 0.18);
  return { subtotal, igv, total: redondear(subtotal + igv), materiales: items.some((i) => gravado(i.tipo)) };
}
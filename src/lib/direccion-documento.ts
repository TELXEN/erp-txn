/** Quita únicamente un sufijo geográfico conocido; conserva la calle y su numeración. */
export function direccionSinUbicacion(direccion: string, departamento: string, provincia: string, distrito: string) {
  let limpia = direccion.trim();
  const escapar = (v: string) => v.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const lugar of [departamento, provincia, distrito]) {
    if (!lugar.trim()) continue;
    const sufijo = new RegExp(`\\s*[-,]\\s*${escapar(lugar)}\\s*$`, "i");
    limpia = limpia.replace(sufijo, "").trim();
  }
  return limpia;
}
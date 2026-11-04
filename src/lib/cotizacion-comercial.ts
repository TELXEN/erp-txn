/** Importes y filas de cierre comunes a la hoja y las exportaciones. */
export function cierreCotizacion(costoDirecto: number, gastosGenerales: number, utilidad: number, conIgv: boolean) {
  const subtotal = Math.round((costoDirecto + gastosGenerales + utilidad) * 100) / 100;
  const igv = conIgv ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  return { subtotal, igv, total: Math.round((subtotal + igv) * 100) / 100, mostrarIgvTotal: conIgv };
}

export function snapshotEnvio(fecha: string, cambio: { fecha: string; venta: number } | null) {
  if (!cambio || cambio.fecha !== fecha || !(cambio.venta > 0)) {
    throw new Error("No se obtuvo el tipo de cambio Decolecta del día. Reintenta antes de enviar la cotización.");
  }
  return { estado: "Enviada" as const, fecha_envio: fecha, tipo_cambio_fecha: cambio.fecha, tipo_cambio: cambio.venta };
}
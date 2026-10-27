/** Flujo de requerimientos: obra → Gerencia → Bandeja de Requerimientos → OC → recepción en obra. */
export const ESTADOS_REQ = [
  "Borrador",
  "Enviado a Gerencia",
  "Aprobado",
  "Rechazado",
  "En cotización",
  "Orden emitida",
  "Recibido parcial",
  "Recibido",
] as const;

/** Estados que Logística ve en la Bandeja de Requerimientos (ya aprobados por Gerencia). */
export const ESTADOS_BANDEJA = ["Aprobado", "En cotización", "Orden emitida", "Recibido parcial", "Recibido"];

export type TonoEstado = "good" | "bad" | "warn" | "info" | "doc" | "neutro" | "apagado";

/** Color del estado: borrador apagado, en trámite ámbar, aprobado verde, orden emitida azul marino. */
export const tonoEstadoReq = (e: string): TonoEstado =>
  e === "Borrador" ? "apagado"
    : e === "Rechazado" || e === "Anulada" ? "bad"
    : e === "Enviado a Gerencia" || e === "Recibido parcial" || e === "Recibida parcial" ? "warn"
    : e === "Aprobado" || e === "Recibido" || e === "Recibida" ? "good"
    : e === "En cotización" || e === "Enviado a obra" ? "info"
    : e === "Orden emitida" || e === "Emitida" ? "doc"
    : "neutro";

/** Cantidad a pedir: nunca más que el saldo del APU ni negativa. */
export function cantidadPermitida(pedida: number, saldo: number): number {
  if (!Number.isFinite(pedida) || pedida <= 0) return 0;
  return Math.round(Math.min(pedida, Math.max(0, saldo)) * 10000) / 10000;
}

export type OfertaItem = { solicitudId: string; requerimientoItemId: string; precio: number };

/** Mejor precio (> 0) por ítem entre las cotizaciones registradas. */
export function mejoresPrecios(ofertas: OfertaItem[]): Map<string, string> {
  const mejor = new Map<string, { id: string; precio: number }>();
  for (const o of ofertas) {
    if (!(o.precio > 0)) continue;
    const act = mejor.get(o.requerimientoItemId);
    if (!act || o.precio < act.precio) mejor.set(o.requerimientoItemId, { id: o.solicitudId, precio: o.precio });
  }
  return new Map([...mejor].map(([k, v]) => [k, v.id]));
}

/** Estado del requerimiento tras aprobar una cotización: «Orden emitida» solo cuando todo quedó ordenado. */
export function estadoTrasOrden(items: { id: string; cantidad: number }[], ordenado: (id: string) => number): string {
  return items.every((i) => ordenado(i.id) >= Number(i.cantidad) - 0.0001) ? "Orden emitida" : "En cotización";
}

/** Saldo por recibir de un ítem de OC. */
export const saldoRecepcion = (ordenado: number, recibido: number) => Math.max(0, Math.round((ordenado - recibido) * 10000) / 10000);

/** Conserva la condición y el plazo juntos en el campo histórico de la orden. */
export function condicionPagoOrden(forma: string, dias: number): string {
  if (forma === "Contado") return "Contado";
  if (!Number.isInteger(dias) || dias <= 0) throw new Error("Indica el plazo de pago en días para el crédito.");
  return `Crédito ${dias} días`;
}

export function detallePagoOrden(condicion: string) {
  const credito = /cr[eé]dito/i.test(condicion);
  const dias = credito ? Number(condicion.match(/(\d+)\s*d[ií]as?/i)?.[1] ?? 0) : 0;
  return { forma: credito ? "Crédito" : /contado/i.test(condicion) ? "Contado" : condicion || "—", plazo: credito ? dias > 0 ? `${dias} días` : "No registrado" : "—" };
}
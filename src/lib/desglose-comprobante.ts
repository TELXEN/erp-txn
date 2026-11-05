/** Filas del desglose de la factura (editor, vista previa y PDF usan la misma lista). */
export type MontosDesglose = { operacionTipo: string; valorVenta: number; descuentos: number; anticipo: number; isc: number; icbper: number; igv: number; otrosCargos: number; total: number };
export type FilaDesglose = { etiqueta: string; valor: number; total?: boolean };

export function filasDesglose(m: MontosDesglose): FilaDesglose[] {
  const op = (t: string) => (m.operacionTipo === t ? m.valorVenta : 0);
  return [
    { etiqueta: "OP. GRAVADAS", valor: op("gravada") },
    { etiqueta: "OP. INAFECTAS", valor: op("inafecta") },
    { etiqueta: "OP. EXONERADAS", valor: op("exonerada") },
    { etiqueta: "OP. EXPORTACIÓN", valor: op("exportacion") },
    { etiqueta: "TOTAL OP. GRATUITAS", valor: 0 },
    { etiqueta: "DSCTOS. TOTALES", valor: m.descuentos },
    { etiqueta: "ANTICIPOS", valor: m.anticipo },
    { etiqueta: "SUB TOTAL", valor: m.valorVenta },
    { etiqueta: "ICBPER", valor: m.icbper },
    { etiqueta: "ISC", valor: m.isc },
    { etiqueta: "IGV", valor: m.igv },
    { etiqueta: "OTROS CARGOS", valor: m.otrosCargos },
    { etiqueta: "TOTAL", valor: m.total, total: true },
  ];
}

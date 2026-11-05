/**
 * Cuentas bancarias que se imprimen en los comprobantes (factura, boleta, notas).
 * Una sola cuenta por columna, en este orden: principal en soles, la de dólares
 * y la de detracciones. Los rótulos salen «BCP EN SOLES», «BCP EN DÓLARES» y,
 * en detracciones, el banco arriba y «CUENTA DE DETRACCIONES» debajo.
 */
export type CuentaCpe = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };

export type ColumnaCuenta = "SOLES" | "DÓLARES" | "DETRACCIONES";

export const esDetraccion = (c: CuentaCpe) => /detrac/i.test(c.tipo_cuenta) || /detrac/i.test(c.nombre);
export const esDolar = (c: CuentaCpe) => /USD|D[ÓO]LAR/i.test(c.monedas);
const esAuxiliar = (c: CuentaCpe) => /auxiliar|secundari/i.test(c.nombre);
const esPrincipal = (c: CuentaCpe) => /principal/i.test(c.nombre);

/** Columna de la hoja donde va la cuenta. */
export const columnaDe = (c: CuentaCpe): ColumnaCuenta => esDetraccion(c) ? "DETRACCIONES" : esDolar(c) ? "DÓLARES" : "SOLES";

/** Nombre del banco sin sufijos de moneda ni «(PRINCIPAL)»/«(AUXILIAR)»: «BCP-PEN(PRINCIPAL)» → «BCP». */
export const nombreBanco = (c: CuentaCpe) => (c.nombre || "")
  .replace(/\((PRINCIPAL|AUXILIAR|SECUNDARIA)\)/gi, "")
  .replace(/[\s-]*(PEN|USD|SOLES|D[ÓO]LARES)\b/gi, "")
  .replace(/[\s-]+$/g, "")
  .trim() || "SIN BANCO";

/** Rótulo en negrita de la columna: «BCP EN SOLES», «BCP EN DÓLARES» o el banco en detracciones. */
export const tituloCuenta = (c: CuentaCpe) => esDetraccion(c) ? nombreBanco(c) : `${nombreBanco(c)} EN ${columnaDe(c)}`;

/** Segunda línea, solo en la columna de detracciones. */
export const subtituloCuenta = (c: CuentaCpe) => (esDetraccion(c) ? "CUENTA DE DETRACCIONES" : "");

export const cuentaDetraccionDe = (cuentas: CuentaCpe[]) => cuentas.find(esDetraccion) ?? null;

/** Todas las cuentas; la de detracciones al final. */
export const ordenarCuentas = (cuentas: CuentaCpe[]) => [...cuentas.filter((c) => !esDetraccion(c)), ...cuentas.filter(esDetraccion)];

/** Una sola cuenta por columna: la principal en soles, la de dólares y la de detracciones. */
export const cuentasDelComprobante = (cuentas: CuentaCpe[]): CuentaCpe[] => {
  const elegir = (columna: ColumnaCuenta) => {
    const pool = cuentas.filter((c) => columnaDe(c) === columna);
    return pool.find(esPrincipal) ?? pool.find((c) => !esAuxiliar(c)) ?? pool[0] ?? null;
  };
  return (["SOLES", "DÓLARES", "DETRACCIONES"] as const)
    .map((columna) => elegir(columna))
    .filter((c): c is CuentaCpe => Boolean(c));
};

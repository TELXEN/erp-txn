# Porcentaje de detracción y retención desplegable

En el editor de factura:

1. **En la hoja**, en el bloque bajo Observaciones, el porcentaje pasa a ser una lista desplegable:
   - Detracción: 1.5 %, 4 %, 10 %, 12 % (tasas SUNAT vigentes). Al cambiarlo se recalcula el importe de la detracción y el monto neto.
   - Retención: 3 % (régimen general) y 6 % (tasa anterior). Igual recalcula.
   - Se ve como texto «Detracción (4.00%)» y solo muestra la flecha al pasar el cursor, como los demás campos de la hoja.
2. **En la franja de arriba**, «Régimen» queda solo con el tipo: No aplica / Detracción / Retención. Al elegir Detracción arranca en 4 % (construcción, código 030); al elegir Retención, en 3 %.
3. Vista previa, impresión y PDF no cambian: siguen mostrando el porcentaje elegido.

## Detalle técnico
- Nueva constante `TASAS_DETRACCION` en src/lib/facturacion.ts junto a `TASAS_RETENCION`.
- HojaComprobante.tsx: select de Régimen solo con tipo; select de porcentaje dentro del bloque usando `edSel`, que actualiza `pct_detraccion` (y `codigo_spot` a 030 cuando es 4 %, si el usuario no lo cambió).
- Prueba pequeña: valores por defecto al cambiar de tipo (detracción 4 %, retención 3 %).

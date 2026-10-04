# Cotizaciones en soles y dólares

## Resultado
Cada cotización podrá emitirse en **Soles (PEN)** o **Dólares (USD)**, igual que ya lo hacen las preliquidaciones. La moneda se elige en la propia hoja de la cotización y se refleja en edición, vista previa, PDF y Excel.

## Cambios

1. **Selector de moneda en la hoja de edición** (`HojaCotizacion.tsx`)
   - Reemplazar el texto fijo «Soles (PEN)» por un selector: Soles (PEN) / Dólares (USD).
   - Al elegir USD, mostrar un campo editable de **tipo de cambio** (precargado con el último tipo de cambio venta registrado en el sistema, editable).
   - Guardar `moneda` y `tipo_cambio` en la cotización (las columnas ya existen en la base de datos).

2. **Símbolo de moneda en todos los montos**
   - La hoja editable usa `US$` cuando la cotización es en dólares y `S/` en soles (partidas, subtotales, IGV, importe total).
   - En USD, mostrar además una línea informativa con el **equivalente en soles** del importe total (total × tipo de cambio), solo como referencia.

3. **Vista previa e impresión** (`cotizacion-vista.tsx`)
   - Reemplazar el `S/` fijo por el símbolo según la moneda de la cotización.
   - Mostrar la moneda y el tipo de cambio en el bloque de datos (Emisión / Moneda / T. cambio), igual que en el comprobante electrónico.

4. **Exportaciones**
   - PDF y Excel de la cotización llevan el símbolo correcto y la línea de tipo de cambio cuando sea USD.

5. **Listado de cotizaciones** (`cotizaciones.tsx`)
   - La columna de importe muestra el símbolo según la moneda de cada cotización.

## Detalles técnicos
- No requiere migración: `cotizaciones.moneda` (PEN/USD) y `cotizaciones.tipo_cambio` ya existen.
- El tipo de cambio se precarga desde `tipo_cambio_diario` (último valor `venta`), con respaldo manual si no hay registro del día.
- Los cálculos (costo directo, GG, utilidad, IGV) no cambian: se hacen en la moneda de la cotización; la conversión a soles es solo informativa.
- Se mantiene la paleta y letra compartidas (documento-tema) sin cambios visuales adicionales.

## Verificación
- Crear/editar una cotización en USD: símbolo US$ en hoja, vista previa y PDF; equivalente en soles visible.
- Cambiar de USD a PEN y confirmar que todo vuelve a S/.
- Confirmar que el Excel respeta la moneda y que el listado muestra símbolos mixtos correctamente.

# Factura: tabla gris, recuadro de datos y desglose en píldoras

Aplica igual en el editor, la vista previa/impresión y el PDF descargado.

## 1. Encabezado de la tabla en gris
- Fondo del encabezado de la tabla de ítems: gris **#A9A9A9** (el código enviado, #A9A9A, tiene 5 dígitos; se usa #A9A9A9). Texto blanco.

## 2. Quitar la columna «#»
- Se elimina la columna de numeración; el ancho liberado pasa a la columna de descripción.

## 3. «IMPORTE TOTAL» pasa a «V. VENTA»

## 4. Recuadro de datos (imagen 1)
- Nuevo rectángulo de borde redondeado y borde gris #A9A9A9, a todo el ancho, entre la banda del cliente y la tabla.
- Cinco celdas separadas por líneas verticales grises, título en negrita arriba y valor debajo, centrados:
  Fecha de Emisión | Forma de Pago | Orden de Compra | Fecha de Vencimiento | N° Guía de Remisión.
- Fechas en día/mes/año (regla existente). Forma de pago = condición elegida (Contado/Crédito).
- Esos cinco datos se retiran del encabezado/banda donde se mostraban hoy, para no repetirlos. En el editor siguen siendo editables, ahora dentro de este recuadro.

## 5. Desglose como la imagen 2
- Cada fila: a la izquierda una píldora gris #A9A9A9 con el rótulo en blanco centrado; a la derecha una casilla redondeada con borde gris y el importe alineado a la derecha (S/ o $).
- Filas en este orden: OP. GRAVADAS, OP. INAFECTAS, OP. EXONERADAS, OP. EXPORTACIÓN, TOTAL OP. GRATUITAS, DSCTOS. TOTALES, ANTICIPOS, SUB TOTAL, ICBPER, ISC, IGV, OTROS CARGOS y TOTAL.
- TOTAL resaltado: píldora en el color de acento del documento y casilla con borde y texto del mismo color (en la imagen, celeste).
- Valores sin dato muestran 0.00. Detracción/retención y Neto a pagar se mantienen debajo del TOTAL con el mismo estilo de píldora.
- Observaciones sigue a la izquierda del desglose.

## 6. Bloque de detracción (imagen 3)
- Solo cuando la factura tiene detracción: bloque de dos columnas (rótulo en negrita a la izquierda, valor a la derecha), texto gris oscuro, sin recuadro:
  - Cta. Cte. Banco de la Nación — número de la cuenta de detracciones exactamente como está en el registro de la empresa (con o sin guiones, sin reformatear).
  - Detracción (X%) — importe en soles (ej. S/ 1,120.00).
  - Bien o Servicio — elegido por el usuario en el editor desde una lista desplegable con los códigos SUNAT de detracción (ej. 030 - Contratos de construcción, 037 - Demás servicios gravados con el IGV, 022 - Otros servicios empresariales, etc.); se guarda con la factura y se imprime tal cual.
  - (línea en blanco)
  - Neto a Pagar — total menos detracción.
- Va debajo de Observaciones, a la izquierda del desglose. Con retención se usa el mismo formato (Retención (3%)) sin la fila de cuenta ni bien/servicio.
- El Neto a pagar ya no se repite en el desglose cuando aparece en este bloque.

## Detalles técnicos
- Archivos: `HojaComprobante.tsx` (editor), `comprobante-vista.tsx` (vista/impresión), `ComprobantePdf.tsx` (PDF). Color gris como constante compartida en `documento-tema.ts`.
- Importes del desglose desde los totales ya calculados (sin cambiar cálculo); categorías no manejadas hoy (inafectas, exoneradas, exportación, gratuitas, ICBPER, ISC, otros cargos) salen en 0.00.
- Guardar regla en memoria (tabla gris, recuadro de datos, desglose en píldoras) y verificar con Playwright + PDF.

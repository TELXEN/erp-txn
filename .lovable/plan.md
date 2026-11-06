# Preliquidaciones con el formato de las facturas

La preliquidación (editor, vista previa, impresión y PDF) se verá igual que la factura, con los mismos datos que ya tiene.

## Qué cambia
- **Encabezado:** logo 1.2× centrado verticalmente, bloque de empresa a la izquierda con eslogan en una línea, dirección y web, sin línea horizontal; recuadro redondeado a la derecha con RUC, «PRELIQUIDACIÓN» y número (mismo tamaño, separación y borde negro, sin fondo), todo en MAYÚSCULAS e interlineado 1.15.
- **Datos del cliente:** rectángulo redondeado con borde gris, sin fondo, etiquetas alineadas con los dos puntos en la misma vertical; Departamento/Provincia/Distrito en una fila.
- **Recuadro gris de datos** (fecha de emisión, forma de pago, orden de compra, vencimiento) como en la factura.
- **Tabla:** encabezado gris #A9A9A9, **sin columna #**, misma letra y tamaño; descripción que crece en varias líneas al editar.
- **Desglose:** píldoras gris claro con casilla de borde y TOTAL en color corporativo; observaciones y detracción a la izquierda alineadas con TOTAL.
- **Información del pago / del crédito** igual que en la factura.
- **Datos bancarios:** tres columnas (Soles, Dólares, Cuenta de detracciones) con CTA: y CCI:.
- **Tipografía:** la fuente elegida para documentos, mismos tamaños que la factura.
- **Modo edición:** pantalla completa; la hoja ocupa todo el ancho de la ventana (ampliada en proporción), campos integrados con subrayado tenue; controles que no se imprimen en una franja encima de la hoja.
- **Vista preliminar:** hoja en tamaño A4 real (sin ampliar); botón «Imprimir» con impresora a la derecha de «Descargar PDF», imprime solo la hoja A4.

Los montos, la numeración y el guardado no cambian.

## Detalles técnicos
- Archivos: `HojaPreliquidacion.tsx`, `preliquidacion-vista.tsx`, `PreliquidacionPdf.tsx`, `Preliquidaciones.tsx` (contenedor del editor), `styles.css` (raíz de impresión reutilizable).
- Reutilizar `documento-tema.ts`, `CuentasComprobante`, `cuentas-comprobante.ts`, `filasDesglose`/`desglose-comprobante.ts` donde los montos coincidan (manteniendo `preliquidacion-montos.ts` como fuente de cifras), `TextoAjustado`, el patrón de zoom con ResizeObserver y `imprimir()` clonando la hoja.
- Verificar con Playwright editor y vista previa contra una factura, y revisar el PDF.

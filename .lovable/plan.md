# Pie fijo en todas las páginas del comprobante

## Objetivo
Mantener el pie de página pegado al borde inferior de cada hoja A4, independientemente de cuántas filas tenga la factura, tanto en la vista previa como en el PDF descargado.

## Cambios
- Reservar una franja inferior fija para que las filas, totales y demás contenido nunca invadan el pie.
- Convertir la vista previa en páginas A4 reales cuando la tabla exceda una hoja, distribuyendo las filas según el espacio disponible.
- Repetir en cada página el pie con la identificación del comprobante y la numeración `Página X de Y`.
- Mantener los totales, importe en letras, forma de pago, régimen tributario, cuentas y observaciones juntos al final del documento; si no caben, pasarán completos a la página siguiente.
- Ajustar el PDF para usar la misma reserva inferior y el mismo pie fijo repetido en todas las páginas.
- Mantener sin cambios los cálculos, datos, numeración fiscal, tipografía seleccionada y estilo visual actual.

## Validación
- Probar comprobantes de una página y de varias páginas con distintas cantidades de filas.
- Confirmar visualmente que el pie permanece alineado al fondo, no se superpone y aparece en todas las hojas.
- Descargar el PDF de varias páginas, convertir sus páginas a imagen e inspeccionar encabezados, cortes de filas, totales y pies.

# Cotización PDF multipágina

## Resultado
- Dividir automáticamente las partidas en hojas A4 cuando no entren en una sola.
- Repetir en cada hoja el encabezado de empresa, logotipo, número de cotización y cabecera de la tabla.
- Mostrar en cada hoja la numeración `Hoja X de Y`.
- Mantener cliente y datos comerciales al inicio; dejar totales y términos en la última hoja.

## Implementación
- Preparar páginas independientes dentro del mismo contenedor exportable, con saltos de página controlados para html2pdf.js.
- Distribuir las partidas según el espacio disponible, evitando cortar una fila entre hojas.
- Conservar el diseño y los cálculos actuales; no modificar el Excel ni los datos de la cotización.
- Verificar una cotización larga en pantalla y validar que el PDF tenga encabezados repetidos y numeración correcta.

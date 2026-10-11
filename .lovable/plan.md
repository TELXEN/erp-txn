# Optimizar la paginación horizontal de cotizaciones

## Objetivo
Aprovechar el alto disponible de cada hoja A4 horizontal antes de pasar partidas a la página siguiente, sin cortar filas ni el bloque final de totales y condiciones.

## Cambios
1. Ajustar el cálculo de capacidad horizontal, que actualmente reserva en la primera hoja un espacio fijo excesivo para el bloque final.
2. Medir el espacio realmente ocupado por encabezado, datos del cliente, tabla y cierre para redistribuir filas cuando todavía caben en la hoja.
3. Mantener juntos los títulos de grupo con al menos una partida y conservar el bloque de totales y condiciones sin cortes.
4. Aplicar el mismo reparto a la vista previa, impresión y PDF, respetando la orientación guardada.

## Verificación
- Probar la cotización mostrada en formato horizontal y confirmar que las partidas ocupan la primera hoja hasta el límite útil.
- Confirmar que ninguna fila, total o condición queda cortada.
- Comparar también el formato vertical para evitar una regresión.

## Detalle técnico
Se reemplazará la reserva horizontal rígida por una paginación basada en la altura efectiva del contenido renderizado, con un margen de seguridad mínimo y una segunda hoja solo cuando el contenido realmente no quepa.

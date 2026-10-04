# Ajuste de la hoja de cotización

## Resultado esperado
La cotización aprovechará mejor el ancho imprimible, dará prioridad a la descripción y tendrá bloques más compactos, manteniendo iguales la edición, la vista previa y el PDF.

## Cambios
1. **Proyecto**
   - Quitar el fondo azul del bloque.
   - Mantenerlo claramente identificado con fondo blanco, borde corporativo sutil y texto oscuro.
   - Reducir su altura y alinear verticalmente la etiqueta y el nombre del proyecto.

2. **Encabezado de partidas**
   - Reducir la altura del rectángulo que contiene Ítem, Descripción, Marca, Unidad, Cantidad, C. Unitario y Sub Total.
   - Centrar verticalmente todos los títulos; mantener Descripción alineada a la izquierda y los campos numéricos alineados a la derecha.
   - Ajustar el tamaño y el espaciado interno para que ningún título se corte.

3. **Ancho de la tabla y descripción**
   - Disminuir los márgenes laterales de impresión para ampliar el área útil de la hoja.
   - Dar a Descripción el mayor ancho disponible.
   - Reducir al mínimo funcional Ítem, Marca, Unidad y Cantidad; conservar suficiente espacio para C. Unitario y Sub Total sin partir los importes.
   - Recalibrar el cálculo de altura de filas y la paginación según el nuevo ancho, evitando cortes entre páginas.

4. **TOTAL**
   - Reducir la altura de la franja TOTAL mediante menor relleno vertical y una alineación vertical precisa.
   - Conservar su jerarquía visual, color corporativo y alineación a la derecha.

5. **Consistencia y validación**
   - Aplicar los mismos criterios en la hoja editable, la vista previa y el PDF descargado.
   - Verificar una cotización real con descripciones largas, importes en soles y dólares, y más de una página.
   - Confirmar que no haya textos recortados, saltos incorrectos ni diferencias visibles entre vista previa y PDF.

## Detalles técnicos
- Se mantendrá el tema documental compartido y la tipografía actual.
- No se modificarán datos, cálculos, moneda, Excel ni lógica comercial.

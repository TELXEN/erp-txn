# Mejorar el bloque de datos de la cotización

## Objetivo
Reorganizar visualmente todo el grupo de **Cliente**, **Trabajo a cotizar** y **Configuración** para que sea más claro, cómodo de editar y fácil de revisar, siguiendo la dirección ejecutiva seleccionada.

## Cambios
1. **Estructura en tres zonas**
   - Mantener Cliente, Trabajo a cotizar y Configuración en tres columnas claramente separadas.
   - Añadir un título visible a Configuración, que actualmente no lo tiene.
   - Reforzar la jerarquía de cada zona con una franja lateral y fondos sutiles, conservando el estilo documental TELXEN.

2. **Campos más fáciles de identificar y editar**
   - Mostrar etiquetas encima de los valores en Cliente y Trabajo a cotizar.
   - Sustituir «Registrado» por «RUC»: el selector mostrará el RUC junto con la razón social y, al elegirlo, seguirá completando el cliente como actualmente.
   - Dar a campos editables, listas y fecha una apariencia consistente y un estado de enfoque claro.
   - Destacar la descripción del trabajo y la razón social sin aumentar innecesariamente la altura del bloque.
   - Presentar Validez y Vigente hasta juntos para relacionar ambos datos visualmente.

3. **Configuración compacta y ordenada**
   - Alinear Emisión, Tipo, Moneda y Tipo de cambio en filas regulares.
   - Agrupar Orientación e IGV como controles compactos al final de la columna.
   - Mantener las confirmaciones y conversiones actuales al cambiar tipo o moneda.

4. **Adaptación al espacio disponible**
   - Conservar el diseño de tres columnas en escritorio.
   - Reorganizar las zonas en una sola columna cuando el ancho sea reducido, sin cortes ni superposiciones.

## Alcance técnico
- El cambio se limitará a la presentación del bloque dentro de la hoja editable de cotización.
- Se conservarán exactamente los campos, valores, guardado automático, cálculos y comportamiento existentes.
- No se añadirán los botones ni textos de ejemplo del prototipo; tampoco se modificarán el encabezado, las partidas, los totales, la impresión ni el PDF.
- Se usarán los colores y tipografía configurados para los documentos TELXEN.

## Verificación
- Comprobar visualmente el bloque completo en escritorio y en ancho reducido.
- Verificar selección del cliente mediante RUC, autocompletado de razón social, edición de texto, fecha, moneda, tipo de cambio, orientación e IGV.
- Confirmar que el cambio de moneda sigue recalculando los precios y que no aparecen errores de compilación o ejecución.

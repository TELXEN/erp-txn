# Subfamilias de Eléctrica (05) según la estructura maestra

## Qué cambia
1. La pestaña y el título del Catálogo Técnico pasan de «Subfamilias de insumos» a **«Subfamilia de materiales»**.
2. Eléctrica (05) queda con las 9 bloques y los 59 números del documento, del 01 al 91. Los números de reserva no se crean.

## Cómo se aplica (sin perder nada)
- Las 28 subfamilias que ya existen **se mantienen** (son los mismos registros). Solo cambian de número cuando el documento les da otro, por ejemplo Bandejas Portacables 10 → 20, Luminarias Industriales 30 → 50 y SPAT 40 → 60.
- Las que faltan se agregan: Celdas MT, Accesorios MT, Canalizaciones PVC, Elementos de peinado, VFD/UPS ya existentes se reubican, Automatización/SCADA, Soportes de iluminación, Soldadura exotérmica, Aditivos de terreno, Energías renovables, Antiexplosión y Misceláneos.
- Hoy ningún insumo usa estas subfamilias, así que ningún código de insumo cambia.
- Cada subfamilia queda con su bloque (1 a 9). El nombre se guarda sin el texto entre paréntesis y la explicación se muestra como comentario en el desplegable.

## Detalle técnico
- Migración: agregar a `subfamilias_insumo` la columna opcional `descripcion text`. Además, reubicar las existentes por nombre con un número temporal para evitar choques de unicidad, poner `codigo` y `bloque` finales e insertar las faltantes. Todo se aplica en un solo paso.
- `HojaSubfamilias` y los selectores muestran la `descripcion` como comentario. En `catalogo-tecnico.tsx` y `HojaSubfamilias.tsx` se cambia el texto de la pestaña y del título.
- Comprobación: consultar la lista final de Eléctrica (59 filas, sin repetidos) y revisarla en pantalla.

# Plan: Ajustar columnas de la tabla Mano de obra (APU)

## Objetivo
Simplificar la tabla de mano de obra del Maestro de insumos: quitar la columna Categoría y renombrar los costos para que "Costo HH" sea el valor que realmente usa el APU (costo base + margen).

## Cambios

### 1. Quitar la columna "Categoría"
- Se elimina la columna Categoría de la tabla (encabezado, filas de datos, fila fantasma y fila de edición).
- La categoría de obrero sigue siendo necesaria para el cálculo cuando el régimen es Construcción Civil (define el jornal). Se mantiene como selector, pero solo aparece en la fila fantasma y en la fila en edición cuando el régimen elegido es "Construcción Civil" — integrado junto al campo de sueldo/jornal, sin columna propia.
- El dato `categoria_obrero` se sigue guardando en la base de datos (sin cambios de estructura).

### 2. Renombrar columnas de costo
- La columna hoy llamada "Costo HH" (costo calculado sin margen) pasa a llamarse **"Costo Base"**.
- La columna hoy llamada "P. Venta" (costo base + margen %) pasa a llamarse **"Costo HH"**, porque es el valor que se usa en los análisis de precios unitarios.
- Se actualizan los textos de ayuda: el desglose plegable pasa a "Cómo se calcula el Costo Base" y la nota al pie explica que el Costo HH = Costo Base + margen.

## Archivos afectados
- `src/components/Insumos.tsx` — único archivo: encabezados de la tabla, fila fantasma, fila de edición, filas de datos y textos de ayuda de la pestaña Mano de obra.

## Verificación
- Typecheck y build limpios.
- Verificación en el navegador: la tabla muestra Código, Descripción, Régimen, Sueldo/Jornal, Und, Costo Base, Margen %, Costo HH; al elegir régimen Construcción Civil aparece el selector de categoría en la fila de entrada.

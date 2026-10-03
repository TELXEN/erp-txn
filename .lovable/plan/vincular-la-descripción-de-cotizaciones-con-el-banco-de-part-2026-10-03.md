# Vincular la descripción de cotizaciones con el banco de partidas maestras

## Objetivo
Al escribir la descripción de una partida en la cotización, el texto se autocompleta desde el banco de partidas maestras; al elegir una coincidencia se rellenan automáticamente código, marca, unidad y precio unitario.

## Estado actual (verificado)
- La hoja WYSIWYG (`src/components/CotizacionHoja.tsx`) tiene una fila punteada por grupo con un campo de texto libre y, aparte, un selector «o elige del catálogo maestro…» (`FilaFantasma`, líneas 923-1000).
- Editar la descripción de una partida existente es texto libre (`guardar`, línea 250) sin vínculo con el banco.
- El panel «Insertar partida desde el catálogo maestro» (`cotizaciones.tsx`, líneas 497-568) tiene un selector de partida separado del campo Descripción.

## Cambios

1. **Autocompletado en la descripción (fila de captura)**
   - Al escribir en el campo «+ Escribe aquí para añadir una partida…» se muestra una lista desplegable con las partidas maestras activas que coinciden (por nombre o código), de todas las especialidades, ordenadas por relevancia.
   - Elegir una (clic o flechas + Enter) crea la partida con su nombre, código sugerido, marca, unidad y P.U. del banco — igual que hoy hace el selector lateral.
   - Si no se elige ninguna, Enter crea la partida libre con el texto escrito (comportamiento actual).
   - El selector lateral «o elige del catálogo maestro…» se retira: queda un solo punto de entrada.

2. **Autocompletado al editar la descripción de una partida existente**
   - Al editar la celda Descripción de una partida, el mismo desplegable ofrece coincidencias del banco; elegir una actualiza nombre, marca, unidad y P.U. de esa fila.
   - Escribir un texto sin elegir mantiene el comportamiento libre actual.

3. **Panel «Catálogo maestro» (modo formulario)**
   - El campo Descripción del formulario ofrece el mismo autocompletado; elegir una partida maestra rellena especialidad, categoría, código, unidad y P.U. (equivale al selector «Partida del catálogo», que se mantiene como alternativa).

## Detalles técnicos
- Componente reutilizable de autocompletado (input + lista con navegación por teclado, cierre con Escape/clic fuera) en `src/components/CotizacionHoja.tsx`; datos desde `usePartidasMaestras()` ya cargado.
- Sin cambios de base de datos ni de PDF/Excel: solo se rellenan los mismos campos que hoy.
- Búsqueda insensible a mayúsculas y tildes; muestra código, nombre, unidad y P.U. en cada sugerencia.

## Verificación
- Compilación y tipos limpios.
- Playwright: escribir en la fila de captura muestra sugerencias, elegir una crea la partida con datos del banco; editar la descripción de una partida existente y elegir sugerencia actualiza la fila.

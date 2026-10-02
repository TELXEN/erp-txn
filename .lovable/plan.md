# Banco de partidas maestras: captura siempre visible y tablas grandes

## Problema
- La fila de captura está al pie de la tabla: con muchas partidas hay que desplazarse hasta el final para ingresar una nueva.
- Con 1000+ partidas la tabla renderiza todas las filas de golpe, lo que hace lenta la página y difícil navegar.

## Cambios (solo `src/components/PartidasMaestras.tsx`)

### 1. Captura en la parte superior, siempre visible
- Mover la fila de captura WYSIWYG (descripción, tipo, especialidad, categoría, marca, unidad, P.U.) a la **primera fila del tbody**, justo debajo del encabezado.
- Hacer **sticky** el encabezado y la fila de captura (la fila de captura fija debajo del encabezado), de modo que al desplazarse por miles de filas la entrada de datos siga a la vista en todo momento.
- Tras guardar, la nueva partida se recoloca por código (orden natural). Para que el usuario la encuentre: se hace scroll automático hasta la fila recién creada y se la resalta unos segundos (fondo temporal).

### 2. Manejo de listas grandes (1000+ partidas)
- **Paginación por bloques**: la tabla muestra de a 100 partidas con controles "Anterior / Siguiente" e indicador "Mostrando 1–100 de 1.240", en la cabecera del panel junto al buscador.
- La búsqueda filtra sobre todo el banco (ya ocurre así) y al buscar se reinicia a la página 1.
- Las flechas de orden siguen funcionando: se calculan dentro del grupo completo, no solo de la página visible.
- Cambiar de página conserva el filtro y la selección de edición activa (al editar, la fila editada se mantiene visible).

### 3. Ajustes menores
- El texto de ayuda bajo la tabla pasa a decir "captura en la fila superior".
- El estado vacío dice "Captura la primera en la fila superior".

## Verificación
- Typecheck limpio.
- Playwright en `/datos-apu` → Registro de partidas: la fila de captura aparece arriba del listado, permanece visible al hacer scroll, crear una partida de prueba la recoloca con resaltado, la paginación navega correctamente y al final se elimina la fila de prueba.

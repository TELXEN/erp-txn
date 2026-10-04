# Panel colapsable para el formulario «Nuevo proyecto»

## Objetivo
Liberar el espacio que el formulario de nuevo proyecto ocupa sobre el listado: la pantalla de Proyectos abre mostrando directamente el listado/kanban, y el formulario se despliega solo cuando el usuario lo pide.

## Alcance
Solo `src/routes/_authenticated/proyectos.tsx`. El listado, el kanban, la edición en línea de la tabla y toda la lógica de guardado no cambian.

## Diseño
1. Estado nuevo `formAbierto` (default `false`): el panel nace cerrado.
2. El `Panel titulo="Nuevo proyecto"` se reemplaza por una cabecera compacta de una fila, misma altura que una cabecera de panel:
   - Título «Nuevo proyecto» a la izquierda (con el icono actual del panel).
   - A la derecha, botón «+ Nuevo proyecto» / «Cerrar» (chevron abajo/arriba) que alterna el estado.
   - La fila usa los tokens existentes (border-line, bg-card, text-ink); sin colores fuera del tema.
3. El contenido del formulario (las tres secciones en grid + botón Registrar) se muestra solo cuando `formAbierto` es true; se conserva intacto el layout actual en tres columnas.
4. Comportamiento:
   - Al guardar con éxito, el panel se cierra automáticamente y el listado muestra el proyecto nuevo.
   - El mensaje de error (`setError`) se muestra dentro del panel; si hay error, el panel permanece abierto.
   - Al abrir el panel, el cursor se sitúa en «Nombre de la obra» (autoFocus).
   - El botón de previsualización de código solo se muestra con el panel abierto (ya depende de `codificacion`).
5. La vista Kanban/Tabla del listado sube a su posición natural; no se altera nada más de la página.

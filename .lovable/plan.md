# Parámetros de proyectos: una sola barra de iconos a la derecha

## Qué cambia
En Inicio → Parámetros Generales → Parámetros de proyectos (Estado del proyecto, Prioridad y Tipos de presupuesto):

- Se quitan los botones de editar y eliminar de cada fila, y también el botón + de cada grupo.
- A la derecha de la ventana aparece **una sola columna de iconos**, igual a la de Codificación de documentos: Agregar, Editar y, separado abajo, Eliminar.
- Para usarla, haces clic en una fila de cualquiera de los tres grupos. La fila elegida se resalta y la columna actúa sobre ella:
  - **Editar** convierte el nombre en un campo (Enter guarda, Esc cancela).
  - **Eliminar** pide confirmación, igual que hoy.
  - **Agregar** añade un registro al grupo de la fila elegida. Si no hay ninguna fila elegida, añade al grupo que tenga el foco y, si no hay ninguno, el botón queda desactivado.
- Editar y Eliminar quedan apagados mientras no haya una fila elegida. Eliminar también queda apagado en los registros protegidos, por ejemplo "Contrato original".
- Los tres grupos siguen en tres columnas, cada uno con su descripción.
- Los permisos no cambian: solo administrador y gerente ven activos los iconos.

## Detalle técnico
- En `datos.tsx`, `ConfiguracionProyectos` guarda la selección `{ grupo, id }` y muestra `BarraIconosHoja` a la derecha (`flex items-start gap-3`).
- `ListaEditable` y `EstadosProyecto` se convierten en listas controladas que reciben `seleccion`, `onSeleccionar`, `editando` y `agregando` desde el padre, y dejan de dibujar sus propios botones de fila y de cabecera.
- La lógica para agregar, renombrar y eliminar se mantiene. Cada grupo expone sus acciones al padre a través de una ref o de callbacks.
- Para la fila seleccionada se usa el mismo estilo que en Codificación de documentos (`bg-primary/10`).

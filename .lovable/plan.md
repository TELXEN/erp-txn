# Ordenamiento por selección con un único par de flechas

## Experiencia de uso
- En **Especialidades de partidas**, la fila se selecciona con un clic y queda resaltada.
- En **Categorías de partidas**, la fila se selecciona con un clic y queda resaltada; el filtro de especialidad permite trabajar solo con las categorías del grupo elegido.
- Cada listado tendrá únicamente dos botones en su cabecera: **Subir** y **Bajar**, similares al organizador de páginas de Foxit.
- Las flechas actúan sobre la fila seleccionada y quedan deshabilitadas cuando no hay selección, durante el movimiento o cuando el registro ya está en el primer/último lugar permitido.
- Se retirarán las flechas repetidas de cada fila para dejar una tabla más limpia.

## Reglas de orden
- Una especialidad puede subir o bajar entre todas las especialidades.
- Una categoría solo puede subir o bajar dentro de su especialidad; nunca se mezcla automáticamente con otra.
- Después de cada movimiento se conserva seleccionada la misma fila en su nueva posición.
- El movimiento recalcula automáticamente los códigos dependientes, manteniendo el formato definido: dígito de partida + orden de especialidad + orden de categoría + correlativo.
- La selección no cambia las reglas para editar, crear o eliminar registros.

## Detalles técnicos
- Reutilizar la operación segura de movimiento ya existente; el cambio se concentra en el control visual y el estado de selección de ambos listados.
- Sustituir los controles por fila por una barra de ordenamiento con dos botones de icono y textos de ayuda al pasar el cursor.
- Mantener la restricción actual: solo Gerente y Administrador pueden ejecutar el reordenamiento.

## Verificación
- Seleccionar una especialidad, subirla y bajarla; comprobar resaltado, posición y recodificación.
- Filtrar una especialidad, seleccionar una categoría y moverla sin salir de ese grupo.
- Comprobar los estados deshabilitados sin selección y en los extremos de cada lista.

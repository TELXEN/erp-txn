# Borrado independiente y menú de clic derecho en la hoja de cotización

## Qué cambia para el usuario
1. **Si borras una partida, su categoría y su especialidad se quedan.** Esto aplica también cuando era la última. El grupo sigue visible, vacío, con su fila punteada para agregar partidas. Ya no aparece la fila "Nueva partida" de relleno.
2. **Menú al hacer clic derecho** sobre cualquier fila de la hoja:
   - **Especialidad (capítulo):** "Agregar categoría", "Agregar partida" y "Borrar especialidad". Borrarla quita también sus categorías y partidas, después de pedirte confirmación con la cantidad de partidas afectadas.
   - **Categoría:** "Agregar partida" y "Borrar categoría". Borrarla quita sus partidas, con confirmación. La especialidad se queda.
   - **Partida:** "Insertar partida debajo", "Ver APU" y "Borrar partida". Si la partida tiene subpartidas, se borran con ella.
   - El menú se abre en la fila que tienes bajo el cursor y la marca. Se cierra con Esc o al hacer clic fuera. No sale en la impresión.
3. Se retiran las filas "Nueva partida" vacías que quedaron de la corrección anterior. El grupo que las contenía se mantiene, ahora vacío.

## Detalles técnicos
- Hoy la hoja dibuja capítulos y categorías a partir de las partidas. Para que un grupo exista sin partidas, se guardará una **fila marcadora** en la tabla de ítems de cotización, con una columna nueva `tipo` (`partida` por defecto, `grupo` para la marcadora). Una marcadora con categoría vacía representa la especialidad; con categoría, representa esa categoría.
- La hoja ignorará las marcadoras al dibujar y al calcular totales, pero las usará para mostrar grupos vacíos. Las marcadoras tampoco saldrán en /cotizacion-vista, el PDF, el Excel, la conversión a obra ni en los conteos del listado. Todas esas consultas filtrarán `tipo = 'partida'`.
- La columna se agrega con una migración (`tipo text not null default 'partida'`, con un check). Se crean marcadoras para los grupos que ya existen y se convierten a marcadora las filas "Nueva partida" vacías con precio 0 que sean las únicas de su grupo.
- Crear una especialidad o categoría crea su marcadora. Renombrar un capítulo o una categoría actualiza también las marcadoras.
- Borrar una partida solo elimina esa fila y sus hijas. Borrar un grupo elimina las filas que coinciden por especialidad o categoría, incluidas las marcadoras.
- El menú de clic derecho usa el ContextMenu de shadcn (Radix) sobre cada fila de CotizacionHoja, con íconos de lucide.
- Se verificará en el navegador: borrar la última partida conserva el grupo; el clic derecho borra una especialidad, una categoría y una partida; las marcadoras no aparecen en la vista impresa.

# Partidas y Avance físico: recordar cómo los dejó el usuario

Las dos páginas se mantienen igual. Al volver a abrirlas, se restaura lo último que el usuario tenía.

## Partidas

- Proyecto elegido (ya se recuerda hoy), filtros de Especialidad y Tipo, búsqueda.
- Vista Tabla o Kanban.
- Proyectos y especialidades colapsados o abiertos.
- Posición de desplazamiento de la tabla.

## Avance físico

- Proyecto elegido (ya se recuerda hoy), filtro de Especialidad, búsqueda.
- Orden de la tabla (WBS u otro).
- Vista Avance real o Cronograma.
- Grupos plegados o abiertos.
- Posición de desplazamiento.
- Los porcentajes escritos y no guardados no se recuerdan (se evita guardar datos a medias).

Si un proyecto o especialidad guardado ya no existe, se ignora y se muestra todo.

## Detalles técnicos

- partidas.tsx y avance.tsx: guardar estos estados en localStorage con claves `partidas:*` / `avance:*` incluyendo el id del usuario; leer en `useEffect` tras montar (evita desajuste de hidratación). Colapsados como array de claves; scroll guardado con espera breve y restaurado cuando cargan los datos. Un pequeño hook compartido `useRecordado(clave, inicial)` para no repetir código.
- Sin cambios en base de datos.
- Verificación con Playwright en ambas páginas: cambiar filtros y vista, plegar un grupo, ir a otro módulo y volver; todo se restaura.
- Anotar ambas tareas en roadmap.md.

# Partidas: recordar cómo la dejó el usuario

La página Partidas se mantiene igual (todas las obras en una tabla). Al volver a abrirla, se restaura lo último que el usuario tenía.

## Qué se recordará (por usuario y equipo)

- Proyecto elegido en el filtro (ya se recuerda hoy).
- Filtros de Especialidad y Tipo.
- Texto de búsqueda.
- Vista Tabla o Kanban.
- Proyectos y especialidades colapsados o abiertos.
- Posición de desplazamiento de la tabla.

Si un proyecto o especialidad guardado ya no existe, se ignora y se muestra todo.

## Detalles técnicos

- src/routes/_authenticated/partidas.tsx: guardar estos estados en localStorage con claves `partidas:*` incluyendo el id del usuario; leerlos en `useEffect` tras montar (evita desajuste de hidratación). Colapsados como array de claves; scroll guardado al desplazar (con espera breve) y restaurado cuando cargan los datos.
- Sin cambios en base de datos.
- Verificación con Playwright: cambiar filtros, colapsar un grupo, ir a otro módulo y volver; todo se restaura.
- Anotar la tarea en roadmap.md.

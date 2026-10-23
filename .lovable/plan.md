# Proyectos, Partidas y Avance físico: filtros compactos

Objetivo: ganar alto de pantalla para la tabla. Hoy cada página apila 4–5 franjas antes de la tabla (título, botón decorativo, fila de botones, tarjetas, filtros dentro del panel).

## Esquema común

```text
Título · subtítulo                         [Buscar…] [Proyecto ▾] [Especialidad ▾] [Filtros (1)] [acciones]
Tarjetas de resumen en una sola línea baja (etiqueta y valor juntos)
Tabla (ocupa el resto)
```

- Una sola barra de filtros en la misma línea del título, con selects más bajos y angostos (alto 28 px, texto 12 px).
- Los filtros menos usados pasan a un botón «Filtros» con un menú desplegable; el botón muestra cuántos están activos y tiene «Limpiar».
- Las tarjetas de resumen se convierten en una franja de una línea (aprox. 36 px en vez de ~60 px).
- Se quitan los botones decorativos «Gestión de partidas» / «Control de avance» que no hacen nada.

## Por página

- **Proyectos:** buscador y cliente suben a la línea del título; las pestañas de estado (Todos, En ejecución…) quedan como línea de pestañas sobre la tabla; la nota azul «El presupuesto se completa automáticamente…» pasa a un icono (i) con texto al pasar el cursor.
- **Partidas:** buscador, Proyecto y Especialidad visibles; Tipo dentro de «Filtros». Tabla/Kanban, Importar, Exportar y «+ Nueva partida» en la misma línea (Importar y Exportar como iconos con su nombre al pasar el cursor).
- **Avance físico:** Avance real / Avance programado como pestañas junto al título; buscador, Proyecto y Especialidad visibles; Orden dentro de «Filtros».

Todo lo recordado (filtros, vista, grupos) sigue funcionando igual.

## Detalles técnicos

- Nuevo `BarraFiltros` + `MenuFiltros` en ui-kit.tsx (popover con contador y Limpiar) y variante compacta de `TarjetaResumen` (fila única).
- Editar proyectos.tsx, partidas.tsx y avance.tsx: mover filtros del `extra` del Panel al `acciones` de Encabezado; quitar botones decorativos; Info como tooltip.
- Sin cambios de datos ni lógica.
- Verificación con Playwright a 1378x842 en las tres páginas: comparar cuántas filas de tabla se ven antes y después.

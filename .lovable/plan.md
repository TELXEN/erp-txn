# Filtros en un icono de lupa (Proyectos, Partidas, Avance físico)

Buena idea: libera toda la línea del título y deja la pantalla más limpia.

## Cómo se verá

```text
Partidas                                     [Tabla|Kanban] [+ Nueva partida] [🔍•2]
                                                                    ┌──────────────────┐
                                                                    │ Buscar…          │
                                                                    │ Proyecto     ▾   │
                                                                    │ Especialidad ▾   │
                                                                    │ Tipo         ▾   │
                                                                    │   Limpiar filtros│
                                                                    └──────────────────┘
```

- Un solo botón con lupa en el extremo derecho de la línea del título. Al hacer clic se despliega el menú con la búsqueda y todos los filtros de la página; se cierra al hacer clic fuera o con Esc.
- El icono muestra un punto con el número de filtros activos (la búsqueda cuenta como uno), para saber que la lista está filtrada aunque el menú esté cerrado.
- Al abrir, el cursor queda en el cuadro de búsqueda; los cambios se aplican al instante.
- «Limpiar filtros» deja todo en «Todos».
- Se sigue recordando lo último elegido al volver a la página.

## Por página

- **Proyectos:** menú con Buscar y Cliente. Se quedan a la vista Tabla/Kanban y «Nuevo proyecto».
- **Partidas:** menú con Buscar, Proyecto, Especialidad y Tipo. A la vista: Tabla/Kanban, Importar, Exportar y «+ Nueva partida».
- **Avance físico:** menú con Buscar, Proyecto, Especialidad y Orden. A la vista: Avance real / Avance programado.

## Detalles técnicos

- ui-kit.tsx: reemplazar `MenuFiltros` por versión con icono `Search`, insignia de contador, panel `w-72` alineado a la derecha, foco automático en el primer input y cierre con Esc/clic fuera.
- proyectos.tsx, partidas.tsx, avance.tsx: mover Buscador/Selects al interior del menú (ancho completo) y colocarlo como último elemento de `acciones`.
- Sin cambios de datos.
- Verificación con Playwright a 1378x842: abrir el menú, filtrar, ver contador y Limpiar en las tres páginas.

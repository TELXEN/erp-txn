# Refinar la vista Registro de Partidas (UI limpia y corporativa)

## Alcance
Solo `src/routes/_authenticated/partidas.tsx` (vista tabla). Sin cambios de base de datos ni de lógica de guardado. La cabecera (tarjetas de presupuesto, buscador, Exportar a Excel) se mantiene, solo se verifica alineación y contraste.

## 1. Jerarquía WBS/EDT resaltada
- Fila de especialidad (Nivel 1, ej. "01"): negrita, fondo gris/azul suave (`bg-muted/60`), texto en mayúsculas con buen contraste.
- Fila de categoría (Nivel 2, ej. "01.01"): negrita, fondo aún más sutil (`bg-muted/30`), sangría mayor en el código.
- Subpartidas finales (Nivel 3/4): sin fondo, con sangría limpia a la izquierda (código y nombre indentados según nivel) para reflejar la pertenencia al grupo superior. Se conserva el icono de rama en el último nivel.

## 2. Columnas financieras y acciones limpias
- "P.U. (S/)" y "Presupuesto": `S/` y monto en la misma línea, justificados a la derecha, con `whitespace-nowrap` para que el símbolo nunca salte de línea (también en las filas de resumen de especialidad y categoría).
- Columna "Acciones": los iconos (APU, subpartida, editar, eliminar) quedan ocultos por defecto y aparecen solo al pasar el cursor sobre la fila (`opacity-0 group-hover:opacity-100` con transición suave). La fila de edición y la fila de captura de subpartida mantienen sus botones siempre visibles.

## 3. Badges y avance
- "Tipo" y "Prioridad": badges modernos tipo pastilla — texto con color y fondo semitransparente del mismo tono (se ajustan `InsigniaTipoPresupuesto` e `InsigniaPrioridad` en `src/components/estado-ui.tsx`, conservando la paleta de semáforo ya definida para prioridades).
- "Avance": micro barra de progreso horizontal discreta (altura ~4px, color primario) junto al porcentaje de texto.

## 4. Cabecera
- Tarjetas de presupuesto contractual/vigente, buscador y botones de exportación: alineados en una sola fila, fuentes oscuras de alto contraste (`text-ink`), sin cambios de funcionalidad.

## Verificación
- tsgo limpio, build OK.
- Revisión visual con Playwright en /partidas: jerarquía con fondos, iconos ocultos hasta hover, badges y micro barra de avance.

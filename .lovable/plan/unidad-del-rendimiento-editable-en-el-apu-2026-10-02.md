# Unidad del rendimiento editable en el APU

## Estado actual

En la ventana de Análisis de Precios Unitarios, el rendimiento se muestra como "Rendimiento (unidad/día)", pero la unidad es un texto fijo que sale del campo `unidad` de la partida. Hoy solo se puede cambiar editando la partida en el Registro de partidas; desde la ventana del APU no se puede actualizar. Además, "Copiar del banco" trae rendimiento y jornada, pero no la unidad.

## Cambios

1. **Selector de unidad en la ventana del APU**: junto al campo Rendimiento, un selector con las unidades activas de Unidades de medida (und, m, m2, m3, kg, glb, etc.), precargado con la unidad actual de la partida.
2. **Guardar junto con el APU**: al pulsar "Guardar y aplicar P.U.", la unidad elegida se guarda en la partida (banco, obra o cotización, según el origen) junto con rendimiento, jornada y precio unitario. El texto "por {unidad}" bajo el precio unitario se actualiza en vivo al cambiar el selector.
3. **Copiar del banco incluye la unidad**: al copiar el APU desde el banco de partidas, también se trae la unidad de la partida maestra.

## Detalles técnicos

- `src/components/ApuPartida.tsx`: estado `und` inicializado con `partida.unidad`; selector alimentado por el hook de unidades de medida ya existente; `guardar()` añade `unidad` al update; `copiarDelBanco()` copia también `m.unidad`.
- Sin migración: la columna `unidad` ya existe en `partidas_maestras`, `partidas` y `cotizacion_items`.
- Verificación: typecheck, build y prueba en la vista previa cambiando la unidad de una partida de prueba y confirmando que se refleja en el listado.

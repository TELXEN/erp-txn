# Ventana de cotización: desplazamiento independiente y alineación

## Qué cambia
1. **Panel derecho (Análisis de precios unitarios)**: se queda fijo. Solo muestra su propia barra de desplazamiento cuando los insumos no caben en la altura disponible.
2. **Hoja izquierda (partidas)**: se desplaza arriba y abajo con su propia barra cuando hay muchas partidas. El resumen de costos sigue fijo debajo, y la página completa no se desplaza.
3. **Alineación superior**: la hoja izquierda y el panel APU empiezan a la misma altura. Se quita el margen superior extra de la hoja en modo edición.

## Detalles técnicos
- `cotizaciones.tsx` (modo editor): el contenedor de dos columnas usa la altura de la ventana (`lg:h-[calc(100dvh-…)]`, `lg:overflow-hidden`). La columna izquierda es `flex-col min-h-0`, con la hoja en `flex-1 min-h-0 overflow-y-auto` y `ResumenCotizacion` como `shrink-0`. El `aside` es `flex flex-col min-h-0`, y su contenido va en `overflow-y-auto` (la barra solo aparece si hace falta).
- `PanelApuCotizacion`: el bloque de la tabla de insumos ocupa `flex-1 min-h-0 overflow-y-auto`, y la cabecera y el total del APU quedan fijos.
- `HojaCotizacion`: cuando `mostrarEncabezado` es falso, se quitan el `padding: 18px 0` del contenedor y el margen superior del bloque de partidas, para que el borde superior coincida con el del panel APU.
- Solo cambia la presentación; no hay cambios en datos.

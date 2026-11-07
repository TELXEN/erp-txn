# Separar «Análisis APU» y «Añadir insumo» en cotizaciones

## Qué cambia para el usuario
1. **Análisis APU**: abre solo el panel con el APU de la partida seleccionada. Ya no aparece la ventana de insumos.
2. **Añadir insumo**: abre solo la ventana de insumos. El panel de APU queda oculto. Al guardar o cancelar se cierra la ventana y la hoja queda igual que antes. Si el panel APU ya estaba abierto, sigue abierto.

## Causa
- El botón «Añadir insumo» abre el panel APU y le manda una orden para abrir la ventana de insumos.
- Esa orden queda guardada. Cuando después se pulsa «Análisis APU», el panel vuelve a abrirse, lee la orden vieja y abre otra vez la ventana de insumos.

## Detalles técnicos
- `cotizaciones.tsx`:
  - El botón «Análisis APU» y el cierre del panel ponen `cmdInsumo` en `null`, así no se repite una orden vieja.
  - Nuevo estado `soloInsumo`. `onAgregarInsumo` ya no llama a `setApuAbierto(true)`. Pone `soloInsumo = true` y envía `cmdInsumo`.
  - Si `soloInsumo` está activo y `apuAbierto` no, se monta `PanelApuCotizacion` sin `PanelLateralApu` y oculto (`hidden`), con la prop `alCerrarInsumo` que hace `soloInsumo = false` y `cmdInsumo = null`.
- `PanelApuCotizacion.tsx`: nueva prop opcional `alCerrarInsumo`. Se llama cuando la ventana `VentanaInsumo` se cierra (al cancelar o al terminar). Con `oculto`, el panel muestra solo la ventana de insumos.
- Agregar insumos sigue usando la misma función `agregarApu`, así que la forma de guardar no cambia.

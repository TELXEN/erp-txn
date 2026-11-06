# Edición de cotizaciones a pantalla completa, igual que la vista previa

## Qué verá el usuario

**La hoja ocupa toda la pantalla**
- Hoy la hoja usa un 58 % del ancho y el panel APU el resto. La hoja pasará a usar todo el ancho.
- Se verá igual que la vista previa: el mismo encabezado (logo, empresa, recuadro RUC/COTIZACIÓN), el recuadro del cliente, el recuadro de fechas, la tabla con encabezado gris, el desglose con TOTAL amarillo y las cuentas bancarias.
- Diferencia: la hoja se amplía en proporción al ancho de la ventana (como el editor de factura), así los textos se ven más grandes para trabajar. La impresión y el PDF no cambian de tamaño.
- Los campos del encabezado se editan directamente en la hoja (sin abrir la ventana «Encabezado»), con subrayado tenue al pasar o escribir. Las partidas se siguen editando en la tabla con sus mismos controles (agregar, mover, niveles), que no se imprimen.
- Las condiciones de la propuesta y el pie (quién elabora) se editan en la misma hoja, en su lugar de impresión.

**Análisis de precios unitarios: ventana flotante acoplada a la derecha (recomendado)**
- Al hacer doble clic en una partida (o con el botón «APU» de su fila) se abre un panel flotante que se desliza desde la derecha, sobre la hoja, con el APU de esa partida.
- Mientras está abierto, al hacer clic en otra partida el panel cambia a esa partida sin cerrarse, para revisar varias seguidas.
- Se puede ensanchar arrastrando su borde y se cierra con la X o Esc; la hoja vuelve a quedar entera.
- Cada cambio en el APU actualiza al instante el precio de la partida en la hoja.
- Por qué así y no una ventana centrada: no tapa la partida que estás revisando, deja ver el precio cambiar en la hoja y no obliga a abrir y cerrar por cada partida.

**Resumen de totales**
- La franja de resumen inferior se retira del editor, porque el desglose ya está al pie de la hoja.

## Detalles técnicos
- `cotizaciones.tsx`: quitar el reparto 58 % / aside; un solo lienzo con ResizeObserver y `zoom = clamp((ancho-8)/794, 1, 2)` (mismo patrón que HojaComprobante); APU en un panel lateral (`PanelApuCotizacion` sin cambios internos) con ancho redimensionable recordado con `useRecordado`, abierto por `partidaActiva` + estado `apuAbierto`.
- `HojaCotizacion.tsx`: renderizar `EncabezadoCotizacion editable`, `HojaNiveles`, desglose con píldoras, condiciones, cuentas (`CuentasComprobante`) y `PieCotizacion editable` con la misma estructura y medidas de la hoja de `cotizacion-vista.tsx` (754 px interior, fuentes de documento).
- `HojaNiveles.tsx`: aplicar el estilo de tabla de la vista previa (encabezado #A9A9A9, tamaños 8pt, colores de niveles); los controles de edición siguen fuera de la impresión.
- Compartir el bloque de desglose/condiciones entre vista previa y editor extrayéndolo a un componente común para que no diverjan.
- Actualizar la regla de AGENTS.md sobre el editor de cotizaciones (hoja escalada + APU en panel lateral).
- Verificar con Playwright en TXN26-C010.

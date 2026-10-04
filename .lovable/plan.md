# Cotización en vertical u horizontal (carta A4)

## Qué verás

Cada cotización podrá elegir su orientación de página: **Vertical** (como hoy) u **Horizontal** (hoja acostada, útil cuando las partidas tienen descripciones largas o muchas columnas).

- En la hoja de la cotización (edición) aparecerá un selector **Orientación: Vertical / Horizontal**, junto a Moneda y T. cambio.
- Al cambiarla, la hoja se redibuja al instante: en horizontal la página es más ancha y menos alta, y la columna Descripción gana mucho más espacio.
- La vista previa muestra la hoja exactamente como saldrá impresa, en la orientación elegida.
- El **PDF descargado** sale en la misma orientación (A4 vertical u horizontal), con el pie de página y la numeración «Hoja X de Y» siempre al final.
- La orientación se guarda con la cotización: al volver a abrirla, copiarla o imprimirla, se respeta la elegida.
- El Excel exportado no cambia (no tiene orientación de página).

## Detalles técnicos

1. **Base de datos**: columna nueva `orientacion` (texto, valores `vertical`/`horizontal`, por defecto `vertical`) en la tabla `cotizaciones`; se copia al duplicar una cotización.
2. **Edición** (`HojaCotizacion.tsx`): selector de orientación en la cinta de datos; el ancho de la hoja fluida se adapta.
3. **Vista previa** (`cotizacion-vista.tsx`): dimensiones A4 parametrizadas — vertical 794×1123 px (hoy) u horizontal 1123×794 px — aplicadas a la hoja y a cada página; el paginador usa más caracteres por línea en horizontal (descripciones parten en menos líneas); el pie fijo se recalcula.
4. **PDF**: `html2pdf` con `orientation: "landscape"` cuando corresponda y `windowWidth` acorde, para que el archivo salga idéntico a la vista previa.
5. Se conservan intactos: tema documental compartido (colores, Roboto), tamaños de letra acordados, alineaciones, moneda soles/dólares y cálculos.

## Verificación

- Abrir una cotización real, cambiar a horizontal y comprobar edición, vista previa y PDF.
- Probar una cotización con descripciones largas y más de una página en ambas orientaciones.
- Confirmar que las cotizaciones existentes siguen abriéndose en vertical sin cambios.

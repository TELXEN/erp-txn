# Corregir impresión del recibo por honorarios

## Problema
Al imprimir el detalle de pago, el documento sale sin formato: logotipo gigante, textos pegados (RUC y número sin separación), sin cuadros ni columnas. La hoja se ve bien en pantalla, pero al imprimir se pierde todo el diseño.

## Causa
El botón «Imprimir / Guardar PDF» copia el HTML de la hoja a un marco oculto (iframe) y trata de copiar también las hojas de estilo de la aplicación. Los estilos del sistema no viajan completos a ese marco (las variables y capas de Tailwind v4 no se resuelven fuera del documento original), por eso la hoja llega «desnuda» a la impresora.

## Solución
Imprimir la hoja en el mismo documento, sin copiarla a otro marco:

1. **Imprimir en el sitio**: el botón llamará directamente a la impresión del navegador (`window.print()`), eliminando el mecanismo del marco oculto.
2. **Regla de impresión en los estilos globales** (`src/styles.css`): al imprimir, se oculta todo lo demás (barra lateral, formulario, botones) y la hoja A4 queda como único elemento visible, sin escala, sin sombra y con el ancho correcto de página.
3. **Ajustes finos de la hoja** (`HojaDetalleHonorario.tsx`): conservar los márgenes compactos ya aplicados para que todo el contenido (datos, montos, totales, neto a pagar y firmas) quepa en una sola página A4.

## Verificación
- Compilación sin errores.
- Prueba con Playwright: abrir Recibos por Honorarios, generar la impresión a PDF y confirmar que el documento sale con su diseño completo (cuadros, columnas, colores y firmas) en una página A4.

## Detalles técnicos
- Archivos: `src/components/personal/DetallePagoHonorario.tsx` (quitar iframe, usar `window.print()`), `src/styles.css` (bloque `@media print` que oculta todo salvo `.honorario-print-sheet`, con `position: fixed; inset: 0; transform: none` para anular la escala de vista previa), `src/components/personal/HojaDetalleHonorario.tsx` (variantes `print:` ya presentes).
- No se usa `@page` (lightningcss lo rechaza y en su momento dejó la pantalla en blanco); los márgenes se controlan con el relleno de la propia hoja.

# Cotizaciones: color en edición, blanco y negro en impresión

## Objetivo
La hoja de cotización mantiene los colores TELXEN mientras se edita en pantalla, pero la vista previa, la impresión y el PDF salen estrictamente en blanco y negro (texto negro, líneas grises, sin azules ni acentos de color).

## Cambios

1. **Paleta de impresión monocromática**
   - Crear una variante en blanco y negro de la paleta de documentos: texto negro puro, encabezados de tabla negros con letra blanca, líneas y fondos en grises suaves.
   - El logo y los recuadros de acento pasan a negro/gris.

2. **Vista previa e impresión (cotizacion-vista.tsx)**
   - La hoja A4 de vista previa usa la paleta monocromática: títulos de sección, filas de grupo, tabla de ítems, desglose de costos y pie, todo en negro/grises.

3. **PDF y Excel**
   - El PDF descargado usa la misma paleta blanco y negro.
   - El Excel mantiene su formato actual (ya es mayormente neutro); se revisa que no lleve acentos de color.

4. **Edición sin cambios de fondo**
   - La hoja editable (HojaCotizacion.tsx) conserva los colores actuales del tema TELXEN.

## Detalles técnicos
- Se añade una paleta `DOC_MONO` (o parámetro `mono`) en `src/lib/documento-tema.ts` para que facturación y preliquidaciones puedan adoptarla después si se desea; en esta etapa solo se aplica a cotizaciones.
- No se toca base de datos ni cálculos; es un cambio puramente visual.
- Verificación con navegador: abrir una cotización, comparar edición (con color) contra vista previa (blanco y negro) y descargar el PDF.

## Pregunta implícita resuelta
Si más adelante quieres lo mismo en facturación y preliquidaciones, la paleta monocromática ya quedará lista para reutilizar.

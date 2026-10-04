# Formato único para Factura, Cotización y Preliquidación

## Objetivo
Cotizaciones y Preliquidaciones adoptan el mismo diseño de la Factura Electrónica (paleta TELXEN navy/dorado, Roboto, encabezado de empresa con recuadro de título y código, tarjeta de cliente con borde dorado, tabla con cabecera navy y filas alternas, totales sobre fondo gris, tarjetas inferiores redondeadas, pie con «Página X de Y»). Además, el diseño queda centralizado: cualquier cambio futuro en la factura se reflejará automáticamente en los otros dos documentos.

## Qué verá el usuario
- **Cotización** (vista, impresión y PDF): mismo encabezado, bloque Cliente / Proyecto / Fechas con dos puntos alineados, tabla con estilo factura (descripción amplia y multilínea, datos alineados arriba), totales integrados y bloque de condiciones/cuentas en tarjetas. Se conservan sus contenidos propios (validez, condiciones comerciales, firma).
- **Preliquidación** (vista y PDF): mismo encabezado, datos del proyecto en tarjeta, tabla de partidas con estilo factura, resumen de montos en el bloque de totales y pie paginado.
- Sin QR, hash ni textos fiscales SUNAT en Cotización y Preliquidación (son exclusivos de la factura).

## Vinculación para cambios futuros
Se crea una sola fuente de diseño compartida que contiene colores, tamaños de letra, anchos, bordes y piezas comunes (encabezado, bloque de cliente, cabecera de tabla, fila de totales, tarjetas, pie). La factura, la cotización y la preliquidación consumen esa fuente; ajustar un tamaño o color allí cambia los tres documentos a la vez.

## Detalles técnicos
- Nuevo `src/lib/documento-tema.ts`: tokens (paleta `c`, tamaños, columnas base) + helpers de estilo HTML.
- Nuevo `src/components/documentos/pdf-base.tsx`: piezas @react-pdf reutilizables (`EncabezadoPdf`, `BandaClientePdf`, `CabeceraTablaPdf`, `TotalesPdf`, `TarjetaPdf`, `PiePaginaPdf`) y `crearEstilosDocumento(fontFamily)` extraído de `ComprobantePdf.tsx`.
- Nuevo `src/components/documentos/html-base.tsx`: equivalentes HTML para vistas A4 (cotización usa html2pdf; se mantiene ese motor según la regla del proyecto).
- Refactor de `ComprobantePdf.tsx` y vista del comprobante para usar las piezas compartidas sin cambio visual (verificación con F001-00000004).
- Migrar `PreliquidacionPdf.tsx` y la vista de preliquidación a las piezas PDF/HTML compartidas.
- Migrar `CotizacionHoja.tsx` / `cotizaciones/HojaCotizacion.tsx` (hoja A4 con cabeceras repetidas y numeración) a las piezas HTML compartidas; la edición WYSIWYG mantiene su comportamiento.
- Registrar en `AGENTS.md` la regla: los tres documentos usan el tema documental compartido.
- Verificación: build, captura Playwright de la vista de cada documento y generación de PDF de factura, cotización y preliquidación.

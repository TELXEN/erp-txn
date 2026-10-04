# Mejorar la vista del comprobante electrónico

## Resultado
La hoja de Facturación Electrónica tendrá una presentación más limpia y fiscal, con la misma estructura en edición, vista previa y PDF.

## Diseño de la hoja
- **Cabecera en dos columnas:** izquierda logotipo y nombre comercial con datos de la empresa; derecha recuadro con borde que muestra RUC, tipo de documento (p. ej. FACTURA DE VENTA ELECTRÓNICA) y numeración (F001-00000001).
- **Bloque de datos:** grilla alineada con Razón social, RUC, Dirección, Fecha de emisión, Vencimiento y Moneda; etiquetas en negrita y valores normales.
- **Tabla de ítems:** cabecera con gris muy tenue; columnas Código, Descripción, Unidad, Cantidad, Valor unitario, Descuento, Importe total; la descripción larga salta de línea sin deformar las columnas.
- **Bloque inferior en dos partes:** izquierda con detracción (bien/servicio, medio de pago, cuenta Banco de la Nación, monto) y espacio para el QR; derecha con Op. gravadas, IGV y Total a pagar destacado.
- **Leyendas legales** (SUNAT, detracción, representación impresa) en texto pequeño y compacto.

## Jerarquía y color
- Título y número: negrita grande. Datos, etiquetas y totales: texto pequeño, títulos en negrita. Leyendas: micro-texto.
- Cuerpo de la hoja siempre blanco con texto gris muy oscuro para buena impresión; barras y cabeceras alrededor siguen el color del menú del tema.

## Modos
- **Edición:** la hoja ocupa todo el ancho de la ventana, con campos editables directamente en la hoja.
- **Impresión / vista previa / PDF:** formato A4 fijo.

## Qué se mantiene
- Se usan los datos reales del comprobante (no datos ficticios); los borradores siguen marcados como sin validez tributaria.
- La tipografía sigue siendo la elegida en Tipografía de documentos (en lugar de una fuente fija), para no romper esa configuración.
- Sin cambios en cálculos, numeración, permisos ni envío a SUNAT.

## Detalles técnicos
- Reestructurar `HojaComprobante.tsx` (pantalla) y `ComprobantePdf.tsx` (PDF react-pdf) con la misma composición; reutilizar `CuentasComprobante`.
- Colores en tokens semánticos del documento; tamaños equivalentes 14pt / 8pt / 6.5pt.
- Verificar con Playwright: nuevo comprobante, borrador, desde preliquidación, vista previa A4 y PDF descargado.

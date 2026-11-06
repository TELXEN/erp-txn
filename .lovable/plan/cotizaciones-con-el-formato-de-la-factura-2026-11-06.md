# Cotizaciones con el formato de la factura

Solo se clona el aspecto de la factura. Los datos de la cotización, sus importes, niveles (especialidad, título, partida), revisiones, numeración y guardado no cambian.

## Qué verá el usuario

**Encabezado (todas las hojas)**
- Logo ampliado 1.2× y centrado verticalmente, datos de la empresa a la izquierda: nombre, eslogan en una sola línea, dirección y web; sin línea horizontal.
- A la derecha, el recuadro redondeado de borde negro, sin fondo, con RUC, «COTIZACIÓN» y el código (TXN26-C0xx) y la revisión, con la misma separación y tamaños de la factura.
- Todo en MAYÚSCULAS e interlineado 1.15.

**Datos del cliente**
- Rectángulo redondeado con borde gris y sin fondo, rótulos con los dos puntos alineados en la misma vertical: cliente, RUC, dirección y Departamento/Provincia/Distrito en una fila.
- A la derecha: Moneda, T. cambio (solo en dólares) e IGV, con los menús actuales.
- Debajo, el recuadro gris de datos con los campos que la cotización ya tiene (fecha, proyecto/obra, validez, plazo, etc.).

**Tabla de partidas**
- Encabezado gris #A9A9A9, misma letra y tamaño que la factura, sin columna «#» (el ítem 1.0 / 1.1 se conserva porque es el código del nivel).
- Las filas de especialidad, título y subtítulo mantienen su jerarquía, ahora con los tonos de la factura.

**Cierre**
- Desglose con píldoras gris claro y casilla con borde: COSTO DIRECTO, GASTOS GENERALES, UTILIDAD, SUB TOTAL, IGV y TOTAL en amarillo corporativo con texto negro.
- Observaciones/condiciones a la izquierda del desglose.
- Datos bancarios en tres columnas (Soles, Dólares, Cuenta de detracciones) con CTA: y CCI:, igual que la factura.

**Modo edición**
- La hoja ocupa toda la pantalla: se amplía en proporción al ancho de la ventana, igual que el editor de factura; los campos se ven como texto impreso con subrayado tenue al pasar o escribir.
- Lo que no se imprime (agregar partidas, menús de edición) queda en controles discretos o en una franja fuera de la hoja.

**Vista preliminar e impresión**
- Hoja A4 real; arriba «Volver», «Descargar PDF» e «Imprimir» (impresora a la derecha de «Descargar PDF»); se imprime solo la hoja.
- El PDF y el Excel conservan sus datos; el PDF toma el nuevo aspecto porque se genera desde la misma hoja. Excel y el Dossier APU no cambian de contenido.

## Detalles técnicos
- Archivos: `cotizaciones/EncabezadoCotizacion.tsx` (encabezado, banda cliente, `PieCotizacion` con desglose y `CuentasComprobante`), `cotizaciones/HojaCotizacion.tsx` y `HojaNiveles.tsx` (tabla y estilos), `routes/_authenticated/cotizacion-vista.tsx` (barra de botones, impresión con raíz clonada A4), `routes/_authenticated/cotizaciones.tsx` (contenedor de edición a pantalla completa con zoom por ResizeObserver).
- Reutilizar `documento-tema.ts`, `CuentasComprobante`/`cuentas-comprobante.ts`, `TextoAjustado` y el patrón de zoom de `HojaComprobante`.
- La paginación (`paginacion-cotizacion`) se mantiene y vuelve a medir alturas con los nuevos tamaños, manteniendo títulos junto a sus partidas; orientación horizontal sigue disponible.
- Montos siguen saliendo de los cálculos actuales; IGV con `aplica_igv`.
- Verificar con Playwright en TXN26-C010: editor ampliado, vista previa, impresión y PDF.

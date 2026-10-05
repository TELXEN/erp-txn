# Recibidos (compras): recuperación de facturas perdidas vía SUNAT

## Objetivo

La pestaña «Recibidos (compras)» de Facturación Electrónica se convierte en una herramienta de **contingencia**: cuando una factura se pierde o el proveedor no la entrega ni responde, TELXEN recurre a SUNAT para verificarla y reconstruirla, y deja trazabilidad del caso.

Hecho clave ya confirmado: SUNAT **no entrega el PDF/XML original** de facturas de terceros; solo entrega los datos fiscales (RUC, serie, número, fecha, montos, estado). Por eso la recuperación real es: verificar en SUNAT → generar la representación A4 como respaldo → pedir el original al proveedor → adjuntarlo cuando llegue.

## Cambios

### 1. Reenmarcar la pestaña
- Título y texto explicativo del flujo de contingencia: "Usa este espacio cuando una factura se perdió o el proveedor no la entrega. SUNAT confirma los datos fiscales; el original siempre debe pedirse al proveedor."
- Selector de mes/año y listado desde el RCE ya sincronizado (como hoy).

### 2. Estado de recuperación por factura (nuevo)
Cada comprobante lleva un seguimiento del caso:
- **Perdida / Sin original** (inicial)
- **Solicitada al proveedor** (con fecha de solicitud y nota: a quién se pidió, por qué medio)
- **Recuperada con original** (cuando se adjunta el PDF/XML real)
- **Solo representación SUNAT** (el proveedor nunca respondió; queda la ficha A4 como sustento interno)

Columna visible en la tabla con selector, fecha y nota editable por fila.

### 3. Verificación y respaldo
- Mantener la ficha A4 imprimible (datos fiscales SUNAT + cliente TELXEN + montos) como respaldo interno de la compra.
- Mantener el adjunto de PDF/XML del proveedor (el XML sigue leyendo los ítems reales automáticamente).

### 4. Edición manual del detalle (sin IA, sin costo)
- Botón de lápiz por fila para escribir/corregir los ítems (descripción, unidad, cantidad, precio) cuando solo hay el importe consolidado. Sin lectura automática con IA para evitar costo por uso.

### 5. Registro en el ERP
- Mantener el registro a Costos Directos / Gastos Generales.
- Aviso al registrar una factura marcada "Perdida": pedir confirmación, ya que lo correcto es registrarla cuando está verificada o recuperada.

### 6. Limpieza de la pantalla
- Quitar los botones "Descargar comprobantes" y "Reintentar fallidas" (SUNAT no entrega esos archivos; generan confusión).
- Mantener el ZIP del período con los archivos efectivamente adjuntados.

## Detalles técnicos

- Migración: agregar a `comprobantes_recibidos` las columnas `estado_recuperacion` (texto, default 'perdida'), `fecha_solicitud` (date, nula) y `nota_recuperacion` (texto, nula). RLS ya existente no cambia.
- UI: cambios en `src/components/sire/ComprobantesRecibidos.tsx` (columna de estado con `Select`, fecha y nota; modal de edición de ítems que escribe en `comprobantes_recibidos_items`; retiro de los botones de descarga masiva y de `descargarComprobantesSire` en esta vista).
- El texto explicativo y el título se ajustan en `src/components/facturacion/ComprobantesCompras.tsx`.
- La función de servidor `descargarComprobantesSire` queda sin uso en esta pantalla (se conserva en el código por si se reutiliza).

## Fuera de alcance

- Lectura automática de PDF con IA (tiene costo por uso; se puede evaluar después si el volumen de casos lo justifica).
- Creación de cuentas por pagar en Tesorería (se mantiene el flujo actual de registro).

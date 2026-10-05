# Recibidos (compras): recuperación de facturas perdidas vía SUNAT

## Objetivo

La pestaña «Recibidos (compras)» de Facturación Electrónica se convierte en una herramienta de **contingencia**: cuando una factura se pierde o el proveedor no la entrega ni responde, TELXEN recurre a SUNAT para verificarla y recuperarla, y deja trazabilidad del caso.

Matiz importante sobre SUNAT:
- **Portal SOL (web):** permite descargar el XML/PDF de comprobantes recibidos. A mano es uno por uno; algunos sistemas de terceros (como el que TELXEN ya usó) automatizan ese portal con la Clave SOL para bajar los archivos faltantes en lote.
- **API SIRE (la que usa el ERP hoy):** entrega los datos fiscales (RUC, serie, número, fecha, montos, estado) pero **no entrega los archivos**.

Por eso el flujo de recuperación es: verificar en SUNAT (ya sincronizado en el ERP) → descargar el XML/PDF (automático con Clave SOL, o manual desde el Portal SOL) → adjuntarlo en el ERP (que lee los ítems reales automáticamente) → registrar la compra.

## Descarga automática desde el Portal SOL (aprobada)

Como el sistema del proveedor de software, el ERP iniciará sesión en el Portal SOL de SUNAT con la Clave SOL de TELXEN y descargará automáticamente el XML/PDF de las facturas recibidas que falten:
- Credenciales de Clave SOL guardadas como secreto del servidor (nunca en el navegador ni en el código). Se pedirán al usuario en un formulario seguro durante la construcción.
- Botón «Buscar en SUNAT» por factura y en lote para el mes; lo descargado se adjunta al bucket privado y el XML alimenta automáticamente el detalle de ítems.
- La automatización corre en funciones de servidor autenticadas; si el portal pide una validación extra o cambia, la descarga se marca como fallida con un mensaje claro y queda la ruta manual: adjuntar el archivo descargado a mano.


## Cambios

### 1. Reenmarcar la pestaña
- Título y texto explicativo del flujo de contingencia: "Usa este espacio cuando una factura se perdió o el proveedor no la entrega. Verifica los datos fiscales en SUNAT, descarga el XML desde el Portal SOL y adjúntalo aquí."
- Selector de mes/año y listado desde el RCE ya sincronizado (como hoy).

### 2. Estado de recuperación por factura (nuevo)
Cada comprobante lleva un seguimiento del caso:
- **Perdida / Sin original** (inicial)
- **Solicitada al proveedor** (con fecha de solicitud y nota: a quién se pidió, por qué medio)
- **Recuperada con original** (cuando se adjunta el PDF/XML real, sea del proveedor o del Portal SOL)
- **Solo representación SUNAT** (no se logró el original; queda la ficha A4 como sustento interno)

Columna visible en la tabla con selector, fecha y nota editable por fila.

### 3. Verificación y respaldo
- Mantener la ficha A4 imprimible (datos fiscales SUNAT + cliente TELXEN + montos) como respaldo interno.
- Mantener el adjunto de PDF/XML (el XML sigue leyendo los ítems reales automáticamente).
- Botón «Buscar en SUNAT»: descarga y adjunta el XML/PDF faltante sin salir del ERP; si falla, guía corta para hacerlo a mano en el Portal SOL.

### 4. Edición manual del detalle (sin IA, sin costo)
- Botón de lápiz por fila para escribir/corregir los ítems (descripción, unidad, cantidad, precio) cuando solo hay el importe consolidado. Sin lectura automática con IA para evitar costo por uso.

### 5. Registro en el ERP
- Mantener el registro a Costos Directos / Gastos Generales.
- Aviso al registrar una factura marcada "Perdida": pedir confirmación, ya que lo correcto es registrarla cuando está verificada o recuperada.

### 6. Limpieza de la pantalla
- Quitar los botones "Descargar comprobantes" y "Reintentar fallidas" (la API de SUNAT no entrega esos archivos; generan confusión).
- Mantener el ZIP del período con los archivos efectivamente adjuntados.

## Detalles técnicos

- Migración: agregar a `comprobantes_recibidos` las columnas `estado_recuperacion` (texto, default 'perdida'), `fecha_solicitud` (date, nula) y `nota_recuperacion` (texto, nula). RLS ya existente no cambia.
- Descarga Portal SOL: nueva función de servidor autenticada con middleware `requireSupabaseAuth` que usa los secretos `SUNAT_SOL_USUARIO` y `SUNAT_SOL_CLAVE` (se pedirán al usuario con formulario seguro en la construcción; nunca se exponen al navegador). Login en el portal, búsqueda del comprobante, descarga del XML/PDF, guardado en el bucket privado `comprobantes-compra` y parseo del XML a `comprobantes_recibidos_items`.
- UI: cambios en `src/components/sire/ComprobantesRecibidos.tsx` (columna de estado con `Select`, fecha y nota; modal de edición de ítems que escribe en `comprobantes_recibidos_items`; botón «Buscar en SUNAT»; retiro de los botones de descarga masiva y del uso de `descargarComprobantesSire` en esta vista).
- El texto explicativo y el título se ajustan en `src/components/facturacion/ComprobantesCompras.tsx`.
- La función de servidor `descargarComprobantesSire` queda sin uso en esta pantalla (se conserva en el código por si se reutiliza).

## Fuera de alcance

- Lectura automática de PDF con IA (tiene costo por uso; se puede evaluar después si el volumen de casos lo justifica).
- Creación de cuentas por pagar en Tesorería (se mantiene el flujo actual de registro).

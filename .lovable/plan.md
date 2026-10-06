# Detalle de ítems de facturas de compra (XML UBL 2.1)

## Resultado
En Facturación Electrónica → Recibidos (compras), cada factura traída por el SIRE podrá mostrar su detalle completo: código de producto, descripción, unidad, cantidad, precio unitario y valor de cada ítem, obtenidos del XML.

## Cambios
1. **Lector XML mejorado** — el lector actual ya lee descripción, cantidad, unidad y precio de cada `cac:InvoiceLine` (también líneas de notas de crédito/débito). Se amplía para:
   - Leer el código del producto (`cac:Item/cac:SellersItemIdentification/cbc:ID`).
   - Tomar la descripción solo de `cac:Item/cbc:Description` (unir varias líneas de descripción) y evitar confusiones con otras etiquetas.
   - Leer el precio solo de `cac:Price/cbc:PriceAmount` (no del precio referencial con IGV).
   - Validar que el RUC emisor, serie y número del XML coincidan con la factura del SIRE antes de guardar.
2. **Descarga masiva desde SUNAT** — se reactiva el botón «Descargar XML de SUNAT» (lote del período o filas seleccionadas) usando RUC emisor, tipo, serie y correlativo del SIRE contra el servicio de consulta de comprobantes de SUNAT, en lotes de 10 con barra de progreso y reintento de fallidas. El XML se guarda en el almacenamiento privado de compras.
   - Si SUNAT no entrega el archivo (caso frecuente: requiere permiso de consulta en las credenciales API, o el proveedor emitió vía OSE), la fila queda marcada «XML no disponible en SUNAT» y sigue disponible adjuntar el XML a mano; el detalle se extrae igual.
3. **Base de datos** — los ítems quedan vinculados a la factura del SIRE (se reemplazan al volver a leer, sin duplicar). Se agrega la columna del código de producto.
4. **Pantalla** — al expandir una factura se ve la tabla de ítems con código, descripción, unidad, cantidad, P.U. y valor, y un indicador de origen (XML SUNAT / XML adjunto / manual). La edición manual existente se mantiene.

## Detalles técnicos
- Migración: `ALTER TABLE comprobantes_recibidos_items ADD COLUMN codigo text` y `ADD COLUMN origen text default 'xml'`.
- `src/lib/sire-cpe.server.ts`: `parsearUbl` devuelve `codigo`, extrae datos del bloque `cac:Item` y `cac:Price`, y expone `emisorRuc/serie/numero` para validar.
- `src/lib/sire.functions.ts` (`descargarComprobantesSire`, admin/gerente): guarda `codigo`/`origen`, valida coincidencia y borra ítems previos antes de insertar. Mismo parser al adjuntar XML manualmente.
- `src/components/sire/ComprobantesRecibidos.tsx`: botón de descarga masiva por lotes encadenados, estado por fila y tabla de ítems expandible con columna Código.
- Se probará el parser con un XML UBL 2.1 de ejemplo; la descarga real solo se confirma con las credenciales API SOL de TELXEN.

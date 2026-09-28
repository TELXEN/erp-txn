# Implementar Facturación Electrónica

## Resultado
El menú Comercial tendrá **Preliquidaciones** y **Facturación Electrónica** como módulos separados. El nuevo módulo permitirá crear facturas, boletas, notas de crédito y notas de débito, desde una preliquidación aprobada o mediante emisión libre, y conservará el control de cobranza existente.

## Datos y seguridad
- Crear comprobantes, ítems y cuotas de crédito con vínculos opcionales a cliente, proyecto y preliquidación.
- Guardar serie, correlativo, moneda, tipo de cambio, afectación tributaria, IGV, detracción/retención, estados fiscales y referencias de notas.
- Reservar correlativos en el servidor para evitar duplicados y restringir la gestión a Administrador y Gerente.
- Preparar campos de XML, CDR, hash y respuesta SUNAT para la conexión API posterior, sin simular un envío oficial en esta fase.

## Experiencia de uso
- Renombrar el módulo actual como **Preliquidaciones** y mover el registro de comprobantes al nuevo módulo.
- Añadir creación guiada, ítems dinámicos, unidades SUNAT, contado/crédito y cuotas.
- Precargar cliente, proyecto, partidas, importes y detracción al usar **Facturar** desde una preliquidación aprobada.
- Mostrar tablero de comprobantes con búsqueda, filtros, estados, cobro y depósito de detracción.

## Presentación impresa
- Crear una vista previa y PDF A4 para cada comprobante.
- Reutilizar exactamente la composición visual del encabezado de preliquidación: logotipo, datos de empresa, eslogan, paleta esmeralda/pizarra y caja fiscal derecha.
- Adaptar la caja al tipo de documento: FACTURA ELECTRÓNICA, BOLETA DE VENTA ELECTRÓNICA, NOTA DE CRÉDITO ELECTRÓNICA o NOTA DE DÉBITO ELECTRÓNICA.
- Incluir adquirente, tabla de conceptos, operación gravada/exonerada/inafecta, IGV, total en letras, detracción, cuenta Banco de la Nación, cuotas, QR y hash.
- Marcar claramente los borradores como representación no emitida; solo mostrar datos oficiales de SUNAT cuando hayan sido registrados.

## Integraciones
- Mantener la compatibilidad de las facturas actuales con Tesorería y Flujo de Caja.
- Al emitir desde una preliquidación, dejarla como facturada y enlazada al comprobante.
- Preparar un objeto fiscal estable para conectar después Nubefact, un PSE/OSE o SUNAT sin rehacer las pantallas.

## Verificación
- Probar los cuatro tipos de comprobante, emisión libre y desde preliquidación.
- Verificar correlativos, montos, crédito/cuotas, detracción y permisos por rol.
- Comparar visualmente el encabezado con la vista previa de preliquidación y revisar el PDF A4 completo.
- Confirmar navegación, búsqueda, CxC/Flujo de Caja y ausencia de errores.

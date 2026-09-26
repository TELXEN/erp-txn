# Preliquidación y Facturación (Comercial)

La pantalla "Registro de Ventas" pasa a llamarse **Facturación** y tendrá dos pestañas con botones superiores (mismo estilo que Beneficios Sociales).

## Pestaña 1: Preliquidaciones (borrador de lo que se va a facturar)
- Código automático por obra: `PL-TXN26-P003-001`.
- Datos: obra, cliente, concepto/periodo, fecha, moneda y tipo de cambio.
- Detalle de líneas (descripción, cantidad, P.U., subtotal) o un monto único.
- Cálculo en vivo:
  - Valor neto, IGV 18%, total.
  - Detracción SPOT (4% por defecto, editable) si el total supera S/ 700.
  - Neto a cobrar en banco = total − detracción.
- Condición: Contado o Crédito (15/30/45/60/90 días u otro) con fecha de vencimiento estimada.
- Control contra el saldo disponible de la obra (presupuesto ofertado − ya facturado − preliquidaciones aprobadas).
- Estados: Borrador → Enviada → Aprobada / Observada. Solo se edita en Borrador u Observada.
- Vista imprimible/PDF con membrete de TELXEN SAC y exportación Excel.
- Botón **"Facturar"** en las aprobadas: abre el registro de factura con todos los datos precargados.

## Pestaña 2: Facturas emitidas
- Lo que hoy existe, más:
  - Enlace a la preliquidación de origen.
  - Serie y número SUNAT (emitida en tu facturador externo), IGV y total.
  - Detracción: importe, estado (Pendiente/Depositada), fecha y N° de constancia del Banco de la Nación.
  - Neto a cobrar separado de la detracción.
- Se mantiene la conexión con Tesorería (cuentas por cobrar), Flujo de Caja y Dashboard.
- Facturas antiguas siguen funcionando igual (sin preliquidación).

## Menú
- Comercial: "Registro de Ventas" se renombra **"Facturación"**.

## Detalles técnicos
- Nuevas tablas `preliquidaciones` y `preliquidacion_items` con RLS (Administrador/Gerente), GRANTs y updated_at.
- `ventas`: columnas nuevas `preliquidacion_id`, `igv`, `total`, `pct_detraccion`, `monto_detraccion`, `detraccion_estado`, `detraccion_fecha`, `detraccion_constancia`. `monto_soles` sigue siendo el valor neto para no alterar los cálculos existentes.
- Código PL generado en el cliente a partir del correlativo por obra (no es un código de obra/cotización, no requiere reservarCodigo).
- Ruta sigue siendo `/valorizaciones`; la página se divide en dos componentes por pestaña.

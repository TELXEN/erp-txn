# Tesorería: balance consolidado, cobros por cliente y detracción

## 1. Saldos y multimoneda
- Toda la pantalla en Roboto.
- Recuadro destacado arriba de «Saldos bancarios»: **Balance consolidado en PEN** = saldos PEN + saldos USD × tipo de cambio del día. Debajo: desglose «PEN S/ X · USD US$ Y» y «TC venta 3.xxx (fecha, fuente)».
- Tipo de cambio automático: se toma el último registrado; si no hay del día, se consulta a SUNAT (servicio que ya usa el sistema) y se guarda para el resto del día. Si falla, se muestra el último disponible con aviso; nunca queda en cero sin avisar.
- Tarjetas bancarias: saldo, ingresos (+) y egresos (−) alineados a la derecha con cifras tabulares.

## 2. Cuentas por cobrar
- Las filas plegables se agrupan por **Cliente** (nombre del cliente), nunca por obra/«Oficina». La obra sigue visible como dato secundario de cada factura. Cuentas por pagar mantiene su agrupación actual por proveedor.
- «Equiv. S/»: para facturas en USD se calcula monto × tipo de cambio referencial del día (con nota «TC ref.»); en PEN se muestra igual. KPI y totales usan ese equivalente.

## 3. Registrar cobro
- Modal con datos de la factura en solo lectura: Cliente, Documento, Monto (y equivalente en S/).
- Campos: Cuenta bancaria de destino (solo cuentas activas que no son de detracciones), fecha y N° de operación (obligatorio).
- Checkbox **Aplicar detracción**: porcentaje precargado del documento (o 12% por defecto, editable), cuenta Banco de la Nación preseleccionada (cuenta tipo «Detracciones») y N° de constancia. Vista previa: «Banco de la Nación S/ A · BBVA S/ B», sumando el total.
- Al confirmar: la factura queda Pagada, el saldo del banco comercial sube por el neto y el del Banco de la Nación por la detracción (detracción en soles, redondeada a entero como exige SUNAT).

## Detalles técnicos
- Migración: `ventas.banco_detraccion_id uuid` (FK bancos, nullable). Se reutilizan `pct_detraccion`, `monto_detraccion`, `detraccion_estado` ('Depositada'), `detraccion_fecha`, `detraccion_constancia`.
- Cálculo de saldos en tesoreria.tsx: si la venta tiene banco_detraccion_id, el banco comercial recibe (total − detracción) y el BN la detracción; ventas antiguas sin ese dato se comportan como hoy.
- TC: hook que lee tipo_cambio_diario y, si falta el del día, llama a consultarTipoCambio e inserta la fila.
- Agrupación cxc por `tercero`; modal de cobro amplía `accion` con flags de detracción. Cobro en lote sin detracción (sin cambios).
- Verificar con tsgo y Playwright: balance consolidado, agrupación por cliente, equivalencias USD y cobro con detracción reflejado en ambas cuentas.

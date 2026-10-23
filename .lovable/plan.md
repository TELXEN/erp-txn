# SIRE Ventas: registrar dentro de SIRE, igual que Compras

## Cómo quedará
- En SIRE › Ventas (RVIE) el botón «Emitir» pasa a llamarse «Registrar Ventas». Ya no lleva a Facturación Electrónica ni sale de SIRE.
- Al pulsarlo se abre ahí mismo la ventana «Registrar venta» (la misma de Registro de Ventas), ya llena con los datos de SUNAT: tipo, número, fecha, cliente (buscado por RUC), moneda, tipo de cambio, valor de venta, IGV y vencimiento.
- Si el cliente no está en el catálogo, se avisa para elegirlo antes de guardar.
- Al guardar, la fila queda en verde «Registrado en ERP» sin desaparecer, y la venta aparece también en Registro de Ventas.
- Compras (RCE) no cambia: sigue registrándose dentro de SIRE.
- Se actualizan la nota bajo la tabla y el mensaje del botón.

## Detalles técnicos
- `RegistrarVentaExterna` acepta `inicial?: Partial<Form>` y `onGuardado?()`; al abrir con `inicial` precarga el formulario (cliente resuelto por RUC).
- En `sire.tsx` la rama RVIE del botón abre el modal con la fila; al guardar se invalida la conciliación y se marca la fila como registrada (mismo patrón que `registradas` en Compras).
- Se elimina el prefill de SIRE por `sessionStorage` en `facturacion-electronica.tsx`.
- Verificación: typecheck y Playwright abriendo la ventana desde una fila de Ventas sin guardar datos reales.

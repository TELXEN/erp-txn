# SIRE: registrar (no emitir) en Registro de Ventas y Registro de Compras

## Cómo quedará
**Ventas (RVIE)**
- El botón «Emitir» pasa a llamarse «Registrar». Ya no abre Facturación Electrónica.
- Al pulsarlo se abre **Comercial › Registro de Ventas** con la ventana «Registrar venta» ya llena con los datos de SUNAT: tipo, número, fecha, cliente (se busca por su RUC), moneda, tipo de cambio, valor de venta, IGV y vencimiento.
- Si el cliente no existe en el catálogo, se avisa y se puede elegir o crear antes de guardar.
- Al guardar, la venta aparece en la lista y al volver a SIRE la fila figura como registrada (conciliada).

**Compras (RCE)**
- Nueva página **Registro de Compras** (en Logística/Finanzas, junto a los gastos), igual a Registro de Ventas: tarjetas de resumen, lista de facturas de proveedor registradas y lupa de filtros.
- La ventana de registro es la misma que hoy se usa en SIRE: elegir Costo Directo (obra + partida) o Gasto General, con proveedor, serie, fecha, montos e ítems precargados, y el aviso de sobrecosto.
- El botón «Registrar en Gasto» de SIRE Compras lleva a esa página con la ventana abierta y la factura cargada (descarga su XML antes, si falta).
- También se puede registrar una compra manualmente desde la página.
- En SIRE, las filas registradas siguen apareciendo en verde «Registrado en ERP».

Se actualizan la nota bajo la tabla de Ventas y los mensajes de los botones.

## Detalles técnicos
- SIRE guarda el comprobante en `sessionStorage` (`sire-prefill-venta` / `sire-prefill-compra`) y navega a `/registro-ventas` o `/registro-compras`; la página lo lee una vez en `useEffect`, lo borra y abre la ventana.
- `RegistrarVentaExterna` acepta `inicial?: Partial<Form>`; se elimina el prefill de SIRE en `facturacion-electronica.tsx`.
- Nueva ruta `src/routes/_authenticated/registro-compras.tsx` reutilizando `RegistrarModal`/`useComprobantesCompra`; listado desde `comprobantes_recibidos` registrados. Entrada en el menú de `AppShell.tsx`.
- Se actualiza la regla SIRE en AGENTS.md/memoria (el registro de compras pasa a su propia página; SIRE sigue con descarga y conciliación).
- Verificación: typecheck y Playwright abriendo ambas ventanas desde SIRE sin guardar datos reales.

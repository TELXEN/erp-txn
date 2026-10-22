# Fusionar conciliación RCE y Comprobantes de compra

En SIRE → Compras (RCE) hoy hay dos tablas con las mismas facturas: la conciliación del Paso 2 y la sección «Comprobantes de compra» de abajo. Se juntan en una sola tabla.

## Cómo quedará
- Una sola tabla en el Paso 2 de Compras, con una fila por factura de proveedor.
- Cada fila muestra lo que ya tiene la conciliación: fecha, tipo, serie, RUC/razón social, base, IGV, totales SUNAT/ERP, estado, y los chips azul/ámbar.
- Columnas nuevas: casilla de selección y tres indicadores XML / PDF / CDR (descargado o pendiente; se abre al hacer clic).
- La barra de arriba suma los botones de la sección de abajo: Descargar XML de SUNAT (seleccionadas o todas), Reintentar fallidas, ZIP del período y Registrar en el ERP.
- Las acciones de cada fila (Registrar en Gasto, Vincular) y la ventana de detalle no cambian.
- Se quitan la sección inferior y la nota que apuntaba a ella. Ventas (RVIE) no cambia.

## Detalles técnicos
- La lógica de selección, descarga en lotes de 10, reintento, ZIP y registro pasa de ComprobantesRecibidos a un hook `useComprobantesCompra(periodo, items)`, que reutiliza las mismas funciones del servidor.
- PanelLibro usa el hook cuando libro === "RCE" para pintar la casilla, las columnas XML/PDF/CDR y los botones del lote.
- Se borra el componente ComprobantesRecibidos si ya nadie lo usa, y se actualiza la regla SIRE en AGENTS.md.
- Para verificar: typecheck, tests y Playwright en SIRE → Compras, revisando que haya una sola tabla con las casillas y los botones.

# Mostrar compras por llegar en Almacén

## Qué pasa hoy
Las dos órdenes (OC-TXN26-P001-001 y OC-TXN26-P002-001) están en estado **Emitida** y no tienen ningún movimiento de almacén. El stock solo sube cuando la orden se recibe, así que hoy no aparecen ni en Stock por almacén ni en En tránsito. No es un fallo de los datos: falta mostrar las compras pendientes de llegar.

## Qué cambia
1. En Almacén, la sección **En tránsito** muestra también las compras emitidas o enviadas a obra que aún no llegan, en su propia lista «Compras por recibir»: orden, proveedor, almacén de destino (el de la obra de la orden), insumo, cantidad pendiente e importe.
2. Cada fila tiene **Recibir**, que permite recibir todo o una parte. Siguen las mismas reglas de quién recibe: en obra, solo su encargado; en el Central, Gerente/Dueño o sus encargados.
3. Al recibir, la cantidad entra al stock del almacén con motivo «Compra» y el proveedor como origen. Así se usa el mismo camino que ya existe en Órdenes de Compra.
4. Stock por almacén suma una columna **Por llegar** (cantidad pendiente de compras) aparte del stock real. Así no se infla lo disponible.

## Detalle técnico
- Leer ordenes_compra (Emitida/Enviada) + orden_compra_items, y restar lo ya recibido (movimientos con orden_item_id).
- La recepción reutiliza el RPC recepcionar_orden_obra (ya valida al encargado y crea la deuda en Tesorería). No hay cambios en la base de datos.
- Invalidar las consultas de stock, movimientos y órdenes al recibir.

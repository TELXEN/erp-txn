# Recepción asignada por almacén

## Regla
- **Material que llega a una obra**, desde el Almacén Central o desde un proveedor: lo recibe solo un usuario autorizado de ese almacén de obra, es decir, el ingeniero de campo o el almacenero de la obra.
- **Material que vuelve al Almacén Central**: lo recibe el Gerente/Dueño o un encargado autorizado del Almacén Central.
- Quien no tiene permiso ve la transferencia «En tránsito», pero el botón **Recibir** le aparece desactivado. Al pasar el cursor, el botón dice quién puede recibirla.

## Qué verá el usuario
1. **Almacenes → Encargados**: cada almacén tiene una lista de usuarios autorizados para recibir, elegidos entre los usuarios del ERP. Solo Gerencia la edita. El Gerente/Dueño siempre puede recibir en el Central.
2. **En tránsito**: el botón Recibir se activa solo para los encargados del almacén de destino.
3. **Ingenieros de campo**: ven el Almacén con solo lo de sus almacenes (stock, lo que tienen en tránsito y Consumir). No ven el Central ni otras obras, y no pueden transferir.
4. **Compras directas a obra**: la orden de compra queda «Enviado a obra» y la recepciona el encargado de esa obra. Esa recepción ya existe en Generar Requerimiento → Recepción en obra y ahora usa la misma regla de permiso.
5. Cada recepción guarda quién la recibió y cuándo, y se ve en la lista de Movimientos.

## Detalles técnicos
- Tabla nueva `almacen_encargados (almacen_id, user_id)`, editable por gerente y legible por authenticated. Columnas `recibido_por` y `recibido_en` en movimientos_almacen.
- Función `puede_recibir_almacen(_user, _proyecto)`: para el Central, gerente o encargado; para una obra, encargado de ese almacén. `recibir_transferencia` y `recepcionar_orden_obra` la validan en el servidor, no solo en la pantalla.
- RLS de movimientos_almacen y almacenes: admin/gerente tienen todo; los encargados leen sus almacenes e insertan consumos solo en ellos (sigue el trigger de stock).
- La pantalla calcula `puedeRecibir` con la lista de encargados y desactiva el botón.
- Prueba de la regla: un encargado de obra sí recibe; un ingeniero sin asignar es rechazado; el retorno al Central solo lo recibe gerente o un encargado del Central.

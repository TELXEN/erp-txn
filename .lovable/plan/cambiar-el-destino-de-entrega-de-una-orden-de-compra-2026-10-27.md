# Cambiar el destino de entrega de una orden de compra

## Qué se podrá hacer
En una orden emitida, Gerencia/Administración podrá cambiar **a dónde entrega el proveedor**: al almacén de cualquier obra abierta o al **Almacén Central**.

- Botón «Cambiar destino» (icono de camión) en la barra derecha de Órdenes de Compra y dentro del documento de la orden.
- Ventana con el destino actual, la lista de almacenes activos y un motivo obligatorio (por ejemplo «Era para TXN26-P002»).
- Solo se puede mientras **no se haya recibido nada** de la orden. Si ya hubo una recepción parcial, el material se mueve con «Transferir entre almacenes».
- El cambio queda anotado en las observaciones de la orden (fecha, quién y motivo).

## Dónde se nota
- La orden (lista, documento y PDF) muestra «Entregar en: …» con el nuevo almacén.
- En Almacén → Por recibir, la compra pasa al grupo del nuevo destino. «Recibir» lo pueden pulsar el encargado de ese almacén o, si es el Central, Gerencia y sus encargados.
- Al recibir, el material entra en el almacén elegido.
- La orden sigue ligada al requerimiento y a la obra que la pidió. El costo se carga a la obra solo cuando el material se consume, igual que hoy.

## Corrección incluida
Hoy, si pulsas «Recibir» en Almacén sobre una orden en estado **Emitida**, sale un error, porque el sistema exige que la orden esté primero «Enviada a obra». Se permitirá recibir también las órdenes emitidas.

## Detalle técnico
- Migración: `ordenes_compra.almacen_destino_id uuid NULL` (FK a almacenes). Si es nulo, se usa el almacén de la obra de la orden, así las órdenes actuales no cambian.
- RPC nueva `cambiar_destino_orden(_orden, _almacen, _motivo)` SECURITY DEFINER: solo admin/gerente, sin ingresos registrados, almacén activo y orden no anulada. Añade la nota a la observación.
- `recepcionar_orden_obra`: el destino es el proyecto_id del almacén de destino (null = Central), y se valida con puede_recibir_almacen sobre ese destino. Acepta también el estado «Emitida».
- Almacén → Por recibir y la columna «Por llegar» agrupan por el destino efectivo.
- Test de la regla «destino efectivo» (null → obra de la orden; Central → null).

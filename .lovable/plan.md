# Quitar «Registrar movimiento» del Almacén

## Qué cambia
- Se elimina el panel «Registrar movimiento» de la parte superior de la pantalla de Almacén. La pantalla empieza en «Transferir entre almacenes» y «En tránsito».
- Cada entrada y salida ya tiene su lugar propio, así que el panel ya no hace falta:
  - **Ingresos por compra:** desde Órdenes de Compra, con «Recibir en almacén». Al recibir eliges el almacén (Central u obra).
  - **Saldo inicial:** desde Inventario, como ya funciona.
  - **Traslados:** desde «Transferir entre almacenes», que indica claramente de dónde sale y a dónde va.
  - **Consumo en obra:** botón «Consumir» en cada fila de «Stock por almacén» de una obra. Abre una ventana pequeña con la cantidad (que no puede pasar del stock), el vale y la observación. La fila ya indica de qué almacén sale y a qué obra se carga el material.
- La lista de Movimientos sigue igual, con columna Almacén y el motivo (Compra, Transferencia, Consumo, Saldo inicial).

## Detalles técnicos
- En almacen.tsx se quitan el formulario y el estado `form`. La lógica de vínculo con la OC pasa a Órdenes de Compra (`recibir`), que lleva un selector de almacén destino (por defecto la obra de la OC) y guarda `motivo: "Compra"`.
- El consumo inserta una Salida con `motivo: "Consumo"` y el costo promedio. El trigger `validar_salida_almacen` ya bloquea las salidas sin stock.
- El botón «Consumir» solo aparece en almacenes de obra; el Central solo transfiere.

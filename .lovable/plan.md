# Almacén central y almacenes de obra

## Idea
Hoy cada movimiento se marca con una obra, o se deja sin obra (que cuenta como almacén central). El plan es tener **almacenes de verdad**: uno central (la oficina o depósito de TELXEN) y uno por cada obra. Todos los movimientos se hacen entre almacenes.

```text
Proveedor --OC--> [Almacén Central] --Transferencia--> [Almacén Obra A] --Consumo--> costo de obra A
        \--OC directa a obra-------------------------> [Almacén Obra B] --Devolución--> [Almacén Central]
```

## Qué verá el usuario
1. **Catálogo de almacenes** (Logística → Almacén → pestaña Almacenes): Central (fijo) y uno por obra, que se crea solo al abrir la obra. Cada uno tiene responsable (el almacenero o el ingeniero de la obra), dirección y estado (Activo / Cerrado).
2. **Movimientos** con un tipo claro:
   - Ingreso por OC: al recibir la orden se elige si entra al Central o a la obra.
   - Transferencia Central → Obra: sale con una guía de remisión interna y queda «En tránsito» hasta que la obra la recibe.
   - Consumo en obra: la salida al frente de trabajo, cargada a una partida. Recién aquí se carga el costo de la obra.
   - Devolución Obra → Central: sobrantes al cerrar la obra.
   - Ajuste por inventario físico: con motivo y aprobación de Gerencia.
3. **Stock por almacén**: una tabla con un selector de almacén y la vista consolidada, mostrando cantidad, costo promedio y valor.
4. **Kardex** por insumo y almacén, valorizado a costo promedio.
5. **Requerimientos**: al aprobarse, Logística ve primero lo disponible en el Central y en otras obras. Despacha eso por transferencia y genera la OC solo por lo que falta (ejemplo: piden 2000 m, hay 1000 m, se transfieren 1000 m y se compran 1000 m).
6. **Cierre de obra**: no deja cerrar el almacén de una obra si todavía tiene stock. Obliga a devolver o a dar de baja.

## Fases
1. Crear los almacenes, pasar los movimientos actuales a ellos (sin obra = Central) y mostrar el stock por almacén.
2. Transferencias con estado «En tránsito», recepción en obra y guía interna.
3. Cruce del requerimiento con el stock, y despacho más compra del faltante.
4. Kardex valorizado, ajustes con aprobación y cierre de obra.

## Detalles técnicos
- Tabla nueva `almacenes` (tipo central|obra, proyecto_id único, responsable_id, activo). Se crea una fila Central fija y un trigger agrega un almacén cada vez que se crea una obra.
- `movimientos_almacen`: se agregan `almacen_id` y `almacen_destino_id`, se rellenan desde proyecto_id (null pasa al Central) y `proyecto_id` queda como dato de compatibilidad.
- La transferencia se registra con un RPC atómico que guarda una salida y un ingreso y bloquea si no alcanza el stock (con un trigger, igual que en banco_saldos).
- La vista `stock_almacen` agrupa por almacén e insumo y calcula el costo promedio.
- El costo de la obra sale solo de los consumos, nunca de las transferencias, para no contarlo dos veces. Hay que revisarlo junto con useCostoObras.
- RLS: almacenero/logística ven todo; el ingeniero ve solo los almacenes de sus obras.
- Pruebas: transferencia sin stock rechazada, costo promedio, y despacho más faltante del requerimiento.

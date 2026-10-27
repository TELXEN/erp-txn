# Almacén más limpio y fácil de leer

## Idea
Hoy todo está en una sola pantalla larga: Transferir, En tránsito, Compras por recibir, Stock, Encargados y Movimientos. Se propone separar cada cosa en su lugar y mostrar solo lo necesario.

## Qué cambia
1. **Arriba, cuatro tarjetas de resumen**: Valor en stock, Por recibir (transferencias + compras), Movimientos del mes y Vales del mes. Al hacer clic en una se abre su lista.
2. **Pestañas en lugar de paneles apilados**:
   - **Stock**: solo Almacén, Insumo, Stock y Por llegar. El costo promedio y el valor se ven al abrir la fila.
   - **Por recibir**: transferencias y compras juntas, agrupadas por destino. Cada grupo se puede plegar y muestra un número de pendientes.
   - **Movimientos**: tabla actual. Columnas secundarias (Importe, Partida) visibles solo al pasar o abrir la fila.
   - **Vales de salida**: igual que ahora.
3. **Transferir** y **Encargados** salen de la pantalla y pasan a botones en la barra derecha (abren ventana).
4. **Menos ruido visual**: fechas cortas (27/10), unidades en gris claro, el proveedor como subtítulo pequeño, «—» en lugar de ceros, y botones Recibir/Consumir como icono con texto al pasar el cursor.
5. Las tablas se filtran con el buscador de la barra derecha (lupa), ya existente.

## Sin cambios
Letra, colores, reglas de quién recibe, cálculos y datos.

## Detalle técnico
- Reusar TarjetaResumen, Pestanas, Panel colapsable, BarraIconosHoja, VentanaFlotante y BotonIcono.
- Solo cambios en almacen.tsx (presentación); sin cambios en base de datos.

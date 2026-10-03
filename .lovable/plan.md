# Registrar compra como ventana flotante

## Qué se pide
Al hacer clic en «Registrar compra» (o en «+ Compra» de una partida) debe abrirse una **ventana flotante** (modal) con el formulario de registro de compras, en lugar del panel que hoy se inserta arriba de la tabla y desplaza el contenido.

## Cambios (un solo archivo: `src/routes/_authenticated/gastos-directos.tsx`)

1. **Ventana modal** siguiendo el mismo patrón que ya usan los demás módulos (overlay fijo `fixed inset-0 z-50` con fondo oscurecido, tarjeta centrada con scroll, como en ApuPartida e ImportarExcel):
   - Título «Registrar compra» con botón de cerrar (X) y cierre al hacer clic fuera.
   - Dentro va el formulario actual **sin cambios funcionales**: partida, cant. real, costo real, comprobante, proveedor, rubro, moneda/TC, fecha, condición de pago, cuenta bancaria, N° de operación, botón «Registrar compra» y el total calculado.
2. **Puntos de apertura**: tanto el botón «Registrar compra» del encabezado del panel como el botón «+ Compra» de cada fila abren la ventana; al abrir desde una fila, la partida ya viene seleccionada.
3. Se elimina el panel incrustado y el scroll automático al inicio de página (ya no hace falta).
4. El botón «Registrar compra» del encabezado se mantiene en su lugar actual; solo cambia lo que ocurre al pulsarlo.

## Fuera de alcance
- Sin cambios de base de datos, validaciones ni lógica de guardado: todo se conserva igual.
- El botón no se convierte en botón flotante de esquina; lo que flota es la ventana del formulario.

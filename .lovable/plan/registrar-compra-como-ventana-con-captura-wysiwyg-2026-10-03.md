# Registrar compra como ventana con captura WYSIWYG

## Qué se pide
Al hacer clic en «Registrar compra» (o en «+ Compra» de una partida) se abre una **ventana flotante** (modal) con el formulario de registro. Dentro de la ventana los campos se completan **directamente, estilo WYSIWYG**: inputs ya visibles y editables en línea, sin bloques de formulario con etiquetas pesadas; **Enter registra la compra** y la ventana se cierra.

## Campos y orden (dentro de la ventana)
FECHA · COMPROBANTE · PROVEEDOR · RUBRO · PAGO · CANTIDAD (CANT. REAL (M)) · COSTO REAL

- **PAGO** = condición de pago actual (Contado/Crédito); al elegir Contado se muestran en línea la cuenta bancaria de egreso y el N° de operación; al elegir Crédito, la fecha de vencimiento.
- **PROVEEDOR**, **RUBRO** y **PAGO** siguen siendo listas desplegables, pero integradas a la fila WYSIWYG.
- **CANTIDAD** y **COSTO REAL** mantienen sus etiquetas actuales «CANT. REAL (M)» y «COSTO REAL».
- Se conserva el resumen del total calculado (cantidad × P.U. × TC) y la validación actual.

## Cambios (un solo archivo: `src/routes/_authenticated/gastos-directos.tsx`)

1. **Ventana modal** con el mismo patrón que ya usan los demás módulos (overlay fijo `fixed inset-0 z-50` con fondo oscurecido, tarjeta centrada con scroll, como en ApuPartida e ImportarExcel):
   - Título «Registrar compra», botón de cerrar (X) y cierre al hacer clic fuera.
   - Fila de captura WYSIWYG con los campos en el orden indicado; Enter guarda y cierra.
2. **Partida**: al abrir desde «+ Compra» de una fila, la partida viene seleccionada y se muestra como contexto en la ventana (código + nombre). Al abrir desde el botón «Registrar compra» del encabezado, la partida se elige primero dentro de la ventana (lista desplegable al inicio).
3. Al guardar desde la ventana, la partida queda expandida en la tabla mostrando la compra nueva (comportamiento actual conservado).
4. Se elimina el panel incrustado actual y el scroll automático al inicio de página.

## Fuera de alcance
- Sin cambios de base de datos ni de lógica de guardado: mismas validaciones, misma tabla `gastos_directos`.
- El botón «Registrar compra» del encabezado permanece donde está; solo cambia lo que ocurre al pulsarlo.

# Botón «Registrar compra» flotante

## Objetivo
En Gastos Directos, el botón «Registrar compra» pasa de estar en el encabezado del panel «Control por partida» a un botón flotante siempre visible en la esquina inferior derecha de la pantalla.

## Cambios (solo frontend, `src/routes/_authenticated/gastos-directos.tsx`)

1. **Botón flotante**: añadir un botón fijo (`fixed bottom-6 right-6 z-40`) con el color de acción del tema, icono `Plus` y texto «Registrar compra». Mismo comportamiento actual: llama a `abrirCompra("")` y se deshabilita si no hay proyecto seleccionado.
2. **Quitar el botón del encabezado** de «Control por partida» (queda solo el buscador), para no duplicar el punto de entrada.
3. El formulario de compra se mantiene como está (panel inline que aparece al abrir); el botón flotante se oculta mientras el formulario está abierto para no tapar el botón de envío.
4. En móvil el botón flota igual, con tamaño y etiqueta adaptados.

## Fuera de alcance
Sin cambios de datos, validaciones ni lógica de guardado.

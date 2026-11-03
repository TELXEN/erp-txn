# Vista previa de Gastos Generales sin salir de la ventana

## Problema
Hoy, desde la ventana de Gastos Generales de una cotización, «Generar reporte / Imprimir» te saca a otra pantalla aparte, con dos botones de volver («a la vista previa» y «a la cotización»). Se pierde la ventana en la que estabas y no queda claro cómo regresar.

## Qué cambia
1. **Vista previa dentro de la misma ventana de Gastos Generales**: arriba aparece un conmutador **Edición | Vista previa** (icono y palabra, igual que en otras pantallas). Al elegir Vista previa, la hoja A4 se muestra en el mismo lugar de la tabla; con Edición vuelves a editar al instante. Sin cambiar de página y sin ventanas nuevas.
2. **Barra de la vista previa**: solo dos acciones claras a la derecha: **Imprimir** y **Descargar PDF**. Imprimir usa el diálogo de impresión del navegador e imprime solo la hoja (sin menús ni la ventana).
3. **Hojas A4 centradas sobre fondo gris**, con sombra y separación entre páginas, «Hoja 1 de N» visible, para que se lea como papel.
4. Desde la vista previa de la cotización, el botón «Gastos generales» abre esa misma ventana directamente en modo Vista previa, en vez de llevarte a otra pantalla.
5. La pantalla aparte actual queda solo como respaldo para enlaces antiguos (muestra la misma hoja con un único botón «Volver»).

Los importes, el formato de la hoja y el PDF no cambian: es la misma hoja, solo cambia dónde y cómo se abre.

## Detalles técnicos
- Extraer la hoja de `gg-vista.tsx` a un componente compartido `HojaGastosGenerales` (carga, paginación, `descargar()` con html2pdf), reutilizado por la ventana y por la ruta.
- `GastosGeneralesCotizacion.tsx`: estado local `modo: "edicion" | "vista"` (prop opcional `modoInicial`), reemplaza el `Link` a `/gg-vista` por el conmutador.
- Imprimir: `window.print()` con reglas `@media print` que ocultan todo excepto `#gg-impresion` (sin `window.open`).
- `cotizacion-vista.tsx`: el botón abre la VentanaFlotante de GG con `modoInicial="vista"`.

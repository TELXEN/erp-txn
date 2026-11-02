# Pestañas bajo la cinta en el editor de cotización

## Qué cambia
1. Debajo de la cinta, fuera de ella, aparece una fila de pestañas planas, una al lado de la otra: **Volver · Encabezado · Gastos generales · Vista previa**.
2. Cada pestaña hace lo mismo que su botón actual:
   - Volver: regresa a la lista de cotizaciones.
   - Encabezado: abre la ventana del encabezado.
   - Gastos generales: abre la ventana de gastos generales.
   - Vista previa: abre la vista A4.
3. La pestaña activa lleva debajo una línea fina del color del tema. Mientras está abierta la ventana de Encabezado o de Gastos generales, se marca esa pestaña. Si no hay ninguna ventana abierta, no se marca ninguna (la hoja de la cotización es el estado de reposo).
4. Se quitan de la cinta los botones Volver, Encabezado, Gastos generales y Vista previa A4.
5. Quedan igual en la cinta: el selector de estado (Borrador, Enviada, Aprobada, Rechazada), la vigencia, el selector de revisiones y el botón Convertir en obra.

## Detalle técnico
- Archivo: `src/routes/_authenticated/cotizaciones.tsx`, modo editor (líneas ~668-716).
- Quitar los cuatro `Boton` de `acciones` en `Encabezado`.
- Insertar, justo después de `<Encabezado …/>`, una barra `role="tablist"` con botones de texto, `border-b border-border`, y en el activo `border-b-2 border-primary` (token del tema, sin colores fijos). Vista previa usa `navigate` a `/cotizacion-vista`.
- Estado activo derivado de `encabezado` / `ventanaGG`.

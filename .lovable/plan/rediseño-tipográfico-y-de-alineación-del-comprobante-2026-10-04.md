# Rediseño tipográfico y de alineación del comprobante

## Objetivo
Unificar la factura electrónica en edición, vista A4 y PDF con una tabla más legible, totales discretos y bloques inferiores correctamente alineados, sin alterar cálculos ni el pie fijo por página.

## Cambios
- Redistribuir las columnas de ítems para dar el mayor ancho a **Descripción** y reducir `#`, Código, Unidad, Cantidad y Descuento al mínimo legible.
- Mostrar **Valor unitario** e **Importe total** en dos líneas, centrados en sus cabeceras; conservar los valores numéricos alineados a la derecha.
- Mantener la descripción en peso normal, con ajuste multilínea completo y sin cortes.
- Convertir **Importe total** en una fila del mismo tamaño y ritmo visual que el resto del desglose, sin recuadro, borde especial ni aumento de escala.
- Alinear Cliente y Proyecto a la izquierda, justificar el importe en letras a todo el ancho y asegurar alineación izquierda en Cuentas bancarias y Régimen tributario.
- Replicar exactamente estas reglas en la hoja editable, la vista A4 y el PDF descargable.

## Verificación
- Confirmar que el proyecto compile sin errores.
- Abrir el comprobante actual y revisar visualmente tabla, totales, importe en letras y columnas inferiores.
- Confirmar que el pie completo continúa fijo y sin superposiciones.

# Factura: una sola hoja para editar e imprimir

## Corrección
Hoy la vista previa/impresión y el editor se dibujan por separado, por eso se ven distintos (posiciones, tamaños, recuadros).
- La vista previa y la impresión usarán la misma hoja del editor en modo solo lectura. En ese modo los campos se muestran como texto, sin casillas, flechas ni botones.
- Así, cualquier ajuste futuro del formato aparece igual en ambos lugares.
- El PDF descargado se revisará contra esa misma hoja y se corregirán las diferencias que queden.

## Detalles técnicos
- `HojaComprobante` recibe la prop `soloLectura`. Con ella, inputs, selects y textareas se muestran como texto con la misma caja y tipografía, y se ocultan los botones de agregar o quitar ítems y cuotas.
- `comprobante-vista.tsx` arma el formulario de la hoja desde el comprobante guardado (con el mismo mapeo que usa editarBorrador) y lo renderiza dentro de `#comprobante-impresion`, así el flujo de Imprimir actual se mantiene. Se retira el marcado duplicado de la vista previa.
- Verificación con Playwright: captura del editor y de la vista previa de la misma factura para compararlas, y emulación de impresión.

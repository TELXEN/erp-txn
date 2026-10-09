# Boleta de honorarios en modo WYSIWYG (edición directa sobre la hoja)

## Objetivo
La ventana del detalle de pago por honorarios deja de tener el formulario a la izquierda: toda la ventana muestra la hoja A4 y cada dato se edita directamente sobre la hoja (lo que ves es lo que se imprime).

## Cambios

### 1. Hoja editable (src/components/personal/HojaDetalleHonorario.tsx)
- La hoja acepta un modo `editable` con callbacks de cambio.
- En modo edición, los valores se muestran como campos integrados en la propia hoja, con el mismo tamaño y posición del texto impreso:
  - Datos del trabajador: DNI, apellidos y nombres (selector de prestador), cuenta de depósito, banco, periodo (mes/año) y fecha de emisión.
  - Proyecto: selector en la barra de proyecto.
  - Remuneraciones: cantidades (días laborados, viaje, horas extras, feriados, inducción), costo unitario y saldo del mes anterior.
  - Descuentos: adelantos, devolución de gastos, pagos a cuenta, fondo de pensiones, pérdida de herramientas.
  - Concepto del recibo: área de texto amplia en su cuadro.
  - N° de recibo y lugar de emisión.
- Los campos numéricos usan inputs sin bordes llamativos (subrayado tenue o fondo apenas visible) para que la hoja siga viéndose como documento.
- Totales, retención y neto a pagar se recalculan en tiempo real con la fórmula actual (costo unitario × jornales equivalentes).

### 2. Ventana a una sola columna (src/components/personal/DetallePagoHonorario.tsx)
- Se elimina el formulario lateral y la alternancia vista previa/edición: la hoja ocupa toda la ventana en modo edición (sin escala reducida, tamaño de letra cómodo para llenar datos).
- Barra superior de la ventana con: aviso del tareo (la nota azul de carga automática), botón Guardar y botón Imprimir / Guardar PDF.
- La fuente de datos no cambia: días laborados, viaje, horas extras, feriados e inducción se cargan automáticamente desde el tareo, y DNI, cuenta, banco y jornal desde el registro de personal; la edición directa sobre la hoja solo permite ajustes puntuales.
- Se conserva la validación antes de guardar (bruto > 0, neto ≥ 0, N° de recibo obligatorio).
- La impresión sigue igual: copia de la hoja fuera de la ventana vía portal y CSS de impresión en styles.css (los campos se imprimen como texto plano, sin bordes de input).

### 3. Impresión limpia
- En @media print los inputs de la hoja se renderizan como texto (apariencia de documento, sin cajas ni focos), igual que la copia de impresión actual.

## Verificación
- Compilación sin errores.
- Prueba con Playwright: abrir una boleta, editar valores sobre la hoja, confirmar que los totales cambian en vivo y que la impresión sale completa en una página A4.

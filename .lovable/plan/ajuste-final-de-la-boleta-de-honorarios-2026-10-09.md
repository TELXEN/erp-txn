# Ajuste final de la boleta de honorarios

## Objetivo
Dar más ancho y legibilidad a la tabla de la boleta, proteger todos los datos que provienen del personal y del tareo, y reorganizar la información empresarial y el pie del documento.

## Cambios

### 1. Proporción horizontal y legibilidad
- Mantener la altura compacta actual de impresión y aprovechar mejor el ancho útil de la hoja.
- Reequilibrar las tres columnas principales para dar espacio suficiente a remuneraciones, descuentos y concepto, aumentando la legibilidad de rótulos, cantidades e importes.
- Ajustar anchos internos, tipografía y separaciones para que la tabla no se vea reducida ni amontonada en pantalla o impresión.

### 2. Campos bloqueados y campos editables
- Mostrar como solo lectura todos los valores que vienen del tareo: días laborados, días de viaje, horas extras, feriados e inducción.
- Mostrar también como solo lectura el costo unitario, con el prefijo `S/`, y la retención de cuarta categoría calculada automáticamente.
- Dejar editables únicamente:
  - Adelantos.
  - Devolución de gastos.
  - Pagos a cuenta, eliminando la palabra “Planilla”.
  - Pérdida de herramientas.
  - Otros.
  - Concepto del recibo por honorarios.
- Reutilizar el campo actualmente denominado Fondo de pensiones como “Otros”, para conservar los valores históricos sin agregar ni perder datos.
- Trabajador, proyecto, período, fecha, N° de recibo y demás datos de cabecera quedarán visibles pero bloqueados en esta hoja.

### 3. Datos de la empresa
- Dejar exactamente tres datos:
  - RUC a la izquierda y Razón social a la derecha, en una misma fila.
  - Dirección debajo, ocupando todo el ancho.
- Quitar Rubro de este bloque.

### 4. Pie de la boleta
- Retirar la fecha del bloque superior de Datos del trabajador.
- Mostrar en la parte inferior la fecha completa en letras, conservando el lugar de emisión guardado.
- Añadir debajo del neto el importe a pagar en letras, usando el formato existente de soles y céntimos.
- Conservar las firmas completas y visibles dentro de la altura compacta actual.

## Consistencia de cálculos
- El total de remuneraciones seguirá usando el consolidado del tareo y la fórmula vigente.
- El total de descuentos sumará Adelantos, Devolución de gastos, Pagos a cuenta, Pérdida de herramientas, Otros y la retención automática.
- La generación masiva, actualización automática de boletas pendientes, guardado, reapertura e impresión usarán los mismos nombres y cálculos.

## Verificación
- Abrir una boleta generada desde tareo y confirmar que cantidades, costo unitario y retención no admiten edición.
- Comprobar que solo los cinco descuentos definidos y el concepto pueden modificarse, y que los totales cambian en vivo.
- Verificar en pantalla y PDF que la tabla ocupa mejor el ancho, los tres datos de empresa están en la nueva disposición, y la fecha y el neto en letras aparecen completos sobre las firmas.
- Confirmar compilación sin errores.

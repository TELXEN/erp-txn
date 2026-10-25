# Mejora del formato de Boletas de Pago

## Qué falla hoy (según la hoja actual)
- Junto al logo hay un espacio vacío; la razón social solo aparece más abajo.
- El subtítulo «Quinta categoría» confunde, porque parece hablar del impuesto y no del tipo de trabajador.
- El aporte a la AFP sale en una sola línea; no se ve cuánto es aporte, comisión y seguro.
- No aparecen el periodo exacto (del 01 al 31), la fecha de pago, el número de boleta ni los días no laborados.
- Las tres columnas tienen anchos dispares, y a «Aportes empleador» le sobra espacio.
- Las firmas no tienen nombre ni DNI, y no hay una copia para el trabajador.

## Propuesta
1. **Encabezado**: logo con razón social y RUC al lado; a la derecha, un recuadro con «BOLETA DE PAGO», N° (por ejemplo BP-2026-10-001), periodo «01/10/2026 – 31/10/2026» y fecha de pago. Los colores y la fuente salen del tema de documentos, igual que en las boletas de CTS.
2. **Datos del trabajador** en 3 columnas compactas: nombre, DNI, cargo, régimen, ingreso, CUSPP, AFP/ONP, banco y cuenta, más una fila de **tiempo**: días laborados, días no laborados o faltas, horas extras y días de vacaciones.
3. **Detalle en dos bloques iguales** (Ingresos | Descuentos), con el desglose de la AFP:
   - Aporte obligatorio 10%
   - Comisión sobre flujo
   - Prima de seguro
   - o ONP 13%

   Renta de 5ta muestra al lado «proyección anual S/ …» como sustento.
4. **Aportes del empleador** en una franja aparte bajo el detalle: EsSalud 9% o EPS/SIS con su base de cálculo. No resta del neto.
5. **Resumen final**: tres cifras grandes (Total ingresos − Total descuentos = **Neto a pagar**), el monto en letras y el estado (Validada / Pagada con N° de operación).
6. **Firmas** con nombre y DNI: el empleador (representante legal desde los datos de la empresa) y el trabajador. Debajo, la base legal (D.S. 001-98-TR) y la fecha de emisión.
7. **Impresión**: una opción «Original + copia del trabajador» que imprime dos páginas A4 iguales con la leyenda «Copia trabajador».

La edición sobre la hoja se mantiene igual: los mismos campos editables y las mismas reglas de validación y bloqueo.

## Detalles técnicos
- Solo cambia la presentación en `DetallePagoNomina.tsx` (la Hoja). Se reutiliza el estilo de `HojaCts.tsx` para que todas las boletas se vean iguales.
- El desglose de la AFP se calcula con `useComisionesAfp` del mes y la base de la boleta. Si la suma no coincide con `aporte_pension` guardado, se muestra el importe guardado como total (nunca se reescribe la historia).
- El N° de boleta se arma a partir del periodo y del orden en la planilla. No se guarda nada nuevo en la base de datos.
- La proyección de 5ta se lee de `renta-quinta.ts` cuando la boleta no es manual.

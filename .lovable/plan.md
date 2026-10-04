# Ajustes de cuentas bancarias e ítems del comprobante

## Resultado
- Separar las cuentas bancarias normales en dos grupos claramente titulados: **SOLES** y **DÓLARES**, conservando banco, tipo, número de cuenta y CCI.
- Mantener la cuenta de detracciones separada debajo de **Neto a pagar**, únicamente cuando corresponda.
- Reducir la descripción de cada ítem en 1 punto adicional.
- Permitir que las descripciones extensas ocupen segunda, tercera y más líneas completas, sin recorte ni elipsis.
- Alinear arriba el código, unidad, cantidad, valor unitario, descuento e importe total, junto a la primera línea de la descripción.
- Conservar los campos numéricos alineados a la derecha.

## Alcance
Aplicar el mismo resultado en:
1. Hoja de edición del comprobante.
2. Vista previa A4.
3. PDF descargado, incluidas todas sus páginas.

## Detalles técnicos
- Agrupar las cuentas normales por moneda antes de agruparlas por banco.
- Cambiar la descripción editable a un control multilínea que crezca con el contenido, sin alterar los datos guardados.
- Ajustar las filas para altura variable y alineación vertical superior; en PDF permitir que cada ítem crezca según su descripción sin dividirlo de forma incoherente.
- Mantener el pie fiscal fijo, sus espacios reservados, cálculos, numeración y lógica tributaria actuales.

## Verificación
- Probar una descripción de al menos tres líneas en edición, vista A4 y PDF.
- Confirmar que todas las columnas permanecen alineadas arriba y que los importes siguen a la derecha.
- Confirmar la separación SOLES/DÓLARES y que no aparezcan grupos vacíos.
- Generar un PDF con varias filas y verificar que ningún texto se corte ni invada el pie fijo.

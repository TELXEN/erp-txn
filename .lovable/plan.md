# Reubicar las cuentas bancarias en el pie del comprobante

## Objetivo
Reorganizar el pie fiscal para que la información bancaria quede asociada visualmente a la sección que corresponde, sin alterar cálculos ni datos.

## Cambios
- Debajo de **FORMA DE PAGO** y su condición (Contado/Crédito), mostrar las cuentas bancarias comunes.
- Excluir la cuenta de detracciones de ese bloque general.
- Debajo de **Neto a pagar**, mostrar la **CUENTA DE DETRACCIONES** únicamente cuando el régimen seleccionado sea detracción y exista una cuenta configurada para ello.
- Ajustar tipografía, interlineado y distribución de las cuentas para que entren de forma legible dentro del pie fijo.
- Conservar cuotas, observaciones, QR, hash, monto en letras y numeración de páginas.

## Consistencia
Aplicar exactamente la misma distribución en:
1. La hoja de edición.
2. La vista previa A4.
3. El PDF descargado.

## Verificación
- Revisar comprobantes con pago al contado y a crédito.
- Revisar casos sin régimen, con retención y con detracción.
- Confirmar que la cuenta de detracciones no aparezca en comprobantes sin detracción.
- Generar un PDF de varias páginas y comprobar que el pie siga fijo, completo y sin superposiciones en cada página.

## Detalles técnicos
- Reutilizar la clasificación existente que distingue cuentas bancarias comunes de la cuenta de detracciones.
- Separar la presentación bancaria en dos bloques compactos, manteniendo la fuente global seleccionada.
- Ajustar la altura reservada del pie solo si la validación visual demuestra que es necesario.

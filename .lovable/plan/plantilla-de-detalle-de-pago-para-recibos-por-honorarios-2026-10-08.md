# Plantilla de detalle de pago para recibos por honorarios

## Objetivo
Incorporar en **Recursos Humanos → Recibos por Honorarios** una plantilla editable, guardada e imprimible para cada prestador, basada en el formato entregado y sin mezclarla con las boletas de quinta categoría.

## Cambios
- Ampliar cada recibo con el detalle persistente de remuneraciones y descuentos: días laborados, días de viaje, horas extras, otros, costo unitario, saldo anterior, adelantos, devolución de gastos, pagos a cuenta, fondo de pensiones y pérdida de herramientas.
- Mantener la retención de cuarta categoría vigente como descuento automático según la suspensión del trabajador, evitando alterar el control contable y de Tesorería ya existente.
- Reorganizar el registro de honorarios en una ventana flotante con selector de trabajador y proyecto, número/fecha del recibo, concepto amplio, importes y totales calculados en tiempo real.
- Calcular el total de remuneraciones según el prompt: `días laborados × costo unitario + días de viaje + horas extras + otros`; mostrar el saldo anterior por separado. El neto será remuneraciones menos descuentos, incluida la retención aplicable.
- Crear una hoja A4 de **DETALLE DE PAGO** con logotipo real, datos de TELXEN, datos del trabajador y su cuenta bancaria, período, proyecto, las tres columnas solicitadas, totales, lugar/fecha y firmas de empleador y trabajador.
- Añadir desde cada registro las acciones **Editar detalle**, **Vista previa** e **Imprimir / Guardar como PDF**, conservando el historial para reabrirlo después.
- Mantener el listado, buscador, exportación y registro de pago actuales; actualizar sus importes desde el detalle guardado.

## Datos y seguridad
- Agregar campos opcionales o con valor inicial seguro a `recibos_honorarios`, sin borrar ni invalidar recibos anteriores.
- Agregar un rubro administrable a los datos de empresa para mostrarlo en esta plantilla; los documentos anteriores seguirán funcionando si aún está vacío.
- Conservar el acceso exclusivo de Administración y Gerencia que ya protege los recibos por honorarios.

## Verificación
- Comprobar cálculos, retención con y sin suspensión, guardado y reapertura del detalle.
- Comparar edición, vista previa e impresión A4 con los mismos datos.
- Revisar que el documento use el logotipo, datos empresariales, tipografía configurada y que no haya cortes o superposiciones.
- Confirmar que el listado, pago, exportación y Tesorería sigan usando correctamente el neto guardado.

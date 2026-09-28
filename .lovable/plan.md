# Conectar la impresión de cotizaciones e insertar el logotipo

## Resultado
La vista previa comercial mostrará la cotización real seleccionada, incluido su código, cliente, partidas, importes y condiciones. El encabezado usará el logotipo y los datos guardados en **Datos de la empresa**.

## Cambios
- Abrir la vista previa desde la fila de la cotización elegida, pasando su identificador de forma segura en la dirección.
- Reemplazar los datos de demostración de la impresión por la cotización real y sus partidas.
- Cargar razón social, RUC, dirección, teléfono y logotipo desde la configuración de empresa.
- Mostrar un monograma de respaldo solo cuando no exista un logotipo cargado.
- Mantener las descargas PDF y Excel, ahora usando exactamente la cotización visualizada.
- Añadir estados claros mientras carga o si la cotización no existe.

## Verificación
- Abrir **TXN26-C006** desde Cotizaciones y comprobar que su código, cliente y partidas coincidan.
- Confirmar visualmente que el logotipo aparezca en la hoja y también en el PDF descargado.
- Confirmar que Excel se genere con las partidas y totales de TXN26-C006.

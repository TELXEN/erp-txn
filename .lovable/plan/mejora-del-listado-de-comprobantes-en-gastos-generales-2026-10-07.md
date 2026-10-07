# Mejora del listado de comprobantes en Gastos Generales

## Objetivo
Hacer más clara y consistente la tabla de Gastos Generales, reforzar la calidad de la glosa y facilitar la apertura de sustentos PDF/XML, usando Roboto en toda la vista.

## Cambios de interfaz
- Aplicar tipografía Roboto al contenido completo de Gastos Generales, incluidos resumen, filtros, tabla y ventana de registro.
- Reemplazar el guion de comprobantes sin numeración formal por una etiqueta gris compacta **“Sustento Simple”**; los números registrados seguirán mostrándose como texto normal.
- En **Estado**, conservar la etiqueta compacta de pago y mostrar debajo, cuando exista información, `Banco o medio | Moneda` (por ejemplo, `BCP | PEN`).
- Cambiar el texto secundario del detalle al formato `Centro: [obra u Oficina Central] | Prov: [proveedor]`, con contraste y truncado legibles.
- Añadir en **Acciones** un botón secundario con icono de adjunto. Estará activo únicamente cuando el gasto tenga un PDF o XML vinculado desde Comprobantes Recibidos; abrirá primero el PDF y, si no existe, el XML mediante un enlace temporal seguro. Sin archivo, se mostrará deshabilitado con una ayuda breve.
- Mantener los subtotales de las categorías colapsables en una zona de ancho estable, con cifras tabulares y alineación estricta a la derecha.

## Validación de “Detalle / Glosa”
- Renombrar visualmente el campo del formulario a **“Detalle / Glosa”** y mantenerlo obligatorio.
- Validar al registrar y editar: quitar espacios exteriores, exigir una longitud útil mínima y rechazar contenido formado por la repetición de un solo carácter, como `aaaaaa` o `111111`.
- Mostrar el motivo del rechazo junto al formulario o la fila de edición, sin enviar datos inválidos.
- Repetir la misma regla en la base de datos para impedir que otros flujos graben glosas vacías o repetitivas. La regla se aplicará a registros nuevos y modificaciones sin alterar automáticamente los registros históricos existentes.

## Integración de datos
- Consultar los comprobantes recibidos vinculados por `registro_id` y `registrado_en = gasto_general` para determinar si cada fila tiene PDF o XML.
- Ampliar únicamente los tipos locales necesarios para estado, moneda y adjuntos; no se crearán columnas nuevas ni otro contenedor de archivos.

## Verificación
- Comprobar registro y edición con glosa válida, vacía y repetitiva.
- Verificar filas con comprobante formal y sin número, estado pagado con banco/moneda y presentación del proveedor/centro.
- Probar el botón de adjunto activo e inactivo, la apertura segura de PDF/XML y la alineación de subtotales con categorías abiertas y cerradas.
- Revisar la vista autenticada en escritorio y móvil, además de compilación y errores de ejecución.

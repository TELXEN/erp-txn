# Unificar la tipografía del ERP y sus exportaciones

## Resultado
- La letra guardada en **Configuración del Sistema → Tipografía de documentos** se aplicará a todo el ERP y a los documentos exportados.
- Incluirá títulos, menús, formularios, códigos, importes y tablas técnicas, según lo confirmado.
- Se conservarán los tamaños, pesos, colores, márgenes y demás formato actual. No se cambiarán las reglas de mayúsculas ni el corrector ortográfico.

## Cambios
1. Aplicar la selección guardada en las pantallas, eliminando las imposiciones de Roboto y la excepción de letra monoespaciada.
2. Conectar las hojas de edición, vistas previas e impresión a la misma selección, incluidas cotizaciones, comprobantes, preliquidaciones y boletas.
3. Hacer que PDF y Excel reciban la fuente seleccionada, sin sustituirla silenciosamente por una fuente genérica en los reportes.
4. Mantener la actualización al guardar y la selección al volver a ingresar, sin modificar permisos ni datos comerciales.

## Detalles técnicos
- Reutilizar `configuracion_documentos` y el catálogo local como única fuente de verdad.
- `AppShell` actualmente aplica Roboto aunque lee la configuración; hay reglas CSS y constantes documentales que también fijan esa fuente. Se reemplazarán por la selección activa.
- Unificar las familias generales y técnicas mediante las variables compartidas, sin modificar sus tamaños ni estilos numéricos.
- Los reportes de jsPDF actualmente traducen las alternativas a Helvetica o Times; se incorporará la fuente local correspondiente para conservar la elección en el archivo.
- Mantener las equivalencias locales del catálogo de forma consistente entre pantalla y PDF; Excel conservará el nombre de familia configurado, cuya visualización depende de las fuentes instaladas al abrirlo.

## Verificación
- Probar las siete opciones y comprobar guardado, actualización inmediata y persistencia.
- Comparar los tamaños antes y después en navegación, tablas, formularios y documentos.
- Descargar PDF y Excel desde los flujos reales y comprobar la familia utilizada, códigos e importes incluidos.
- Revisar visualmente los PDF y las vistas previas para detectar recortes o solapamientos debidos al cambio de letra, sin reducir tamaños.
- Comprobar que las pantallas y exportaciones no produzcan errores.
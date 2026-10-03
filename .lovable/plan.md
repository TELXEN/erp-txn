# Tipografía global y exportaciones del ERP

## Resultado
- La opción guardada en **Tipografía de documentos** será la fuente general de todas las pantallas del ERP.
- El cambio se aplicará al guardar y permanecerá activo al volver a ingresar.
- Se conservará la tipografía monoespaciada actual en códigos, cifras y tablas técnicas para mantener su alineación.
- No se modificarán tamaños, pesos, colores, márgenes ni jerarquías existentes.

## Interfaz y estado global
- Usar la configuración existente como única fuente de verdad y exponer la fuente activa desde un proveedor global.
- Inyectar la familia elegida mediante una variable CSS en la raíz de la aplicación, con **Carlito** como respaldo mientras carga la configuración.
- Hacer que el panel mantenga el check de la tarjeta seleccionada y que, después de guardar, toda la interfaz se actualice sin recargar la página.
- Garantizar localmente las siete familias disponibles: Calibri/Carlito, Arial, Times New Roman, Source Sans 3, Segoe UI, Roboto y Helvetica Neue.

## Documentos e impresión
- Mantener conectados los PDF nativos que ya reciben la fuente configurada: comprobantes, preliquidaciones y reportes numéricos.
- Sustituir las fuentes fijas de las hojas de edición y vista previa de cotizaciones, facturación y cuentas bancarias por la fuente activa.
- Confirmar que cotizaciones, APU, dashboards, nómina y comprobantes hereden la misma tipografía tanto en pantalla como al descargar o imprimir.
- Retirar las plantillas PDF antiguas sin uso que conservan Helvetica fija, evitando que una ruta futura reactive una tipografía inconsistente.

## Archivos Excel
- Actualizar el generador compartido para que cada hoja exportada aplique la fuente seleccionada a todas sus celdas.
- Adaptar las exportaciones de cotizaciones que construyen libros con formato propio para usar la misma familia.
- Traducir las alternativas compatibles a nombres reconocidos por Excel, manteniendo los tamaños, negritas, formatos numéricos y fórmulas actuales.

## Detalles técnicos
- La fuente general se aplicará con `--font-global`; `--font-mono` permanecerá intacta.
- Las fuentes PDF seguirán usando el catálogo local y sus familias embebidas, sin depender de descargas externas.
- El generador Excel compartido pasará a una ruta con soporte de estilos para poder definir la familia tipográfica de forma real.
- No habrá cambios en datos, permisos, cálculos ni lógica comercial.

## Verificación
- Probar las siete opciones y confirmar check, guardado, persistencia y actualización inmediata en varias pantallas.
- Revisar una cotización, un comprobante, una preliquidación, un APU, ambos dashboards y una boleta de pago en vista previa y archivo final.
- Generar Excel desde el flujo compartido y desde cotizaciones, abrirlos y comprobar la fuente en todas las hojas sin errores ni pérdida de formatos.
- Verificar visualmente escritorio y móvil, y confirmar que la compilación y las pruebas de tipos queden limpias.

# Extender la franja negra completa de TELXEN Obsidiana

## Cambio

- Integrar el bloque del logotipo **ERP TELXEN SAC** en la columna negra, desde el borde superior de la página.
- Mantener a la derecha, sobre fondo claro, los datos del usuario y el botón **Cerrar Sesión**.
- Hacer que el bloque formado por el menú y el contenido ocupe como mínimo toda la altura de la página.
- Estirar el fondo del menú lateral hasta el final real de la página, incluso cuando el contenido de la pantalla sea más alto que la ventana.
- Mantener sin cambios el ancho del menú, sus opciones y el área de trabajo.
- Aplicar el ajuste estructural a todos los temas; visualmente solo TELXEN Obsidiana mostrará la franja negra continua porque cada tema conservará sus propios colores.

## Verificación

- Revisar una pantalla corta y otra con contenido largo en escritorio, confirmando que la franja negra empiece arriba, incluya ERP TELXEN SAC y no deje un tramo claro debajo.
- Revisar la vista móvil para asegurar que el menú y el contenido continúen apilándose correctamente.
- Confirmar que la aplicación compile sin errores.

## Detalle técnico

Se reorganizará `AppShell` como una columna lateral continua: identidad de TELXEN arriba y navegación debajo. El bloque de sesión permanecerá en el encabezado claro del área de trabajo. La columna lateral se estirará con toda la altura del contenido.

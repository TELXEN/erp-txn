# Extender la franja negra de TELXEN Obsidiana

## Cambio

- Hacer que el bloque formado por el menú y el contenido ocupe como mínimo toda la altura disponible debajo del encabezado.
- Estirar el fondo del menú lateral hasta el final real de la página, incluso cuando el contenido de la pantalla sea más alto que la ventana.
- Mantener sin cambios el ancho del menú, sus opciones, el encabezado y el área de trabajo.
- Aplicar el ajuste estructural a todos los temas; visualmente solo TELXEN Obsidiana mostrará la franja negra continua porque cada tema conservará sus propios colores.

## Verificación

- Revisar una pantalla corta y otra con contenido largo en escritorio, confirmando que no quede un tramo claro debajo del menú.
- Revisar la vista móvil para asegurar que el menú y el contenido continúen apilándose correctamente.
- Confirmar que la aplicación compile sin errores.

## Detalle técnico

Se ajustará el contenedor principal y el menú lateral en `AppShell` para compartir una altura mínima basada en la ventana y para que la columna lateral se estire con toda la altura del contenido.

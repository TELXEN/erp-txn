# Limpieza de la cinta (ribbon)

## Problemas observados (capturas en APU y Parámetros Generales, ancho 1378 px)
- El nombre de la pantalla sale dos veces: a la izquierda (con subtítulo cortado con "...") y como pestaña al final ("Análisis de Precios Unitarios (APU" cortado).
- Cuando el título es largo, la pestaña de la pantalla empuja y choca con el bloque de usuario.
- Nombre del usuario y "Cerrar Sesión" se parten en dos líneas.
- En pantallas sin botones propios (APU) aparece una franja vacía debajo de las pestañas.

## Cambios
1. Fila superior en tres zonas fijas: logo | pestañas (ocupan el espacio libre, se desplazan sin barra visible si no caben) | zona derecha que nunca se encoge (usuario, pantalla completa, contraer, Diseño).
2. Quitar el título/subtítulo duplicado de la izquierda; el nombre de la pantalla queda solo en su pestaña, con nombre corto (sin el texto entre paréntesis) y el título completo al pasar el mouse.
3. Bloque de usuario compacto en una sola línea: círculo con iniciales + nombre y rol truncados; "Cerrar Sesión" como botón de una línea (solo icono en pantallas angostas, con texto al pasar el mouse).
4. Si la pantalla no tiene botones, la pestaña de la pantalla no aparece y la cinta muestra el módulo normal, sin franja vacía.
5. Fila de iconos: alturas uniformes, separadores de grupo alineados y títulos de grupo sin cortarse.

## Detalles técnicos
- CintaOpciones.tsx: nav `flex-1 min-w-0` con scrollbar oculto; contenedor derecho `shrink-0`; pestaña contextual `max-w` + truncate + title; eliminar bloque `contextual` izquierdo.
- La ranura contextual se observa (MutationObserver) para saber si tiene hijos; si está vacía se oculta la pestaña CTX.
- AppShell.tsx: bloque usuario con `whitespace-nowrap truncate`, botón Cerrar Sesión con icono LogOut.
- Verificar con capturas en clásica y simplificada a 1378 px y 1280 px, en APU, Parámetros Generales y Boletas de Pago.

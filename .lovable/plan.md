# Tema «TELXEN Obsidiana» para el menú lateral

## Objetivo
Agregar un tema seleccionable con el menú izquierdo negro, textos blancos y acento amarillo TELXEN, manteniendo sin cambios el área de trabajo clara y la estructura actual del sistema.

## Diseño propuesto
- Fondo negro carbón en todo el menú izquierdo.
- Categorías en gris claro para distinguir la jerarquía sin competir con las opciones.
- Opciones inactivas en blanco suave; al pasar el cursor tendrán un fondo gris oscuro y el icono ganará contraste.
- Opción activa en amarillo TELXEN con texto negro, para reconocer inmediatamente la ubicación actual.
- Líneas divisorias discretas entre grupos y panel de rol integrado en negro elevado, con borde gris oscuro.
- Encabezado superior y todas las pantallas internas conservarán su apariencia clara actual.
- Transiciones breves en apertura de grupos, selección y estados del cursor, respetando la preferencia de movimiento reducido del dispositivo.

## Experiencia de usuario
- Mayor contraste para leer el menú rápidamente durante jornadas largas.
- Jerarquía visual más clara entre categoría, módulo activo y opciones secundarias.
- El grupo que contiene la pantalla actual seguirá abierto automáticamente.
- Se conservarán exactamente los permisos, nombres, iconos, orden y comportamiento de navegación existentes.

## Configuración
- Añadir «TELXEN Obsidiana» como una opción adicional en Configuración del Sistema › Tema de colores.
- No reemplazar ni modificar los seis temas existentes.
- Guardar la selección como se hace actualmente para que permanezca al volver a entrar.

## Detalles técnicos
- Separar los colores semánticos del menú lateral de los colores generales, porque actualmente encabezado y menú comparten las mismas variables.
- Incorporar variables específicas para fondo, texto, texto secundario, borde, estado activo y estado al pasar el cursor del menú.
- Adaptar únicamente el menú y su panel de rol para consumir esas variables.
- Actualizar la muestra del nuevo tema en el selector de configuración.

## Verificación
- Comprobar contraste, selección activa, apertura de categorías y panel de rol.
- Revisar el resultado en escritorio y en el ancho móvil actual.
- Confirmar que cambiar entre «TELXEN Obsidiana» y los temas anteriores restaura correctamente todos los colores.
- Verificar que el área de trabajo, tablas, formularios y documentos no cambien.

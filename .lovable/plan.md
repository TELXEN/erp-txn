# Presentación elegante de las pestañas Cotizaciones / Plantillas

## Objetivo
Mejorar la navegación superior de la pantalla Cotizaciones: reemplazar las pestañas subrayadas por botones elegantes tipo «píldora» y quitar el número de plantillas del rótulo.

## Cambios
1. **Pestañas principales (Cotizaciones / Plantillas)**
   - Sustituir el subrayado por un grupo de botones segmentado (fondo suave, contenedor con borde redondeado):
     - Pestaña activa: fondo sólido con el color principal del sistema y texto claro.
     - Pestaña inactiva: fondo de tarjeta, texto atenuado, resalte al pasar el cursor.
   - Rótulos sin conteos: «Cotizaciones» y «Plantillas» (se elimina «(n)»).
2. **Panel de Plantillas**
   - Ajustar el encabezado del panel para que combine con el nuevo estilo (título y acciones alineadas), sin cambiar sus funciones.
3. **Coherencia visual**
   - Mantener el mismo estilo de pestañas de filtro por estado del listado (Todas / Borrador / …) para que toda la pantalla se vea uniforme.
   - Usar únicamente tokens semánticos del tema (primary, card, line, muted-foreground); sin colores fijos.

## Sin cambios
- Funciones existentes: crear cotización, selector de plantilla al crear, filtros, buscador, listar, editar, duplicar, eliminar, y las acciones de plantillas (crear, editar, duplicar, eliminar).
- Base de datos, permisos y comportamiento de guardado.

## Verificación
- Revisar en pantalla ambas pestañas: cambio de sección sin recargar, aspecto de botones y contraste.
- Confirmar que el listado, los filtros por estado y el panel de plantillas siguen operando.
- Comprobar que la compilación queda sin errores.

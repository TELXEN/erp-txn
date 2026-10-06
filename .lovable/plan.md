# Plantillas como pestaña propia en Cotizaciones

## Objetivo
Separar la gestión de plantillas del listado principal para que **Cotizaciones** y **Plantillas** tengan espacios claramente diferenciados dentro de la misma pantalla.

## Cambios
1. Añadir una navegación principal con dos pestañas: **Cotizaciones** y **Plantillas**.
2. Mantener en **Cotizaciones** el encabezado, la selección de plantilla para crear una nueva cotización, indicadores, filtros por estado, buscador y listado actual.
3. Mover el panel **Plantillas por tipo de obra** a la pestaña **Plantillas** y retirarlo del listado de cotizaciones.
4. Mostrar el contenido de plantillas abierto directamente en su pestaña, sin el control «Ver/Ocultar».
5. Conservar sin cambios las acciones actuales: crear, editar en línea, duplicar y eliminar plantillas, así como su almacenamiento y uso al crear una cotización.
6. Mantener los permisos actuales de acceso para Administrador y Gerente.

## Verificación
- Confirmar que ambas pestañas cambian de contenido sin recargar la página.
- Confirmar que el listado y sus filtros siguen funcionando en **Cotizaciones**.
- Confirmar que las plantillas se muestran completas y que crear, editar, duplicar y eliminar siguen funcionando.
- Confirmar que una plantilla guardada continúa disponible en el selector de **Nueva cotización**.
- Revisar la distribución en escritorio y ancho reducido, sin errores de compilación ni ejecución.

## Detalles técnicos
- Ajustar el estado de navegación en la pantalla de Cotizaciones para separar la vista principal del filtro por estados.
- Adaptar el componente de plantillas para admitir una presentación siempre abierta cuando se usa como pestaña.
- No se requieren cambios en la base de datos ni en la estructura de las plantillas.

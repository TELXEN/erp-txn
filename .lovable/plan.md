# Unificar la navegación de módulos con el estilo de APU

## Objetivo
Aplicar el patrón visual y jerárquico de **Análisis de Precios Unitarios**: botones principales con ícono y estado activo sólido, seguidos por pestañas secundarias subrayadas cuando el módulo tenga varias vistas relacionadas.

## Cambios por pantalla

### Facturación Electrónica
- Organizar las vistas actuales en botones principales: **Comprobantes emitidos**, **Operaciones especiales** y **Compras recibidas**.
- Mostrar como pestañas secundarias los tipos que ya existen: Facturas, Boletas, Notas de crédito/débito, Retenciones, Percepciones, Bajas y Recibidos.
- Mantener sin cambios la creación, edición, filtros, permisos y el tratamiento independiente de Guías de Remisión.

### Cotizaciones
- Reemplazar los botones segmentados actuales por botones principales **Cotizaciones** y **Plantillas**, con íconos y el mismo acabado de APU.
- Mostrar debajo, dentro de Cotizaciones, las pestañas secundarias de estado ya existentes.
- Conservar la selección de plantilla, creación, listado, búsqueda, permisos y acciones actuales.

### Partidas
- Crear el grupo principal **Gestión de partidas** y ubicar debajo **Listado y estructura** y **Nueva partida** como pestañas secundarias.
- Quitar la cantidad entre paréntesis de **Listado y estructura** y el signo «+» del nombre **Nueva partida**.
- Mantener los controles Tabla/Kanban y las acciones de importación/exportación.

### Avance físico
- Presentar **Avance real** y **Avance programado** con el mismo lenguaje visual de botones de APU, sin alterar el registro de porcentajes ni el cronograma.

### Vehículos
- Agrupar las vistas existentes en botones principales: **Flota**, **Operaciones** y **Mantenimiento**.
- Distribuir las pestañas secundarias actuales: Flota/Resumen, Tareo vehicular/Traslados y Mantenimiento.
- Conservar formularios, alertas, permisos y cálculos actuales.

### Gastos Generales
- Agrupar las vistas en **Gastos indirectos** y **Flota**.
- Mostrar como pestañas secundarias **Gastos generales**, **Mantenimiento** y **Combustible**.
- Quitar las cantidades entre paréntesis de los tres nombres; los totales seguirán visibles dentro del contenido.

### SIRE
- Crear botones principales **Registros** y **Configuración**.
- Ubicar debajo **Ventas (RVIE)**, **Compras (RCE)** y **API SOL**, respetando que Configuración solo aparece para Gerencia.
- Mantener el período único, la sincronización global y los estados actuales.

## Criterios visuales y técnicos
- Reutilizar el componente de botón existente y los colores semánticos del tema.
- Estado principal activo: botón sólido; inactivo: botón con contorno.
- Estado secundario activo: subrayado de acento y fondo tenue; inactivo: texto discreto con respuesta al pasar el cursor.
- Mantener adaptación a pantallas estrechas mediante ajuste en varias líneas o desplazamiento horizontal cuando sea necesario.
- No modificar datos, cálculos, permisos, guardado, rutas ni funciones de negocio.

## Verificación
- Comprobar cada cambio de vista en Facturación Electrónica, Cotizaciones, Partidas, Avance físico, Vehículos, Gastos Generales y SIRE.
- Confirmar que las vistas restringidas por rol continúan ocultas correctamente.
- Revisar que no aparezcan cantidades en los nombres solicitados y que la aplicación compile sin errores.

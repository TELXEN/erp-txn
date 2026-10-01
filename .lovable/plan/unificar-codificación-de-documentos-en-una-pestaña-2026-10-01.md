# Unificar codificación de documentos en una pestaña

## Objetivo
En **Datos › Codificación**, reemplazar las tres pestañas separadas ("Codificación de proyectos", "Codificación de cotizaciones", "Codificación de preliquidaciones") por una única pestaña **"Codificación de Documentos"** que muestre las tres reglas juntas en una sola vista.

## Cambios (solo en `src/routes/_authenticated/datos.tsx`)

1. **Tipo `Pestana`**: eliminar `"codificacioncot"` y `"codificacionpreliq"`; la pestaña unificada queda como `"codificacion"`.

2. **`GRUPOS_CONFIG`, grupo "Codificación"**: los items pasan a:
   - `["codificacion", "Codificación de Documentos"]`
   - `["codificacionins", "Codificación de insumos"]` (sin cambios)
   - `["configuracion", "Parámetros de proyectos"]` (sin cambios)

3. **Renderizado de la pestaña unificada**: cuando `pestana === "codificacion"`, renderizar en columna los tres componentes existentes, cada uno con un subtítulo separador:
   - `CodificacionProyectos` (Codificación de proyectos)
   - `CodificacionCotizaciones` (Codificación de cotizaciones)
   - `CodificacionPreliquidaciones` (Codificación de preliquidaciones)

   Se eliminan las ramas de `codificacioncot` y `codificacionpreliq` del condicional.

## Lo que NO cambia
- Los componentes `CodificacionProyectos`, `CodificacionCotizaciones` y `CodificacionPreliquidaciones` no se modifican: siguen guardando en sus tablas respectivas (`codificacion_config`, `codificacion_cotizacion`, `codificacion_preliquidacion`) con sus formularios y validaciones actuales.
- No hay cambios de base de datos.

## Verificación
- Typecheck y build limpios.
- En el navegador: la pestaña **Codificación de Documentos** muestra los tres formularios apilados y guarda correctamente en cada uno.

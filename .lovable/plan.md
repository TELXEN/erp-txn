# Colores por nivel en la hoja de cotización

Asignar un color distintivo a cada nivel jerárquico de la hoja de cotización en modo edición: **especialidad**, **grupo** y **categoría**. Colores visibles pero sobrios (fondos pastel suaves con una franja de acento), un color por nivel — iguales para todos los elementos de ese nivel. La vista previa A4, la impresión y el PDF siguen en blanco y negro, como ya está establecido.

## Cambios (src/components/CotizacionHoja.tsx)

1. **Paleta de niveles** (tonos ya usados en el ERP, `Tono { fondo, borde }`):
   - Especialidad (fila «cap», hoy `bg-muted/50`): azul suave — fondo `#D5DFF8`, franja `#A3B6EA`.
   - Grupo (fila «grp»): verde suave — fondo `#CFEEDC`, franja `#8FCFAC`.
   - Categoría (fila «sub», hoy `bg-muted/25`): ámbar suave — fondo `#FBE1C4`, franja `#EFB673`.
2. **Aplicación en las filas de agrupación**: el `<tr>` de cada nivel recibe el fondo pastel y una franja izquierda de 3 px con su color (solo en la celda del código/nombre para no ensuciar la tabla); el texto sigue en `text-ink` actual, sin cambiar tipografías ni alturas de fila.
3. **Sin cambios** en: partidas y subpartidas (filas de datos), totales, desglose, ayuda de atajos, contexto de clic derecho, ni en la ruta de vista previa `/cotizacion-vista` (ya monocroma).

## Verificación

- tsgo y build OK.
- Playwright sobre una cotización: captura de la hoja confirmando las tres franjas de color distinguibles (azul especialidad, verde grupo, ámbar categoría), texto legible y sin desbordes; vista previa A4 sigue monocroma. Sin errores de consola.

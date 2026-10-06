# Editor de cotizaciones: completar la especificación APU del documento

El documento describe un editor que el ERP ya tiene en gran parte. No se crea un editor nuevo: se mejora la hoja de cotización actual para cubrir lo que falta.

## Lo que ya existe (sin cambios)
- Selección Multidisciplinaria / Una disciplina y alcance Suministro / Montaje (niveles Especialidad > Categoría > Partida o Grupo > Sistema > Partida).
- Niveles colapsables, códigos WBS automáticos de solo lectura.
- Autocompletado de Descripción desde el banco de partidas, que trae unidad y precio.
- Navegación con flechas, Tab, Enter, Escape, F2 e Insert.
- Totales por fila, subtotales y Costo Directo en vivo; Convertir en obra, Excel y vista previa A4.
- Códigos de insumos de 8 dígitos con primer dígito por tipo.

## Lo que se añade
1. **Salto a Cantidad**: al elegir una partida del autocompletado, el cursor pasa directo a la celda Cantidad.
2. **Tab al final de la fila**: en la última celda de la última partida de una categoría, Tab crea una partida vacía debajo, en la misma categoría, y enfoca su Descripción.
3. **Candado en lugar de borrar**: especialidades, grupos y categorías con partidas dentro, y partidas con APU propio, muestran un candado con aviso ("Tiene partidas/APU asociado") en vez de la papelera.
4. **Barra de totales fija**: franja al pie de la hoja siempre visible con subtotal por grupo (Suministro / Montaje) o por especialidad, Costo Directo y Total con IGV, en la moneda de la cotización.
5. **Jerarquía visual**: nivel 1 en mayúsculas con fondo gris suave a todo el ancho; nivel 2 en negrita con sangría; partidas con números alineados y guías verticales sutiles. Se usan los colores del tema actual (sin colores fijos nuevos).

## Detalles técnicos
- `src/components/CotizacionHoja.tsx`: en `onElegir` del autocompletado fijar `activo` a la columna `cantidad`; en `alPresionar`/`editor` detectar Tab en la última columna editable de la última partida del grupo y llamar a `insertarFila`; reemplazar `Trash2` por `Lock` (lucide) con `title` según dependencias (hijos en `arbol`, `conApu.has(id)`); añadir pie `sticky bottom-0` usando los subtotales ya calculados; ajustes de clases por nivel.
- Sin cambios de base de datos ni en vista previa/PDF.
- Verificación: tsgo + Playwright editando una cotización (autocompletar, Tab que agrega fila, candado visible, totales actualizándose).

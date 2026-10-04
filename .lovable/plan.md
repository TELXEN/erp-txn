# Armonizar tamaños de letra de la cotización

## Problema

Tras varias reducciones puntuales, la hoja de cotización quedó con tamaños desproporcionados: la vista de impresión mezcla textos de 6.5pt (partidas, proyecto) con otros de 11pt (desglose de costos) y 10.5pt (términos), mientras la edición usa tamaños mucho mayores (10.3–16px). El resultado se ve desordenado: unos textos muy chicos y otros muy grandes.

## Solución: una escala tipográfica única

Definir una escala de 5 niveles, aplicada igual en edición, vista previa y PDF:

| Nivel | Uso | Impresión/PDF | Edición |
|---|---|---|---|
| Título | Razón social, «COTIZACIÓN», código | 11–13pt | 15–16px |
| Subtítulo | RUC, datos de empresa, secciones («Datos del cliente», «Emisión y contacto», «Proyecto») | 8pt | 11px |
| Cuerpo | Datos de cliente/contacto, partidas, términos y condiciones | 8pt | 10.5px |
| Secundario | Cabecera de tabla, metadatos, pie de página | 7pt | 9.5px |
| Totales | Desglose de costos y TOTAL | 8.5pt / 9.5pt (TOTAL) | 12px / 13px |

## Cambios concretos

1. **Vista de impresión / PDF** (`src/routes/_authenticated/cotizacion-vista.tsx`):
   - Datos de cliente, emisión y contacto: 7pt → 8pt.
   - Bloque Proyecto: 6.5pt → 8pt; etiqueta «Proyecto» 8pt (sin cambio).
   - Partidas: items 6.5pt → 8pt, grupos 7pt → 8pt; cabecera de tabla 7.5pt → 7pt.
   - Desglose de costos: 11pt → 8.5pt; barra TOTAL 9pt → 9.5pt; equivalente en soles 7.5pt → 7.5pt (sin cambio).
   - Términos y condiciones: 10.5pt → 8pt; su título 10pt → 8pt.
   - Datos de empresa: 8/8.5pt → 8pt uniforme.
2. **Edición** (`src/components/cotizaciones/HojaCotizacion.tsx`):
   - Datos de cliente/contacto: 10.33 → 10.5px; etiquetas 8.83 → 9.5px; títulos de sección 9.33 → 11px.
   - Bloque Proyecto: 6.5pt → 10.5px (equivalente al cuerpo).
   - Desglose: 13 → 12px; TOTAL se mantiene 13px; equivalente 12 → 11px.
   - Términos: 12 → 10.5px.
   - Empresa: eslogan/dirección/web 11.5–12 → 11px; «COTIZACIÓN» 13 → 12px; código 15 → 16px.
3. **Tabla de partidas editable** (`src/components/CotizacionHoja.tsx`): cuerpo 10.33 → 10.5px; cabecera 10 → 9.5px.
4. Verificar que al subir partidas de 6.5pt a 8pt la paginación siga correcta (recalibrar el alto estimado por fila si hace falta) y que ninguna columna se corte.

## Lo que no cambia

- Colores, paleta navy/dorado, letra Roboto y estructura de la hoja.
- Datos, cálculos, moneda, Excel y lógica comercial.

## Verificación

- Abrir una cotización real en edición y vista previa: tamaños coherentes, sin textos recortados ni columnas corridas.
- Generar el PDF y comparar con la vista previa.
- Probar con descripciones largas y con más de una página.
- Compilación sin errores.

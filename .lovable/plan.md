# Iconos de la cinta en dos tonos (negro + azul #0072BB)

## Qué cambia
- Todos los iconos de la cinta (grandes 32 px y pequeños 16 px, en todas las pestañas) mantienen su estructura en negro con el mismo trazo fino actual.
- Solo los detalles internos (líneas de texto en hojas, signos $ / %, flechas, engranajes pequeños, puntos, check, barras de gráficos, llaves, etc.) pasan a azul #0072BB.
- El estado seleccionado amarillo y el hover no cambian; en la barra superior oscura los iconos siguen claros por legibilidad.
- Se guarda la regla en memoria (reemplaza la de "todo negro").

## Cómo se decide qué es "detalle"
Cada icono está formado por varias piezas. Para cada uno de los ~100 iconos se marca qué piezas son acento (p. ej. en FileText: el contorno de la hoja negro, las líneas de texto azules). Iconos de una sola pieza (sin detalle separable) quedan negros completos.

## Detalles técnicos
- Nuevo token `--color-cinta-acento: #0072BB` en src/styles.css.
- Nuevo envoltorio `IconoDuotono` en src/components/icono-grupo.tsx: recibe el icono lucide y la lista de índices de piezas acento; aplica `stroke: var(--color-cinta-acento)` a esos hijos del SVG vía CSS (`[data-acento] > :nth-child(n)`).
- Mapa `ACENTOS_ICONO` (nombre de icono → índices) en un módulo propio; AppShell envuelve cada icono con él para que CintaOpciones, CintaCotizacion y la búsqueda lo usen sin cambios.
- Iconos propios (GrupoPersonas, LibroAyuda, LlavesMecanico) marcan sus piezas acento directamente.
- Verificación con capturas ampliadas de cada pestaña.

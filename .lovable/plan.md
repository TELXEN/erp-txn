# Nueva codificación por tipo de insumo

Me parece bien: separar equipos de herramientas solo en el código, sin tocar los grupos del APU.

## Primer dígito del código (8 dígitos: T + EE especialidad + SS subfamilia + NNN)

| Dígito | Tipo | Grupo en el APU |
|---|---|---|
| 1 | Materiales | MATERIALES |
| 2 | Mano de obra | MANO DE OBRA |
| 3 | (libre, reservado) | — |
| 4 | Equipos | EQUIPOS Y HERRAMIENTAS |
| 5 | Herramientas (incluye Herramientas manuales) | EQUIPOS Y HERRAMIENTAS |
| 6 | Subcontratos | SUBCONTRATOS |
| 7 | EPP | (no entra al APU) |

- Subfamilia solo para materiales; el resto lleva 00 (sin cambio).
- En la ficha de "Equipos y herramientas" se elige Equipo o Herramienta; eso decide si el código empieza con 4 o 5.
- Análisis de Precios Unitarios, cotizaciones y dossier siguen mostrando los cuatro grupos de siempre.

## Recodificar las fichas actuales

- Mezcladora 30600001 → 40600001
- Herramientas manuales 40000001 → 50000001
- Programación de PLC 50000001 → 60000001
- Asignar código a las que no tienen: casco (7…), alquiler de equipo de medición (4…), tablero autosoportado (1…, necesita subfamilia), instalación del tablero (2…, y corregir "Isntalacion").
- Corregir "Clavo" (50000) → código 1 + especialidad + subfamilia.
- Materiales y mano de obra con código correcto se mantienen.

Antes de aplicar, confirmo contigo la especialidad/subfamilia de las fichas sin código si no se pueden deducir.

## Detalle técnico

- Migración: actualizar `siguiente_codigo_insumo_modular` para mapear EQ→4/5 según `categoria_inventario` ('Equipo'/'Herramienta'), HT→5, SC→6, EPP→7; aceptar un parámetro de categoría.
- `renumerar_codigos_insumo` sigue por prefijo de 5 dígitos (sin cambios).
- `InsumoVentana.tsx`: pasar la categoría al pedir el código y regenerarlo si se cambia Equipo↔Herramienta en una ficha nueva.
- Recodificación de las fichas existentes por UPDATE de datos (no hay recetas APU ni kardex que dependan del código; las referencias usan el id).
- Actualizar la memoria "Código de insumos" con la nueva tabla de dígitos y una prueba del mapeo tipo→dígito.

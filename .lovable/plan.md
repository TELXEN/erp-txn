# Nueva codificación por tipo de insumo

Separar equipos de herramientas solo en el código, sin tocar los grupos del APU.

## Primer dígito del código (8 dígitos: T + EE especialidad + SS subfamilia + NNN)

| Dígito | Tipo | Grupo en el APU |
|---|---|---|
| 1 | Materiales | MATERIALES |
| 2 | Mano de obra | MANO DE OBRA |
| 3 | Equipos | EQUIPOS Y HERRAMIENTAS |
| 4 | Herramientas (incluye Herramientas manuales) | EQUIPOS Y HERRAMIENTAS |
| 5 | Subcontratos | SUBCONTRATOS |
| 6 | EPP | (no entra al APU) |

- Subfamilia solo para materiales; el resto lleva 00.
- En la ficha de "Equipos y herramientas" se elige Equipo o Herramienta; eso decide si el código empieza con 3 o 4.
- Análisis de Precios Unitarios, cotizaciones y dossier siguen mostrando los cuatro grupos de siempre.

## Recodificar las fichas actuales

- Mezcladora 30600001: se mantiene.
- Herramientas manuales 40000001: se mantiene.
- Programación de PLC 50000001: se mantiene.
- Asignar código a las que no tienen: casco (6…), alquiler de equipo de medición (3…), tablero autosoportado (1…, necesita subfamilia), instalación del tablero (2…, y corregir "Isntalacion").
- Corregir "Clavo" (50000) → código 1 + especialidad + subfamilia.

Si no se puede deducir la especialidad/subfamilia de alguna ficha, te la consulto antes de aplicar.

## Detalle técnico

- Migración: `siguiente_codigo_insumo_modular` mapea MAT→1, MO→2, EQ→3 o 4 según `categoria_inventario` (Equipo/Herramienta), HT→4, SC→5, EPP→6; recibe la categoría como parámetro.
- `InsumoVentana.tsx`: pasar la categoría al pedir el código y regenerarlo si cambia Equipo↔Herramienta en una ficha nueva.
- Recodificación de fichas por UPDATE de datos (las referencias usan el id, no el código).
- Actualizar la memoria "Código de insumos" y añadir una prueba del mapeo tipo→dígito.

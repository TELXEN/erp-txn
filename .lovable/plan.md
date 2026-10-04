# Tabla de Partidas sin cortes y con grupos colapsables

Mejora de experiencia en la página Partidas (solo la vista de tabla del listado; el formulario y el Kanban no cambian).

## Problemas detectados (capturas en /tmp/browser/partidas-ux/screenshots)

- Columnas truncadas: P.U. muestra «S/ 12,954.54 S/», presupuesto se encima con la columna siguiente y el avance se corta («100.», «20.0»).
- Los grupos de proyecto no se pueden colapsar: con varias obras el listado se hace muy largo.
- Subpartidas en orden inverso (01.01.03, 01.01.02, 01.01.01 en lugar de 01.01.01 → 01.01.03).
- La cabecera de columnas se pierde al hacer scroll.

## Cambios (src/routes/_authenticated/partidas.tsx)

1. **Anchos de columna revisados**: dar más espacio a Partida, Presupuesto y Avance; reducir Marca y # de columnas estrechas; `whitespace-nowrap` y tabular en montos para que P.U., presupuesto y el porcentaje de avance nunca se corten (barra + % caben en la celda).
2. **Grupos colapsables**: cada barra de proyecto (fondo sidebar, con «Renumerar WBS») gana un chevron para colapsar/expandir todas sus especialidades; cada fila de especialidad también colapsa sus partidas. Estado en un Set de claves (proyecto / proyecto·especialidad), por defecto todo expandido.
3. **Orden natural de subpartidas**: revisar `ordenarJerarquia` (src/lib/categorias.tsx); si ordena por código descendente, cambiar a ascendente (01.01 → 01.03) sin alterar la jerarquía padre/hijo ni la agrupación.
4. **Cabecera fija**: `sticky top-0` en el `thead` con fondo sólido para que las columnas sigan visibles al hacer scroll dentro del panel.

## Verificación

- tsgo y build OK.
- Playwright en /partidas: captura del listado confirmando que P.U./presupuesto/avance no se cortan, chevrons colapsan y expanden proyectos y especialidades, y subpartidas listadas en orden 01.01.01 → 01.01.03. Sin page errors.

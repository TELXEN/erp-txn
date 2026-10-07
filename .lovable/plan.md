# Desglose por categoría como gráfico de dona (Gastos Generales)

## Objetivo
Reemplazar la lista de barras horizontales del panel «Desglose por categoría» en Gastos Generales por un gráfico de dona que muestre la proporción de cada categoría sobre el gasto total del período, manteniendo el filtrado por clic.

## Alcance
- Archivo: `src/routes/_authenticated/gastos-generales.tsx` (sección «Desglose por categoría», ~líneas 431–461).

## Diseño
- Dona con recharts (`PieChart` + `Pie` con `innerRadius`, `paddingAngle`, `stroke: none`), siguiendo el patrón ya existente en `src/routes/_authenticated/dashboard.tsx` (Composición del costo real).
- En el centro de la dona: etiqueta «Total del periodo» y el monto en soles (formato `soles`).
- Tooltip formateado en soles, con `var(--line)` como borde, igual que el Dashboard.
- Paleta: colores sobrios asignados en orden fijo por categoría (lista local de tokens semánticos del tema), manteniendo tonos rojo/verde solo para lo que ya los usa. No hardcodear colores nuevos fuera de la lista del componente.
- Leyenda junto a la dona (lista vertical): cuadrado de color, nombre de la categoría, monto a la derecha y % del total.
- Interacción: al hacer clic en una porción o en su fila de leyenda de una categoría filtrable, se aplica/quita el filtro de categoría (mismo comportamiento actual con `setPestana("gastos")` y `setFiltroCategoria`); la porción activa se resalta (mayor grosor u opacidad del resto). Mantenimiento y Combustible vehicular se muestran pero no filtran, como hoy.
- Estado vacío: mensaje «Sin gastos en este periodo.» sin dona, como hoy.

## Verificación
- `bunx tsgo --noEmit` y build limpios.
- Playwright: dona visible con datos, centro con total, clic en porción filtra el listado y el título de filtro, segundo clic lo quita; verificar con sesión inyectada.

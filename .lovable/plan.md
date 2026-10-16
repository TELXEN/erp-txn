# Panel "Ganancia / Pérdida" en el Dashboard financiero

Nueva sección en el Dashboard financiero, con fondo blanco y tarjetas, que usa datos reales del ERP (no inventados) en soles (S/).

## Organización de la página
- Arriba del Dashboard financiero habrá dos pestañas: **Resumen** (lo que existe hoy) y **Ganancia / Pérdida** (el panel nuevo).
- En la pestaña Resumen, las tablas "Resumen financiero por obra" y "Rendimiento por Partida" pasan al pie de la página, debajo del resto de tarjetas y gráficos.

## Qué verá el usuario

1. **Selector superior**: menú "Selecciona un año →" con borde gris fino. Muestra los años que tienen movimientos (por ejemplo 2026 y 2027) y por defecto el año actual.
2. **Panel izquierdo**
   - Tarjeta "Ganancia / Pérdida del año": monto total en grande y debajo un recuadro con el margen % (ganancia ÷ ingresos). Es verde con texto blanco si es positivo y rojo con texto blanco si es negativo.
   - "Análisis": lista numerada con índices en cuadros oscuros (1, 2, 3) y frases que se calculan solas: mes con mayor ganancia, mes con mayor pérdida (o menor ganancia) y cuántos meses cerraron en positivo.
3. **Panel derecho, "Ingresos vs Gastos"**: gráfico de los 12 meses (Enero a Diciembre) con barras verdes de Ingresos y barras rojas/naranjas de Gastos (valor encima cuando hay espacio y siempre al pasar el cursor), una línea suavizada gris oscuro de Ganancia / Pérdida mensual, una línea de referencia en cero y la leyenda arriba.

En pantallas angostas los paneles se apilan.

## Origen de los datos
- **Ingresos**: ventas/facturas del mes por fecha de emisión, en soles.
- **Gastos**: gastos directos, gastos generales, tareo vehicular y costo de personal (boletas y honorarios) del mismo mes. Es la misma base que ya usa el costo real de obra, ahora repartida por mes.

## Detalles técnicos
- Nuevo componente `src/components/dashboard/GananciaPerdida.tsx` con Recharts `ComposedChart` (Bar ×2 con `LabelList`, Line `type="monotone"`, `ReferenceLine y=0`, `Legend verticalAlign="top"`).
- Montos mensuales calculados con `useMemo` a partir de los hooks existentes (`useVentas`, `useGastosDirectos`, `useGastosGenerales`, `useTareoVehiculos`, boletas/recibos de `costo-obra.ts`). El costo de personal se agrupa por el mes del documento.
- Colores con tokens del tema (`--color-ok`/`--color-bad` o equivalentes); se agregan tokens para el gráfico si faltan.
- Se inserta en `dashboard.tsx` sin cambiar las secciones que ya existen.

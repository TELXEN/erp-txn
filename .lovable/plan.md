# Rediseño de Flujo de Caja

Se mantienen los datos, los cálculos, la edición de metas y la exportación a Excel. No hay cambios en la base de datos.

## 1. Tarjetas de resumen
- Las 9 tarjetas se agrupan en 3 bloques, cada uno con su título:
  - **Saldos:** Saldo en bancos al 1 de enero, Saldo al cierre (real) y Saldo proyectado a diciembre.
  - **Metas:** Meta de ingreso, Meta de costo y Resultado objetivo.
  - **Realizado:** Ingreso, Costo y Resultado realizado, cada uno con su «% del objetivo».
- Cuando se ve una sola obra, el primer bloque se llama «Proyección de la obra» y muestra Por cobrar, Por pagar y Flujo proyectado, como hoy.
- Todos los montos se muestran con dos decimales (S/ 240,000.00).

## 2. Gráfico comparativo mensual
- Las barras muestran solo el **Ingreso realizado** y el **Costo realizado** de cada mes.
- La meta de ingreso y la meta de costo pasan a ser líneas finas y punteadas. Si la meta es igual todos los meses, la línea queda recta; si cambia, la línea sigue el valor de cada mes.
- Los meses sin movimientos reales se ven atenuados en el gráfico.
- La línea del resultado se quita del gráfico principal. Debajo aparece un gráfico pequeño de **Flujo acumulado**, que se puede ocultar o mostrar con un interruptor «Mostrar tendencia» (activado al entrar).

## 3. Matriz anual
- La fila «Costo realizado» tiene una flecha para abrir o cerrar su detalle (Compras, Gastos generales, Mantenimiento, etc.). El detalle empieza cerrado.
- **Metas sin cajas blancas:** las metas se ven como texto normal. Al pasar el cursor, la celda muestra un borde suave. Con doble clic o con Enter se vuelve editable; Enter o salir de la celda guarda los cambios, y Esc los cancela.
- Las celdas en cero muestran un guion gris «-» en lugar de «S/ 0.00».
- Todas las cifras, incluida la columna TOTAL ANUAL, usan dos decimales y la misma tipografía.

## 4. Alertas
- En **Variación**, **Cumplimiento %** y los resultados mensuales, los valores negativos o en desvío crítico salen en rojo con un fondo rosado suave. Se considera desvío crítico un cumplimiento menor que 0 %.
- En **Saldos** y **Resultado realizado**, las tarjetas con valor negativo usan el mismo estilo de alerta.

## Detalles técnicos
- Solo cambia `src/routes/_authenticated/flujo-caja.tsx`.
- Los montos usan `Intl.NumberFormat` con 2 decimales (helper local `s2`) y la función `celda(v)` muestra un guion cuando |v| < 0,005.
- **Gráfico (Recharts):**
  - Las barras de cada mes usan `<Cell>` con `fillOpacity` 0.25 cuando el ingreso real y el costo real son 0.
  - Las metas usan `<Line strokeDasharray="5 4" dot={false}>`, con `type="step"`.
  - El gráfico pequeño es un `AreaChart` con `h-24`.
- **Estado nuevo:** `costoAbierto`, `editando: {campo, mes}` y `verTendencia`.
- El guardado de metas reutiliza el que ya existe.
- **Colores:** tokens semánticos (`bad`, `good`, `primary`, `cta`). La alerta usa `bg-bad/10 text-bad`. Los colores fijos del gráfico se reemplazan por variables del tema.

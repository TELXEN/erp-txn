# Gastos Generales: separar en dos pestañas (Resumen / Detalle)

## Objetivo
Aplicar a Gastos Generales el mismo criterio de Costos Directos: una pestaña **Resumen** con indicadores y desglose gráfico, y una pestaña **Detalle** con los registros, para no saturar la pantalla.

## Archivo
`src/routes/_authenticated/gastos-generales.tsx` (único archivo; sin cambios de base de datos ni de lógica de negocio).

## Cambios

### 1. Barra de pestañas única (reemplaza grupo + pestañas actuales)
- Se eliminan los dos botones de grupo («Gastos indirectos» / «Flota») y la doble barra actual.
- Una sola barra de pestañas al estilo Costos Directos (borde inferior, activa resaltada):
  - **Resumen**
  - **Gastos generales**
  - **Mantenimiento**
  - **Combustible**
- Pestaña activa persistida en `localStorage` (`gastos-generales:pestana`); al volver a entrar o cambiar de ventana se recuerda, con «Resumen» por defecto si no hay valor válido.

### 2. Encabezado compartido (visible en todas las pestañas)
- Encabezado de la ruta con: rango de fechas (Desde–Hasta) y «Exportar a Excel» — igual que hoy.
- El **selector de imputación** (Todas / Oficina Central / obra) se mueve a una fila común encima de las pestañas, porque filtra resumen y detalle por igual (hoy solo está dentro de la pestaña de gastos).

### 3. Pestaña «Resumen»
- Fila de tarjetas de indicadores al estilo Costos Directos (etiqueta mayúscula pequeña + valor grande `tabular-nums`):
  1. **Gastos generales** (total del periodo, ámbito seleccionado)
  2. **Flota** (mantenimiento + combustible)
  3. **Total del periodo**
  4. **Pagado** (verde)
  5. **Por pagar (crédito)** (rojo si > 0, gris en cero)
- Debajo, el panel actual «Desglose por categoría» con el gráfico de anillo y su leyenda, sin cambios funcionales (clic en categoría filtra y salta a la pestaña «Gastos generales»).

### 4. Pestañas de detalle (sin cambios funcionales)
- «Gastos generales»: buscador + filtro de categoría activo + botón «Registrar Gasto» + tabla agrupada por categoría con edición en línea, acciones y pastilla de pago — tal como está.
- «Mantenimiento» y «Combustible»: tablas de flota tal como están.
- El modal «Registrar gasto general» queda fuera del condicional de pestaña, como el modal de compra en Costos Directos.

## Verificación
- Typecheck sin errores.
- Playwright con la sesión del usuario: las 4 pestañas abren, la activa se recuerda tras recargar, las tarjetas del Resumen muestran los montos del ámbito y el anillo filtra hacia la tabla.

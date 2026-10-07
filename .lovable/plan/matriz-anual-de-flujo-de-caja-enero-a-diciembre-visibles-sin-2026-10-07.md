# Matriz anual de Flujo de Caja: enero a diciembre visibles sin desplazamiento lateral

## Objetivo
Que la matriz anual (Concepto + 12 meses + Total anual) quepa completa en el ancho de la pantalla, sin barra de desplazamiento horizontal.

## Cambios (src/routes/_authenticated/flujo-caja.tsx)

1. **Quitar el ancho mínimo fijo de la tabla**
   - Eliminar `min-w-[1900px]` de la tabla de la matriz anual para que use solo el ancho disponible (`w-full`), manteniendo `table-fixed`.

2. **Reparto de anchos**
   - Concepto (fijada a la izquierda): ~16 % del ancho.
   - Total anual (fijada a la derecha): ~12 % del ancho.
   - Los 12 meses comparten el ~72 % restante en partes iguales (~6 % cada uno).

3. **Compactar celdas de meses**
   - Reducir el relleno lateral de las celdas de meses (px-2 → px-1) y mantener la fuente compacta (`text-xs` / `text-[10px]` en encabezados).
   - Mantener `tabular-nums` y alineación a la derecha en montos; formato de moneda ya compacto (S/ con separador de miles).

4. **Comportamiento en pantallas angostas**
   - Si el ancho disponible es demasiado pequeño (p. ej. ventana muy reducida), la tabla vuelve a permitir desplazamiento lateral como respaldo, pero en el ancho normal de trabajo (≈1378 px) los 12 meses se ven completos.

## Verificación
- `bunx tsgo --noEmit` limpio.
- Playwright en /flujo-caja: la matriz muestra enero a diciembre y Total anual sin barra lateral; Concepto y Total anual siguen fijados al hacer scroll vertical; montos alineados a la derecha y negativos como «S/ -42,315.17».

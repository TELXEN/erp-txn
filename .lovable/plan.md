# Requerimientos desde Cotización (desdoblamiento de APU)

## Qué verá el usuario
- En Requerimientos, un nuevo origen: **Desde cotización aprobada** (además del actual "Desde obra").
- Al elegir la cotización, el sistema desdobla automáticamente el APU de cada partida (solo partidas hoja, sin títulos/grupos) y calcula: **Cantidad total = metrado de la partida × cantidad del insumo en el APU**.
- Dos vistas con un interruptor:
  - **Por tipo**: Materiales, Mano de Obra, Equipos y Herramientas (incluye Herramientas manuales automática), Subcontratos.
  - **Consolidada**: insumos idénticos de varias partidas en una sola línea de compra.
- Cada línea se expande (flecha) para mostrar su origen: código WBS y nombre de la partida, metrado, cantidad unitaria APU y subtotal.
- Selección de tipos a incluir (por defecto MAT, EQ, SC; MO opcional), ajuste manual de cantidad antes de guardar, y "Generar requerimiento" crea el documento con código correlativo.
- En el detalle de un requerimiento guardado se mantiene el desglose por partida. Exportar a Excel con columnas de origen.
- Solo cotizaciones en estado Aprobada (hoy no hay ninguna; se mostrará un aviso vacío).

## Reglas
- Se usa el mismo cálculo de APU del editor (calcularApu / cantidadComponente), así cuadrilla/rendimiento y HT coinciden con la cotización.
- Precio referencial = costo unitario del insumo; montos visibles solo para roles con dinero.
- Una cotización puede generar varios requerimientos; se muestra cuánto ya se pidió por insumo (pendiente = total − ya requerido).

## Detalles técnicos
- Migración (aditiva):
  - `requerimientos`: `cotizacion_id uuid null` (FK cotizaciones), `origen text default 'obra'`.
  - Nueva tabla `requerimiento_item_origenes` (id, requerimiento_item_id FK cascade, cotizacion_item_id, partida_codigo, partida_nombre, metrado, cantidad_unitaria, cantidad) con GRANTs + RLS igual a requerimiento_items.
  - `proyecto_id` pasa a admitir nulo solo si la cotización aún no tiene obra (usar proyecto de la cotización cuando exista).
- Server fn autenticada `desdoblarCotizacion({cotizacionId})` en `src/lib/requerimientos.functions.ts`: lee cotizacion_items hoja + apu_componentes (cotizacion_item_id) + insumos, devuelve líneas consolidadas con origenes. `generarRequerimiento` inserta cabecera, ítems y orígenes y reserva código vía mecanismo existente.
- UI en `src/routes/_authenticated/requerimientos.tsx`: selector de origen, tabla agrupada/consolidada con filas expandibles, estilo de catálogos existente.

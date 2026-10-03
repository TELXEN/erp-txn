# Segunda fila editable de compra en Costos Directos

## Qué verás

En **Costos Directos**, al expandir una partida aparece una **segunda fila de captura en línea** (estilo WYSIWYG), debajo del encabezado de compras y encima de las compras ya registradas. Se escribe directo en los campos y se registra con **Enter** o con el icono de **check (✓)** al final de la fila.

Campos de la fila, en este orden:

1. **FECHA** — date, hoy por defecto.
2. **COMPROBANTE** — texto libre (F001-1240).
3. **PROVEEDOR** — lista de proveedores activos (obligatorio).
4. **INSUMO** — buscador con sugerencias del Maestro de insumos (autocompletado como en cotizaciones); al elegirlo queda vinculado y **su tipo define el rubro** de la compra (Materiales, Mano de obra, Equipos, Subcontratos…). Si no se elige insumo, el rubro queda en Materiales como hoy.
5. **PAGO** — Contado / Crédito. Si es Crédito aparece en línea el selector de días (15/30/45/60/90 u otro) con la fecha de vencimiento.
6. **BANCO** — visible solo si el pago es Contado: lista de cuentas bancarias activas + Caja Chica; si elige una cuenta (no caja) aparece el campo N° de operación.
7. **CANTIDAD** — número, obligatorio.
8. **P.U. COMPRA** — número, obligatorio.

Al final de la fila: icono **✓** (registrar) e **✕** (limpiar la fila). Enter en cualquier campo registra igual que el ✓.

## Cambios

- **Eliminar la ventana flotante** «Registrar compra» y el botón del encabezado; toda compra se registra en la fila inline de su partida.
- El botón «+ Compra» de cada partida ahora **expande la partida y enfoca la fila de captura**.
- La lista de compras de cada partida muestra también la columna **Insumo** (nombre del insumo o «—»).
- La moneda sigue siendo la de la obra (PEN); se mantiene el tipo de cambio solo si en el futuro se pide USD en esta fila — por ahora la fila registra en soles, igual que el flujo principal.

## Detalles técnicos

- Migración: `ALTER TABLE gastos_directos ADD COLUMN insumo_id uuid REFERENCES insumos(id)` (nullable; compras existentes quedan sin insumo).
- `src/routes/_authenticated/gastos-directos.tsx`: se quita el modal y el estado `mostrarForm`; nuevo componente `FilaCompra` (fila de captura por partida) con su propio estado local, reutilizando `condicionVacia`/`datosCondicion`/`PLAZOS` de CondicionPago y un autocompletado de insumos (patrón `AutoMaestra` de CotizacionHoja, sobre la tabla `insumos` activos).
- El rubro se deriva del tipo del insumo elegido (mapeo clave de tipo → rubro: MO→Mano de obra, MAT→Materiales, EQ→Equipos, SC→Subcontratos, otros→Materiales).
- Validaciones iguales a las actuales: cantidad > 0, P.U. ≥ 0, cuenta bancaria y N° de operación si es contado sin caja.
- Al registrar: insert en `gastos_directos` (mismo cálculo de montos), la fila se limpia y la compra aparece en la lista sin recargar.
- Sin cambios en exportar a Excel (se añade columna Insumo en la hoja «Compras»).

## Verificación

- Playwright en /gastos-directos: expandir partida, llenar la fila, registrar con Enter y con ✓, elegir insumo del buscador, probar Contado (banco) y Crédito (días), limpiar datos de prueba.
- `bunx tsgo --noEmit` y build OK.

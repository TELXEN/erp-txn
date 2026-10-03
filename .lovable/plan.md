# Registrar compra en ventana con datos de la partida

## Qué se pide
En Costos Directos, al pulsar «+ Compra» de una partida se abre una **ventana flotante** que muestra primero **los datos de la partida** (resumen) y debajo los campos de compra **listos para ingresar**. La fila de captura en línea actual se elimina: toda compra se registra desde la ventana.

## Ventana «Registrar compra»

**1. Resumen de la partida** (contexto, arriba): CÓDIGO · PARTIDA · UND. · PRESUPUESTO · COSTO REAL · SALDO · % CONSUMO, con el saldo en rojo si la compra proyectada lo vuelve negativo.

**2. Campos de compra** (los mismos de la fila actual, listos para escribir):
FECHA (hoy por defecto) · COMPROBANTE · PROVEEDOR · INSUMO (buscador del maestro completo con texto libre) · PAGO (Contado/Crédito) · BANCO (cuentas + Caja Chica si es Contado, con N° de operación; días y fecha de vencimiento si es Crédito) · CANT. REAL (M) · COSTO REAL (P.U.) — textos a la izquierda, números a la derecha. Total calculado visible.

**3. Registro:** Enter o el icono ✓ registra. La ventana **permanece abierta con los campos limpios** para registrar otra compra seguida (reemplaza el «Añadir otra compra» actual); muestra una confirmación breve «Compra registrada» y el total recién registrado. Se cierra con X, clic fuera o Escape. Las validaciones actuales se mantienen (proveedor, cantidad > 0, cuenta y N° de operación si es contado sin caja).

## Cambios (un solo archivo: `src/routes/_authenticated/gastos-directos.tsx`)

1. **Ventana modal** con el patrón ya usado en el módulo (overlay fijo `fixed inset-0 z-50` con fondo oscurecido, tarjeta centrada con scroll, cierre con X / clic fuera / Escape).
2. **Partida:** el «+ Compra» de cada fila abre la ventana con esa partida (y la deja expandida). No hay botón general en el encabezado: siempre hay partida definida.
3. **Historial en la partida:** al expandir una partida se sigue viendo la tabla de sus compras registradas (columnas actuales, incluida Insumo, con cambio de estado de pago y eliminación). Se quita la fila de captura en línea, el botón «Añadir otra compra» y el estado multi-fila (`filas`).
4. Al registrar desde la ventana, la compra aparece en el historial de la partida expandida sin recargar (igual que hoy).
5. Se conserva `FilaCompra` convertida en contenido de la ventana (mismos campos y lógica de `AutoInsumo`, `CondicionPago`, cálculo de total y rubro por tipo de insumo); se añade el bloque de resumen y el comportamiento de ventana persistente con campos limpios tras cada registro.

## Fuera de alcance
- Sin cambios de base de datos ni de lógica de guardado: mismas validaciones, misma tabla `gastos_directos`.
- Sin cambios en exportar a Excel.

## Verificación
- Playwright en /gastos-directos: abrir la ventana desde «+ Compra», verificar resumen de la partida, registrar una compra con Enter, registrar una segunda seguida, verificar que aparece en el historial expandido, probar Contado (banco) y Crédito (días), limpiar los datos de prueba.
- `bunx tsgo --noEmit` y build OK.

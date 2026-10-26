# Forma de pago al generar la OC y registro en Tesorería

## Qué cambia para el usuario
1. **Bandeja de Requerimientos → «Aprobar y generar OC»** abre una ventana de confirmación con:
   - Proveedor, total de la cotización elegida.
   - **Forma de pago**: Contado o Crédito (preseleccionada según lo que ofertó el proveedor).
   - **Plazo de pago (días)**, solo si es Crédito (por defecto el plazo ofertado o 30).
   - Botón «Generar OC». Si es Crédito sin días válidos, avisa y no genera.
2. La OC guarda la condición («Contado» o «Crédito N días») y se ve en la lista, la hoja tipo Facturación y el PDF (ya existente).
3. **Tesorería**: toda OC, al contado o al crédito, queda como cuenta por pagar en «Pagos a proveedores»:
   - Contado: vence el mismo día de la recepción.
   - Crédito: vence en fecha de recepción + N días.
   - El importe incluye el **IGV 18 %** cuando son materiales, igual que el total de la OC (hoy se carga solo el subtotal).
   - Desde Tesorería se marca el pago con banco y número de operación, como ya funciona para los demás gastos.

## Cuándo se registra en Tesorería
Al recibir la OC («Recibir en almacén / cargar a costos»), que es cuando se carga el costo a la obra. Así no se duplica la deuda y cada línea queda vinculada a su ítem de OC.

## Detalles técnicos
- `requerimientos.tsx`: `aprobar(s)` abre un diálogo (VentanaFlotante); valores iniciales con `detallePagoOrden(s.condiciones)`; al confirmar usa `condicionPagoOrden(forma, dias)` y guarda en `ordenes_compra.condicion_pago`.
- `ordenes-compra.tsx` → `recibir`: leer forma/plazo con `detallePagoOrden` (no regex), y calcular el monto de cada línea con IGV mediante `montosOrdenCompra` para tipo MAT (`monto`, `monto_soles` con IGV; `estado_pago: "Pendiente"`, `fecha_vencimiento` según plazo).
- Sin cambios de base de datos: se usan columnas existentes (`condicion_pago`, `dias_credito`, `fecha_vencimiento`, `estado_pago`).
- Test: añadir casos a `orden-compra-pago` (Contado vence hoy; Crédito 45 días vence +45) y a montos con IGV por línea.

# Registro de ventas: cliente igual al RUC de la factura, sin duplicados, con editar/eliminar

## Cómo quedará
**1. Cliente amarrado al RUC de la factura (desde SIRE)**
- Al abrir «Registrar Ventas» desde SIRE, el cliente se elige solo por el RUC de la factura y queda bloqueado: no se puede cambiar por otro.
- Si ese RUC no está en el catálogo, en vez de la lista aparece «Cliente no registrado · RUC …» con el botón **«Registrar cliente»**: consulta Decolecta, lo guarda en Clientes y lo deja elegido, sin salir de la ventana.
- No se puede guardar mientras el cliente no coincida con el RUC de la factura.

**2. Sin duplicados**
- Un mismo número de comprobante (p. ej. F001-24) solo puede registrarse una vez en Ventas, sea cual sea el cliente. Si ya existe, el aviso dice con qué cliente quedó registrado.
- Lo mismo aplica al registro manual desde Registro de Ventas.

**3. Editar y eliminar en Registro de Ventas**
- Cada fila tendrá los botones Editar (lápiz) y Eliminar (rojo) al final, como en los demás listados.
- Editar abre la misma ventana con los datos cargados; se puede corregir cliente, fecha, montos, obra, condición y régimen.
- Eliminar pide confirmación. No se permite eliminar ni cambiar montos de una venta ya cobrada (total o parcialmente); el aviso indica que primero se anule el cobro en Tesorería.
- Al eliminar, si la venta venía de SIRE, la factura vuelve a figurar como «Faltante en ERP».

**Limpieza del caso actual**
- La venta F001-24 duplicada (la del cliente equivocado) podrás eliminarla tú mismo con el nuevo botón; no se borra nada automáticamente.

## Detalles técnicos
- `RegistrarVentaExterna`: props `rucFijo?` (bloquea el select de cliente y valida `cliente.numero_documento === rucFijo`) y `editar?: venta` (UPDATE en vez de INSERT). Alta rápida de cliente con `consultarDocumentoSunat` + insert en `terceros` (es_cliente).
- Duplicado: consulta `ventas` por `numero_factura` (excluyendo el propio id al editar) antes de guardar.
- Cobros: se detectan por `estado = 'Pagado'`/`fecha_pago` y movimientos de tesorería ligados a la venta; si hay, se bloquean eliminar y edición de importes.
- `registro-ventas.tsx`: columna de acciones con `BotonIcono` (neutro/peligro) y confirmación antes de borrar; invalida `["ventas"]`.
- Verificación: typecheck y Playwright (abrir desde SIRE con RUC inexistente, ver bloqueo; editar una venta sin guardar datos reales).

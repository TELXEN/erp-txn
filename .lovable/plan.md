# Botones del editor de comprobantes arriba y fijos

## Qué cambia
1. **Guardar borrador / Guardar cambios, Emitir comprobante y Cancelar** pasan de la parte inferior del editor a la barra superior del editor (justo debajo de la cinta), al lado de **Cerrar editor**. Esa barra queda fija: el contenido de la factura se desplaza por debajo y los botones siempre están visibles. El mensaje de error se muestra junto a ellos.
2. Se quita el botón **Cerrar editor** de la cabecera de la pantalla (zona de la cinta). Con el editor cerrado sigue apareciendo "Crear Factura" / "Crear Guía de Remisión", etc.

Aplica a facturas, boletas, notas y guías de remisión (comparten el mismo editor).

## Detalles técnicos
- `src/routes/_authenticated/facturacion-electronica.tsx`:
  - En `Encabezado acciones`, cuando `abierto` no renderizar nada (quitar el `Cerrar editor`).
  - Mover los botones del pie (`guardar(false)`, `guardar(true)`, Cancelar, error) al `extra` del `Panel`, antes de `Cerrar editor`, y eliminar el pie. La cabecera del Panel ya está fuera de la zona con scroll, por lo que queda inmovilizada.

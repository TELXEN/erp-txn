# Corregir el botón «Registrar en Gasto» de SIRE → Compras

## Problema
Hoy el botón de cada fila faltante solo muestra un aviso y lleva a Gastos Generales con la ventana vacía: no copia proveedor, serie, fecha ni montos, no permite elegir Costo Directo, y la factura sigue apareciendo como faltante. Además duplica lo que ya hace «Registrar en el ERP» de la barra.

## Cómo quedará
- Al pulsar «Registrar en Gasto» en una fila se abre, sin salir de SIRE, la misma ventana «Registrar en el ERP» pero solo con esa factura.
- En la ventana se elige Costo Directo (obra + partida) o Gasto General (categoría); proveedor, fecha, serie-número, moneda, tipo de cambio, base, IGV, total e ítems vienen precargados.
- Si la factura aún no tiene su XML descargado, el botón primero lo descarga de SUNAT y luego abre la ventana; si SUNAT no lo entrega, avisa el motivo.
- Al guardar, la fila pasa a «ERP ✓» / conciliada y la tabla se refresca; no se puede registrar dos veces.
- Ventas (botón «Emitir») no cambia.

## Detalles técnicos
- `useComprobantesCompra` expone `registrarUno(item)`: busca el recibido por clave (RUC+tipo+serie+número); si no existe o no tiene XML, llama al lote de descarga con ese único ítem; después abre `RegistrarModal` con `[recibido]`.
- En `sire.tsx` la rama RCE del botón reemplaza el `toast` + `navigate("/gastos-generales")` por `cc.registrarUno(i)`; al terminar se invalida la conciliación ERP para recalcular estados.
- Verificación: typecheck y Playwright en SIRE → Compras abriendo la ventana desde una fila (sin guardar datos reales).

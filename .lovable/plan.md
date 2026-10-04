# Unificar acciones de fila: Cotizaciones y Facturación Electrónica

## Contexto actual (verificado en el código)

- **Preliquidaciones** (src/components/Preliquidaciones.tsx, filas ~730–749) tiene cuatro acciones con iconos: **Vista previa** (Eye 15, botón cuadrado con borde), **Duplicar/Copiar** (Copy 14), **Editar** (Pencil 14) y **Eliminar** (Trash2 14, rojo al hover). `duplicar()` abre el editor con una copia (fecha = hoy, observación vacía, sin id → crea un registro nuevo al guardar).
- **Cotizaciones** (src/routes/_authenticated/cotizaciones.tsx, filas ~695–707) solo tiene Vista previa, Editar y Eliminar. **Falta Copiar.**
- **Facturación Electrónica** (src/routes/_authenticated/facturacion-electronica.tsx, fila ~177) ya usa Eye/Pencil/Trash2, pero Editar y Eliminar se renderizan con `Boton variante="linea"` / `variante="peligro"`, que se ven distinto a los botones-icono cuadrados con borde de preliquidaciones/cotizaciones (y Eliminar se ve como botón peligro relleno).

## Cambios

### 1. Cotizaciones: agregar acción «Copiar»

- Importar `Copy` de lucide-react y agregar un botón-icono con el mismo estilo de los existentes (h-8 w-8, borde, hover), orden de iconos igual al de preliquidaciones: **Vista previa, Copiar, Editar, Eliminar**.
- Nueva función `duplicar(c)`:
  - Lee los items de la cotización (incluida la jerarquía WBS: `padre_id`, `orden`, `tipo`).
  - Inserta una cotización nueva copiando los campos de cabecera (cliente, nombre, ubicación, validez, % GG, % utilidad, condiciones, condiciones de pago, aplica IGV…), con:
    - `codigo` nuevo generado con `generarCodigoCotizacion()`
    - `fecha_emision` = hoy
    - `estado` = "Borrador"
  - Inserta copia de todos los items reasignando `padre_id` a los nuevos ids (dos pasadas: primero raíces, luego hijos, para mantener la jerarquía WBS y el orden).
  - Al terminar: invalida las queries de cotizaciones/items y abre la copia en el editor (`setSeleccion(nuevoId)`), igual que hace preliquidaciones al duplicar.
- La acción Copiar está disponible para todas las cotizaciones (igual que preliquidaciones duplica cualquier preliquidación); Editar/Eliminar conservan su comportamiento actual.

### 2. Facturación Electrónica: mismos iconos/estilo que preliquidaciones

- En la columna de acciones del listado de comprobantes, renderizar Vista previa, Editar borrador y Eliminar borrador como botones-icono cuadrados con borde, idénticos a los de preliquidaciones/cotizaciones:
  - Eye 15 (hover azul), Pencil 14 (hover azul), Trash2 14 (hover rojo destructive).
  - Se elimina el uso de `Boton variante="peligro"` (relleno rojo) y `variante="linea"` para estas tres acciones.
- Se conservan los Tooltips existentes y la regla de que Editar/Eliminar solo aparecen en borradores.

## Verificación

- `bunx tsgo --noEmit` y revisar build-errors.log.
- Playwright: abrir el listado de cotizaciones y confirmar los cuatro iconos en orden Vista previa/Copiar/Editar/Eliminar; duplicar una cotización de prueba y confirmar que se abre la copia con código nuevo, fecha de hoy, estado Borrador y todos los items con su jerarquía; abrir Facturación Electrónica y confirmar los tres botones-icono con el nuevo estilo.

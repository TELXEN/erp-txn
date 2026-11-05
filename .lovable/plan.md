# Encabezado de la factura: limpieza, proyecto vinculado y mayúsculas

Aplica a facturas, boletas y notas, en el editor, la vista previa, la impresión y el PDF.

## Cambios

1. **Quitar títulos**: desaparecen los rótulos «CLIENTE» (o «DESTINATARIO» en guías) y «PROYECTO / REFERENCIA» de la banda de datos.
2. **«Registrado» pasa a «PROYECTO»**: esa fila deja de elegir un cliente registrado y pasa a ser la lista de proyectos (código · nombre). Al elegir un proyecto se llenan solos:
   - RUC, nombre, dirección, departamento, provincia y distrito del cliente del proyecto;
   - la orden de compra del proyecto, si tiene una.
   Los datos siguen editables a mano. La fila «Proyecto» repetida de la columna central se elimina.
3. **Orden de compra y Guía de remisión arriba**: en la columna central suben para quedar a la altura de la fila del RUC.
4. **Interlineado 1.15** en todo el encabezado (banda de datos del cliente, proyecto y fechas).
5. **Todo en MAYÚSCULAS** en el encabezado: etiquetas y valores (RUC, NOMBRE, DIRECCIÓN, DEPARTAMENTO, ORDEN DE COMPRA, EMISIÓN, etc.), tanto al editar como al imprimir y en el PDF.

## Detalles técnicos

- `HojaComprobante.tsx`: quitar `titulo` de los dos `Bloque`; reemplazar la `Linea "Registrado"` por el select de `form.proyecto_id` que, al cambiar, busca el proyecto (cliente vinculado + referencia comercial) y rellena `cliente_*` y `orden_compra`; `cliente_id` se toma del proyecto. Columna central arranca con O. de compra y Guía. `lineHeight: 1.15` y `textTransform: "uppercase"` en la banda (inputs incluidos).
- `comprobante-vista.tsx` y `ComprobantePdf.tsx`: quitar los dos títulos, subir orden de compra/guía, `lineHeight 1.15` y mayúsculas (`toUpperCase` en PDF).
- Se respeta la regla existente: la referencia comercial del proyecto se copia al seleccionar y se guarda en el comprobante.

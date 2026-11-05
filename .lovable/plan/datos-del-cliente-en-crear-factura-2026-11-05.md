# Datos del cliente en Crear factura

## Qué cambia
1. **Dirección**: al consultar el RUC/DNI, solo se escribe la dirección (calle, número, urbanización), sin el distrito, la provincia ni el departamento añadidos al final.
2. **Ciudad pasa a llamarse Departamento**, y se llena con el departamento que devuelve Decolecta.
3. En la misma línea se agregan **Provincia** y **Distrito**, que también se llenan desde Decolecta. Las tres casillas se pueden editar a mano.
4. La vista previa y el PDF de la factura muestran Departamento, Provincia y Distrito en lugar de Ciudad.
5. **Facturas antiguas**: lo que se guardó como "Ciudad" aparece como Departamento. No se pierde ningún dato.

## Detalles técnicos
- `decolecta.functions.ts`: `ResultadoDocumento` devuelve `direccion` limpia más `departamento`, `provincia` y `distrito` por separado.
- Migración: se agregan a `comprobantes_electronicos` las columnas `cliente_departamento`, `cliente_provincia` y `cliente_distrito` (text, default ''). Los valores de `cliente_ciudad` se copian a `cliente_departamento`, y `cliente_ciudad` se marca como DEPRECATED.
- `HojaComprobante.tsx`: una fila con tres casillas compactas (Departamento | Provincia | Distrito). Se llenan al consultar Decolecta.
- Se actualizan el esquema zod de `facturacion.functions.ts`, la carga y el guardado en `facturacion-electronica.tsx`, y `comprobante-vista.tsx` (vista y PDF).

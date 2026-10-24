# Reporte de pagos de cuentas por pagar (Tesorería)

## Qué verá el usuario
En Tesorería › Cuentas por pagar aparece un nuevo icono **"Reporte de pagos"** en la barra derecha.

1. Se marcan con casillas las deudas que se van a pagar: facturas de proveedores (costos directos y gastos generales) y obligaciones del personal (honorarios y planillas). Hay un botón "Seleccionar vencidas".
2. Se abre el reporte con estas columnas:

```text
N° | Beneficiario | RUC/DNI | Moneda | Monto a pagar | Concepto | Banco | N° cuenta / CCI
```

   - **Concepto** se arma solo (p. ej. "Factura E001-154 – TXN26-P001") y se puede editar antes de imprimir.
   - **Monto a pagar** viene con el saldo pendiente. Se puede bajar para hacer un pago parcial.
   - Al final hay totales separados en S/ y en $.
3. Hay tres salidas: hoja A4 para imprimir o guardar en PDF, Excel, y una opción para copiar.
4. El reporte es solo una lista para pagar: **no marca nada como pagado**. El pago se sigue registrando como hoy.

## Cuentas bancarias de los proveedores
Hoy los proveedores no tienen cuentas bancarias guardadas. El personal sí las tiene: banco, número de cuenta y CCI.
- En la ficha de Clientes/Proveedores se agrega una sección **"Cuentas bancarias"**: banco, moneda, número de cuenta, CCI y si es la cuenta principal. Se pueden guardar varias, por ejemplo una en S/ y otra en $.
- El reporte elige sola la cuenta principal en la moneda de la deuda. Si hay varias, se puede cambiar.
- Si falta la cuenta, la fila sale en rojo con el aviso **"Sin cuenta"** y un acceso directo para registrarla.
- La cuenta de detracciones del Banco de la Nación también se puede guardar aquí.

## Detalles técnicos
- Migración nueva: `terceros_cuentas_bancarias` (tercero_id, banco, moneda, numero_cuenta, cci, es_principal, es_detraccion, activo), con GRANT y RLS iguales a `terceros`.
- Origen de las filas: las mismas listas `cxpProv` y `cxpPer` de `tesoreria.tsx`. La lógica pura va en `src/lib/reporte-pagos.ts` (cuenta sugerida, concepto, totales por moneda) y lleva pruebas unitarias. Las pruebas son: la cuenta sugerida coincide con la moneda; una deuda sin cuenta queda marcada; los totales S/ y $ van separados.
- La vista A4 usa `documento-tema.ts` y la tipografía global. El Excel se genera con `exportar.ts`.
- La selección vive en el estado de la página; el reporte no guarda datos.
- Verificación en Playwright: seleccionar dos deudas, abrir el reporte y revisar columnas y totales. No se registra ningún pago.

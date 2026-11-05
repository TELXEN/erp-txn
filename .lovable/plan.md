# Cuentas bancarias a todo el ancho

Hoy el pie de la factura tiene dos columnas: a la izquierda Forma de pago + Cuentas bancarias, a la derecha Régimen tributario. Las cuentas quedan apretadas en media página.

## Nueva distribución (vista previa, editor y PDF iguales)

```text
+------------------------------+------------------------------+
| FORMA DE PAGO                | RÉGIMEN TRIBUTARIO           |
| Contado / cuotas             | Detracción 12% · SPOT        |
|                              | Detracción S/ ... | Neto ... |
+------------------------------+------------------------------+
| CUENTAS BANCARIAS (todo el ancho)                           |
| SOLES            | DÓLARES           | DETRACCIONES          |
| BCP              | BCP               | BANCO DE LA NACIÓN    |
| AHORRO EN SOLES  | AHORRO EN DÓLARES | CUENTA DE DETRACCIONES|
| N° ...           | N° ...            | N° ...                |
| CCI ...          | CCI ...           |                       |
+-------------------------------------------------------------+
```

1. Arriba, en una fila de dos columnas: Forma de pago (con cuotas) y Régimen tributario lado a lado, más bajos porque ya no llevan las cuentas.
2. Debajo, un recuadro de Cuentas bancarias a todo el ancho, con columnas Soles, Dólares y Detracciones; cada cuenta mantiene banco, tipo y moneda, N° y CCI en líneas separadas, mismo tamaño de letra actual.
3. Si no hay régimen (NO APLICA), Forma de pago ocupa la fila sola o el régimen muestra "NO APLICA" compacto.

## Detalles técnicos
- comprobante-vista.tsx: separar CuentasComprobante del card de Forma de pago a un bloque full-width bajo el grid 1fr 1fr.
- HojaComprobante.tsx: misma reorganización en el editor.
- ComprobantePdf.tsx: mover el View de cuentas fuera de s.details a una fila propia; grupos SOLES/DÓLARES/DETRACCIONES con flex:1.
- Verificar con Playwright la vista previa y el PDF descargado que nada desborde la hoja A4.

# Información del pago al contado

En editor, vista previa, impresión y PDF, cuando la forma de pago es **Contado** el recuadro muestra:

```text
Información del pago
Monto neto pendiente de pago     :   S/ 24,922.00
```

- Mismo formato que el bloque de crédito: título en negrita sin dos puntos, rótulo con los dos puntos en la misma vertical.
- Monto = total menos detracción/retención, con símbolo de moneda.
- Sin «Total de Cuotas» ni tabla de cuotas, y ya no aparece la palabra «Contado».
- Con Crédito se mantiene «Información del crédito» tal como está.

## Detalle técnico
- comprobante-vista.tsx, ComprobantePdf.tsx, HojaComprobante.tsx: la rama de Contado reemplaza el texto de la condición por el título y la fila del monto neto (netoComprobante / baseCuotas).
- Actualizar mem://design/comprobante-forma-pago.md.

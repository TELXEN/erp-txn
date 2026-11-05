# Información del crédito con el formato de la imagen

Cuando la forma de pago sea **Crédito**, el recuadro FORMA DE PAGO se reemplaza por este bloque (editor, vista previa, impresión y PDF):

```text
Información del crédito          :
Monto neto pendiente de pago     :   $ 9,576.53
Total de Cuotas                  :   1

Nº Cuota  Fec. Venc.   Monto | Nº Cuota  Fec. Venc.  Monto | Nº Cuota  Fec. Venc.  Monto
   1      28/03/2025  9,576.53
```

- Título en negrita; rótulos a la izquierda con los dos puntos alineados en la misma vertical.
- Monto neto = neto a pagar (total menos detracción/retención), con símbolo de la moneda.
- Total de cuotas = número de cuotas.
- Tabla de cuotas en tres grupos de columnas lado a lado; las cuotas se llenan en orden (1, 2, 3 en la primera fila, 4, 5, 6 en la siguiente…). Encabezados en negrita, fechas dd/mm/aaaa, montos alineados a la derecha.
- Con **Contado** se mantiene solo «FORMA DE PAGO … Contado» como hoy.
- En el editor, los botones para agregar/quitar cuotas y editar fecha/monto se conservan dentro de esta misma tabla.

## Detalle técnico
- Archivos: comprobante-vista.tsx, ComprobantePdf.tsx, HojaComprobante.tsx.
- Helper puro `gruposCuotas(cuotas, 3)` en src/lib/facturacion.ts con prueba; neto vía netoComprobante.
